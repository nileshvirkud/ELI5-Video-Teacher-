import Bull from 'bull';
import redis from '../../config/redis';
import logger from '../../config/logger';
import prisma from '../../config/database';
import contentGenerator from '../ai/contentGenerator';
import voiceGenerator from '../audio/voiceGenerator';
import videoGenerator from '../video/videoGenerator';
import s3Service from '../storage/s3Service';
import { ProcessingStage, JobStatus, VideoStatus } from '@prisma/client';

export interface VideoJobData {
  videoId: string;
  userId: string;
  topic: string;
  tone: string;
  customTone?: string;
}

export interface JobProgress {
  stage: ProcessingStage;
  progress: number;
  message?: string;
}

class VideoQueue {
  private queue: Bull.Queue<VideoJobData>;

  constructor() {
    this.queue = new Bull<VideoJobData>('video-generation', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupEventHandlers();
    this.processJobs();
  }

  async addVideoGenerationJob(data: VideoJobData): Promise<Bull.Job<VideoJobData>> {
    try {
      const job = await this.queue.add('generate-video', data, {
        priority: 1,
        delay: 0
      });

      logger.info(`Added video generation job ${job.id} for user ${data.userId}`);
      return job;
    } catch (error) {
      logger.error('Error adding video generation job:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.queue.on('completed', async (job) => {
      logger.info(`Job ${job.id} completed successfully`);
      await this.updateJobStatus(job.data.videoId, JobStatus.COMPLETED);
      await this.updateVideoStatus(job.data.videoId, VideoStatus.COMPLETED);
      
      // Emit completion event via Socket.IO
      const io = global.io;
      if (io) {
        io.to(`user-${job.data.userId}`).emit('video-completed', {
          videoId: job.data.videoId,
          status: 'completed'
        });
      }
    });

    this.queue.on('failed', async (job, err) => {
      logger.error(`Job ${job.id} failed:`, err);
      await this.updateJobStatus(job.data.videoId, JobStatus.FAILED, [err.message]);
      await this.updateVideoStatus(job.data.videoId, VideoStatus.FAILED);
      
      // Emit failure event via Socket.IO
      const io = global.io;
      if (io) {
        io.to(`user-${job.data.userId}`).emit('video-failed', {
          videoId: job.data.videoId,
          status: 'failed',
          error: err.message
        });
      }
    });

    this.queue.on('progress', async (job, progress) => {
      const progressData = progress as JobProgress;
      await this.updateJobProgress(job.data.videoId, progressData.stage, progressData.progress);
      
      // Emit progress event via Socket.IO
      const io = global.io;
      if (io) {
        io.to(`user-${job.data.userId}`).emit('video-progress', {
          videoId: job.data.videoId,
          stage: progressData.stage,
          progress: progressData.progress,
          message: progressData.message
        });
      }
    });

    this.queue.on('stalled', async (job) => {
      logger.warn(`Job ${job.id} stalled`);
    });
  }

  private processJobs(): void {
    this.queue.process('generate-video', 2, async (job) => {
      const { videoId, userId, topic, tone, customTone } = job.data;
      
      try {
        await this.updateJobStatus(videoId, JobStatus.IN_PROGRESS);
        await this.updateVideoStatus(videoId, VideoStatus.PROCESSING);

        // Stage 1: Generate Script
        await job.progress({ stage: ProcessingStage.SCRIPT_GENERATION, progress: 10, message: 'Generating educational script...' });
        const script = await contentGenerator.generateELI5Script(topic, tone, customTone);
        
        await prisma.video.update({
          where: { id: videoId },
          data: { script: JSON.stringify(script) }
        });

        // Stage 2: Generate Audio
        await job.progress({ stage: ProcessingStage.VOICE_SYNTHESIS, progress: 30, message: 'Creating voice narration...' });
        const audioResults = await voiceGenerator.generateSceneAudio(script.scenes);
        
        // Stage 3: Generate Video Scenes
        await job.progress({ stage: ProcessingStage.VIDEO_GENERATION, progress: 50, message: 'Generating video scenes...' });
        const videoResults = await videoGenerator.generateSceneVideos(script.scenes);
        
        // Stage 4: Combine and Process
        await job.progress({ stage: ProcessingStage.VIDEO_PROCESSING, progress: 70, message: 'Combining video and audio...' });
        const finalVideoPath = await videoGenerator.combineVideosWithAudio(
          videoResults.map(v => v.tempFilePath),
          audioResults.map(a => a.tempFilePath),
          script.scenes
        );

        // Stage 5: Upload to S3
        await job.progress({ stage: ProcessingStage.FINALIZATION, progress: 85, message: 'Uploading final video...' });
        const videoUpload = await s3Service.uploadVideo(finalVideoPath, userId, videoId);
        
        // Upload audio separately for potential reuse
        const combinedAudioPath = await voiceGenerator.combineAudioFiles(
          audioResults.map(a => a.tempFilePath)
        );
        const audioUpload = await s3Service.uploadAudio(combinedAudioPath, userId, videoId);

        // Generate and upload thumbnail
        const thumbnailPath = await this.generateThumbnail(finalVideoPath);
        const thumbnailUpload = await s3Service.uploadThumbnail(thumbnailPath, userId, videoId);

        // Update video record with final URLs
        await prisma.video.update({
          where: { id: videoId },
          data: {
            videoUrl: videoUpload.url,
            audioUrl: audioUpload.url,
            thumbnailUrl: thumbnailUpload.url,
            duration: script.totalDuration,
            fileSize: videoUpload.size,
            metadata: {
              script,
              processing: {
                completedAt: new Date().toISOString(),
                totalProcessingTime: Date.now() - job.timestamp,
                filesGenerated: {
                  video: videoUpload.key,
                  audio: audioUpload.key,
                  thumbnail: thumbnailUpload.key
                }
              }
            }
          }
        });

        // Cleanup temporary files
        const tempFiles = [
          finalVideoPath,
          combinedAudioPath,
          thumbnailPath,
          ...audioResults.map(a => a.tempFilePath),
          ...videoResults.map(v => v.tempFilePath)
        ];
        
        voiceGenerator.cleanupTempFiles(tempFiles);
        videoGenerator.cleanupTempFiles(tempFiles);

        await job.progress({ stage: ProcessingStage.FINALIZATION, progress: 100, message: 'Video generation completed!' });
        
        return { success: true, videoUrl: videoUpload.url };
        
      } catch (error) {
        logger.error(`Error processing video job ${videoId}:`, error);
        throw error;
      }
    });
  }

  private async generateThumbnail(videoPath: string): Promise<string> {
    const ffmpeg = require('fluent-ffmpeg');
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    
    const thumbnailPath = path.join(process.env.TEMP_UPLOAD_DIR || './temp', `thumb_${uuidv4()}.jpg`);
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['10%'],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '1280x720'
        })
        .on('end', () => resolve(thumbnailPath))
        .on('error', reject);
    });
  }

  private async updateJobStatus(
    videoId: string, 
    status: JobStatus, 
    errorLogs: string[] = []
  ): Promise<void> {
    try {
      await prisma.generationJob.updateMany({
        where: { videoId },
        data: {
          status,
          errorLogs,
          completedAt: status === JobStatus.COMPLETED || status === JobStatus.FAILED 
            ? new Date() 
            : undefined
        }
      });
    } catch (error) {
      logger.error(`Error updating job status for video ${videoId}:`, error);
    }
  }

  private async updateVideoStatus(videoId: string, status: VideoStatus): Promise<void> {
    try {
      await prisma.video.update({
        where: { id: videoId },
        data: { status }
      });
    } catch (error) {
      logger.error(`Error updating video status for ${videoId}:`, error);
    }
  }

  private async updateJobProgress(
    videoId: string, 
    stage: ProcessingStage, 
    progress: number
  ): Promise<void> {
    try {
      await prisma.generationJob.updateMany({
        where: { videoId },
        data: { stage, progress }
      });
    } catch (error) {
      logger.error(`Error updating job progress for video ${videoId}:`, error);
    }
  }

  async getJobStatus(videoId: string) {
    return await prisma.generationJob.findFirst({
      where: { videoId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async cancelJob(videoId: string): Promise<void> {
    try {
      const jobs = await this.queue.getJobs(['waiting', 'active']);
      const job = jobs.find(j => j.data.videoId === videoId);
      
      if (job) {
        await job.remove();
        await this.updateJobStatus(videoId, JobStatus.CANCELLED);
        await this.updateVideoStatus(videoId, VideoStatus.CANCELLED);
        
        logger.info(`Cancelled job for video ${videoId}`);
      }
    } catch (error) {
      logger.error(`Error cancelling job for video ${videoId}:`, error);
      throw error;
    }
  }

  async getQueueStats() {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();
    
    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }

  async retryFailedJobs(): Promise<void> {
    try {
      const failedJobs = await this.queue.getFailed();
      const retryPromises = failedJobs.map(job => job.retry());
      await Promise.all(retryPromises);
      
      logger.info(`Retried ${failedJobs.length} failed jobs`);
    } catch (error) {
      logger.error('Error retrying failed jobs:', error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    await this.queue.pause();
    logger.info('Video queue paused');
  }

  async resume(): Promise<void> {
    await this.queue.resume();
    logger.info('Video queue resumed');
  }

  getQueue(): Bull.Queue<VideoJobData> {
    return this.queue;
  }
}

export default new VideoQueue();