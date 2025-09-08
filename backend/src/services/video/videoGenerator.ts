import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../config/logger';
import { ScriptScene } from '../ai/contentGenerator';

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  fileSize: number;
  tempFilePath: string;
}

export interface VideoProcessingOptions {
  resolution: '480p' | '720p' | '1080p';
  fps: number;
  style: 'cartoon' | 'realistic' | 'animated' | 'educational';
}

class VideoGenerator {
  private readonly pikaApiKey: string;
  private readonly runwayApiKey: string;
  private readonly tempDir: string;

  constructor() {
    this.pikaApiKey = process.env.PIKA_API_KEY || '';
    this.runwayApiKey = process.env.RUNWAYML_API_KEY || '';
    this.tempDir = process.env.TEMP_UPLOAD_DIR || './temp';
    
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async generateSceneVideos(
    scenes: ScriptScene[], 
    options: Partial<VideoProcessingOptions> = {}
  ): Promise<VideoGenerationResult[]> {
    const processOptions: VideoProcessingOptions = {
      resolution: '720p',
      fps: 24,
      style: 'educational',
      ...options
    };

    const videoPromises = scenes.map((scene, index) => 
      this.generateSingleVideo(scene, index, processOptions)
    );

    try {
      const results = await Promise.all(videoPromises);
      logger.info(`Generated videos for ${scenes.length} scenes`);
      return results;
    } catch (error) {
      logger.error('Error generating scene videos:', error);
      throw error;
    }
  }

  private async generateSingleVideo(
    scene: ScriptScene, 
    sceneIndex: number, 
    options: VideoProcessingOptions
  ): Promise<VideoGenerationResult> {
    try {
      // Create child-safe visual prompt
      const visualPrompt = this.createChildSafePrompt(scene.visualDescription, options.style);
      
      // Try Pika Labs first, fallback to RunwayML
      let result: VideoGenerationResult;
      
      try {
        result = await this.generateWithPika(visualPrompt, scene.duration);
      } catch (pikaError) {
        logger.warn(`Pika failed for scene ${sceneIndex}, trying RunwayML:`, pikaError);
        result = await this.generateWithRunway(visualPrompt, scene.duration);
      }

      return result;
    } catch (error) {
      logger.error(`Error generating video for scene ${sceneIndex}:`, error);
      // Return a default/placeholder video
      return this.createPlaceholderVideo(scene);
    }
  }

  private async generateWithPika(prompt: string, duration: number): Promise<VideoGenerationResult> {
    try {
      // Pika Labs API integration
      const response = await axios.post('https://api.pika.art/generate', {
        prompt: prompt,
        duration: Math.min(duration, 30), // Pika max duration
        aspect_ratio: '16:9',
        motion: 'medium',
        guidance_scale: 12,
        negative_prompt: 'scary, dark, violent, inappropriate, adult content, weapons, blood'
      }, {
        headers: {
          'Authorization': `Bearer ${this.pikaApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const jobId = response.data.id;
      
      // Poll for completion
      const videoData = await this.pollPikaJob(jobId);
      const videoFileName = `pika_${uuidv4()}.mp4`;
      const tempFilePath = path.join(this.tempDir, videoFileName);
      
      // Download video
      await this.downloadVideo(videoData.video_url, tempFilePath);
      
      const stats = fs.statSync(tempFilePath);
      
      return {
        videoUrl: '', // Will be set after S3 upload
        thumbnailUrl: videoData.thumbnail_url,
        duration: videoData.duration,
        fileSize: stats.size,
        tempFilePath
      };
    } catch (error) {
      throw new Error(`Pika generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateWithRunway(prompt: string, duration: number): Promise<VideoGenerationResult> {
    try {
      // RunwayML API integration
      const response = await axios.post('https://api.runwayml.com/v1/generate', {
        prompt: prompt,
        duration: Math.min(duration, 16), // RunwayML max duration
        resolution: '1280x768',
        motion_bucket_id: 127,
        cond_aug: 0.02,
        negative_prompt: 'scary, dark, violent, inappropriate, adult content'
      }, {
        headers: {
          'Authorization': `Bearer ${this.runwayApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const taskId = response.data.task.id;
      
      // Poll for completion
      const videoData = await this.pollRunwayJob(taskId);
      const videoFileName = `runway_${uuidv4()}.mp4`;
      const tempFilePath = path.join(this.tempDir, videoFileName);
      
      await this.downloadVideo(videoData.output[0], tempFilePath);
      
      const stats = fs.statSync(tempFilePath);
      
      return {
        videoUrl: '',
        duration: duration,
        fileSize: stats.size,
        tempFilePath
      };
    } catch (error) {
      throw new Error(`RunwayML generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createChildSafePrompt(description: string, style: string): string {
    const stylePrefix = {
      cartoon: 'Colorful cartoon style, ',
      realistic: 'Child-friendly realistic style, ',
      animated: '3D animated style like Pixar, ',
      educational: 'Educational illustration style, '
    }[style] || 'Child-friendly style, ';

    const safetyPrefix = 'Safe for children, bright and cheerful, ';
    const qualityPrefix = 'High quality, well-lit, clear, ';
    
    return `${stylePrefix}${safetyPrefix}${qualityPrefix}${description}. No scary content, no dark themes, appropriate for 5-year-olds.`;
  }

  private async pollPikaJob(jobId: string, maxAttempts: number = 30): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(`https://api.pika.art/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${this.pikaApiKey}`
          }
        });

        if (response.data.status === 'completed') {
          return response.data;
        } else if (response.data.status === 'failed') {
          throw new Error('Pika job failed');
        }

        // Wait 10 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        if (attempt === maxAttempts - 1) throw error;
      }
    }
    throw new Error('Pika job polling timeout');
  }

  private async pollRunwayJob(taskId: string, maxAttempts: number = 30): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(`https://api.runwayml.com/v1/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${this.runwayApiKey}`
          }
        });

        if (response.data.status === 'SUCCEEDED') {
          return response.data;
        } else if (response.data.status === 'FAILED') {
          throw new Error('RunwayML job failed');
        }

        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        if (attempt === maxAttempts - 1) throw error;
      }
    }
    throw new Error('RunwayML job polling timeout');
  }

  private async downloadVideo(url: string, filePath: string): Promise<void> {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  private async createPlaceholderVideo(scene: ScriptScene): Promise<VideoGenerationResult> {
    const ffmpeg = require('fluent-ffmpeg');
    const outputPath = path.join(this.tempDir, `placeholder_${uuidv4()}.mp4`);
    
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input('color=c=skyblue:s=1280x720:d=' + scene.duration)
        .inputFormat('lavfi')
        .videoFilter([
          `drawtext=fontfile=/System/Library/Fonts/Arial.ttf:text='${scene.visualDescription}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2`
        ])
        .outputOptions('-pix_fmt yuv420p')
        .on('end', () => {
          const stats = fs.statSync(outputPath);
          resolve({
            videoUrl: '',
            duration: scene.duration,
            fileSize: stats.size,
            tempFilePath: outputPath
          });
        })
        .on('error', reject)
        .save(outputPath);
    });
  }

