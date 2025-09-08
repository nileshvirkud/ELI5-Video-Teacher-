import { Router } from 'express';
import prisma from '../config/database';
import redis from '../config/redis';
import videoQueue from '../services/queue/videoQueue';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      queue: 'unknown'
    }
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.services.database = 'healthy';
  } catch (error) {
    healthCheck.services.database = 'unhealthy';
    healthCheck.message = 'Degraded';
  }

  // Check Redis connection
  try {
    await redis.ping();
    healthCheck.services.redis = 'healthy';
  } catch (error) {
    healthCheck.services.redis = 'unhealthy';
    healthCheck.message = 'Degraded';
  }

  // Check queue health
  try {
    const queueStats = await videoQueue.getQueueStats();
    healthCheck.services.queue = 'healthy';
    (healthCheck as any).queueStats = queueStats;
  } catch (error) {
    healthCheck.services.queue = 'unhealthy';
    healthCheck.message = 'Degraded';
  }

  const statusCode = healthCheck.message === 'OK' ? 200 : 503;
  
  res.status(statusCode).json({
    success: healthCheck.message === 'OK',
    data: healthCheck
  });
}));

// Detailed health check for monitoring
router.get('/detailed', asyncHandler(async (req, res) => {
  const detailedHealth = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: process.version,
    environment: process.env.NODE_ENV,
    services: {} as any
  };

  // Database health
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;
    
    const userCount = await prisma.user.count();
    const videoCount = await prisma.video.count();
    
    detailedHealth.services.database = {
      status: 'healthy',
      responseTime: `${duration}ms`,
      stats: {
        totalUsers: userCount,
        totalVideos: videoCount
      }
    };
  } catch (error) {
    detailedHealth.services.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Redis health
  try {
    const start = Date.now();
    await redis.ping();
    const duration = Date.now() - start;
    
    const info = await redis.info();
    const memoryInfo = info.split('\n')
      .filter(line => line.startsWith('used_memory_human:'))
      .map(line => line.split(':')[1]?.trim())[0];
    
    detailedHealth.services.redis = {
      status: 'healthy',
      responseTime: `${duration}ms`,
      memoryUsage: memoryInfo
    };
  } catch (error) {
    detailedHealth.services.redis = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Queue health
  try {
    const queueStats = await videoQueue.getQueueStats();
    detailedHealth.services.queue = {
      status: 'healthy',
      stats: queueStats
    };
  } catch (error) {
    detailedHealth.services.queue = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  const allHealthy = Object.values(detailedHealth.services)
    .every((service: any) => service.status === 'healthy');
  
  const statusCode = allHealthy ? 200 : 503;
  
  res.status(statusCode).json({
    success: allHealthy,
    data: detailedHealth
  });
}));

export default router;