import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import prisma from '../config/database';
import logger from '../config/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import videoQueue from '../services/queue/videoQueue';
import { Tone, VideoStatus, ProcessingStage } from '@prisma/client';

const router = Router();

// Generate video
router.post('/generate', authenticate, [
  body('topic').isLength({ min: 5, max: 500 }).trim(),
  body('tone').isIn(['FUNNY', 'SERIOUS', 'POETIC', 'CUSTOM']),
  body('customTone').optional().isLength({ max: 200 }).trim()
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }

  const { topic, tone, customTone } = req.body;
  const userId = req.user!.id;

  // Check user's rate limits
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  const recentVideos = await prisma.video.count({
    where: {
      userId,
      createdAt: {
        gte: oneHourAgo
      }
    }
  });

  // Rate limits based on subscription tier
  const rateLimits = {
    FREE: 3,
    PREMIUM: 10,
    UNLIMITED: 100
  };

  const userLimit = rateLimits[req.user!.subscriptionTier as keyof typeof rateLimits] || 3;

  if (recentVideos >= userLimit) {
    return res.status(429).json({
      success: false,
      error: {
        message: `Rate limit exceeded. ${req.user!.subscriptionTier} users can generate ${userLimit} videos per hour.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 3600
      }
    });
  }

  // Validate custom tone if provided
  if (tone === 'CUSTOM' && (!customTone || customTone.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Custom tone description required when tone is set to CUSTOM',
        code: 'CUSTOM_TONE_REQUIRED'
      }
    });
  }

  // Create video record
  const video = await prisma.video.create({
    data: {
      userId,
      topic,
      tone: tone as Tone,
      customTone: tone === 'CUSTOM' ? customTone : null,
      status: VideoStatus.PENDING
    }
  });

  // Create generation job record
  const generationJob = await prisma.generationJob.create({
    data: {
      userId,
      videoId: video.id,
      stage: ProcessingStage.SCRIPT_GENERATION,
      startedAt: new Date()
    }
  });

  // Add to queue
  await videoQueue.addVideoGenerationJob({
    videoId: video.id,
    userId,
    topic,
    tone,
    customTone: tone === 'CUSTOM' ? customTone : undefined
  });

  logger.info(`Video generation started for user ${userId}, topic: ${topic}`);

  res.status(202).json({
    success: true,
    data: {
      video: {
        id: video.id,
        topic: video.topic,
        tone: video.tone,
        status: video.status,
        createdAt: video.createdAt
      },
      jobId: generationJob.id
    }
  });
}));

// Get video generation status
router.get('/status/:videoId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { videoId } = req.params;
  const userId = req.user!.id;

  const video = await prisma.video.findFirst({
    where: {
      id: videoId,
      userId
    },
    include: {
      generationJobs: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!video) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Video not found',
        code: 'VIDEO_NOT_FOUND'
      }
    });
  }

  const job = video.generationJobs[0];

  res.json({
    success: true,
    data: {
      video: {
        id: video.id,
        status: video.status,
        topic: video.topic,
        tone: video.tone,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt
      },
      job: job ? {
        id: job.id,
        status: job.status,
        stage: job.stage,
        progress: job.progress,
        errorLogs: job.errorLogs,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      } : null
    }
  });
}));

// List user's videos
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('status').optional().isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  query('tone').optional().isIn(['FUNNY', 'SERIOUS', 'POETIC', 'CUSTOM']),
  query('search').optional().isLength({ max: 100 }).trim()
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as VideoStatus | undefined;
  const tone = req.query.tone as Tone | undefined;
  const search = req.query.search as string;
  const userId = req.user!.id;

  const skip = (page - 1) * limit;

  const where: any = { userId };

  if (status) where.status = status;
  if (tone) where.tone = tone;
  if (search) {
    where.topic = {
      contains: search,
      mode: 'insensitive'
    };
  }

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        topic: true,
        tone: true,
        status: true,
        videoUrl: true,
        audioUrl: true,
        thumbnailUrl: true,
        duration: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.video.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  });
}));

// Get specific video details
router.get('/:videoId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { videoId } = req.params;
  const userId = req.user!.id;

  const video = await prisma.video.findFirst({
    where: {
      id: videoId,
      userId
    },
    include: {
      generationJobs: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  if (!video) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Video not found',
        code: 'VIDEO_NOT_FOUND'
      }
    });
  }

  // Parse script if available
  let parsedScript = null;
  if (video.script) {
    try {
      parsedScript = JSON.parse(video.script);
    } catch (error) {
      logger.warn(`Failed to parse script for video ${videoId}:`, error);
    }
  }

  res.json({
    success: true,
    data: {
      video: {
        ...video,
        script: parsedScript,
        generationJobs: video.generationJobs.map(job => ({
          id: job.id,
          status: job.status,
          stage: job.stage,
          progress: job.progress,
          errorLogs: job.errorLogs,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          createdAt: job.createdAt
        }))
      }
    }
  });
}));

// Delete video
router.delete('/:videoId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { videoId } = req.params;
  const userId = req.user!.id;

  const video = await prisma.video.findFirst({
    where: {
      id: videoId,
      userId
    }
  });

  if (!video) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Video not found',
        code: 'VIDEO_NOT_FOUND'
      }
    });
  }

  // Cancel any running jobs
  try {
    await videoQueue.cancelJob(videoId);
  } catch (error) {
    logger.warn(`Could not cancel job for video ${videoId}:`, error);
  }

  // TODO: Delete files from S3
  // if (video.videoUrl) await s3Service.deleteFile(getKeyFromUrl(video.videoUrl));
  // if (video.audioUrl) await s3Service.deleteFile(getKeyFromUrl(video.audioUrl));
  // if (video.thumbnailUrl) await s3Service.deleteFile(getKeyFromUrl(video.thumbnailUrl));

  // Delete from database
  await prisma.video.delete({
    where: { id: videoId }
  });

  logger.info(`Video ${videoId} deleted by user ${userId}`);

  res.json({
    success: true,
    message: 'Video deleted successfully'
  });
}));

// Cancel video generation
router.post('/:videoId/cancel', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { videoId } = req.params;
  const userId = req.user!.id;

  const video = await prisma.video.findFirst({
    where: {
      id: videoId,
      userId
    }
  });

  if (!video) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Video not found',
        code: 'VIDEO_NOT_FOUND'
      }
    });
  }

  if (video.status === VideoStatus.COMPLETED) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Cannot cancel completed video',
        code: 'CANNOT_CANCEL_COMPLETED'
      }
    });
  }

  if (video.status === VideoStatus.CANCELLED) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Video already cancelled',
        code: 'ALREADY_CANCELLED'
      }
    });
  }

  await videoQueue.cancelJob(videoId);

  logger.info(`Video generation cancelled for ${videoId} by user ${userId}`);

  res.json({
    success: true,
    message: 'Video generation cancelled successfully'
  });
}));

// Get user statistics
router.get('/stats/overview', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const stats = await prisma.video.groupBy({
    by: ['status'],
    where: { userId },
    _count: { status: true }
  });

  const totalVideos = await prisma.video.count({
    where: { userId }
  });

  const completedVideos = await prisma.video.count({
    where: {
      userId,
      status: VideoStatus.COMPLETED
    }
  });

  // Calculate total duration of completed videos
  const durationResult = await prisma.video.aggregate({
    where: {
      userId,
      status: VideoStatus.COMPLETED,
      duration: { not: null }
    },
    _sum: { duration: true }
  });

  const totalDuration = durationResult._sum.duration || 0;

  // Get recent activity (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentActivity = await prisma.video.count({
    where: {
      userId,
      createdAt: { gte: sevenDaysAgo }
    }
  });

  res.json({
    success: true,
    data: {
      totalVideos,
      completedVideos,
      totalDuration,
      recentActivity,
      statusBreakdown: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>)
    }
  });
}));

export default router;