  async combineVideosWithAudio(
    videoPaths: string[], 
    audioPaths: string[], 
    scenes: ScriptScene[]
  ): Promise<string> {
    const ffmpeg = require('fluent-ffmpeg');
    const outputPath = path.join(this.tempDir, `final_video_${uuidv4()}.mp4`);
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      // Add all video inputs
      videoPaths.forEach(videoPath => {
        command.input(videoPath);
      });
      
      // Add all audio inputs
      audioPaths.forEach(audioPath => {
        command.input(audioPath);
      });
      
      // Create filter complex for combining videos and audio
      const filterComplex = this.createFilterComplex(videoPaths.length, audioPaths.length, scenes);
      
      command
        .complexFilter(filterComplex)
        .outputOptions('-c:v libx264')
        .outputOptions('-c:a aac')
        .outputOptions('-strict experimental')
        .on('end', () => {
          logger.info('Final video created successfully');
          resolve(outputPath);
        })
        .on('error', (error: Error) => {
          logger.error('Error creating final video:', error);
          reject(error);
        })
        .save(outputPath);
    });
  }

  private createFilterComplex(videoCount: number, audioCount: number, scenes: ScriptScene[]): string[] {
    const filters: string[] = [];
    let currentTime = 0;
    
    scenes.forEach((scene, index) => {
      if (index < videoCount && index < audioCount) {
        filters.push(
          `[${index}:v]scale=1280:720,setpts=PTS-STARTPTS+${currentTime}/TB[v${index}]`,
          `[${videoCount + index}:a]atrim=start=0:duration=${scene.duration},asetpts=PTS-STARTPTS+${currentTime}/TB[a${index}]`
        );
        currentTime += scene.duration;
      }
    });
    
    // Concatenate all video and audio streams
    const videoInputs = scenes.map((_, index) => `[v${index}]`).join('');
    const audioInputs = scenes.map((_, index) => `[a${index}]`).join('');
    
    filters.push(
      `${videoInputs}concat=n=${scenes.length}:v=1:a=0[outv]`,
      `${audioInputs}concat=n=${scenes.length}:v=0:a=1[outa]`
    );
    
    return filters;
  }

  cleanupTempFiles(filePaths: string[]): void {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Cleaned up temp file: ${filePath}`);
        }
      } catch (error) {
        logger.error(`Error cleaning up file ${filePath}:`, error);
      }
    });
  }
}

export default new VideoGenerator();