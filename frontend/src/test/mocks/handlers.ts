import { rest } from 'msw';

const API_URL = 'http://localhost:3000/api';

export const handlers = [
  // Auth endpoints
  rest.post(`${API_URL}/auth/register`, (req, res, ctx) => {
    const { email, password, firstName, lastName } = req.body as any;
    
    if (email === 'existing@test.com') {
      return res(
        ctx.status(409),
        ctx.json({
          success: false,
          error: {
            message: 'User already exists with this email',
            code: 'USER_EXISTS'
          }
        })
      );
    }

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          user: {
            id: 'user-123',
            email,
            firstName,
            lastName,
            subscriptionTier: 'FREE',
            isEmailVerified: true,
            createdAt: new Date().toISOString()
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token'
          }
        }
      })
    );
  }),

  rest.post(`${API_URL}/auth/login`, (req, res, ctx) => {
    const { email, password } = req.body as any;
    
    if (email === 'test@example.com' && password === 'Password123!') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              subscriptionTier: 'FREE',
              isEmailVerified: true
            },
            tokens: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token'
            }
          }
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      })
    );
  }),

  rest.get(`${API_URL}/auth/me`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer mock-access-token')) {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          error: {
            message: 'Authentication required'
          }
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            subscriptionTier: 'FREE',
            isEmailVerified: true,
            createdAt: new Date().toISOString(),
            _count: {
              videos: 5
            }
          }
        }
      })
    );
  }),

  rest.post(`${API_URL}/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Logged out successfully'
      })
    );
  }),

  // Video endpoints
  rest.post(`${API_URL}/videos/generate`, (req, res, ctx) => {
    const { topic, tone, customTone } = req.body as any;
    
    if (topic.length < 5) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: {
            message: 'Validation failed',
            details: [{ msg: 'Topic should be at least 5 characters long' }]
          }
        })
      );
    }

    return res(
      ctx.status(202),
      ctx.json({
        success: true,
        data: {
          video: {
            id: 'video-123',
            topic,
            tone,
            customTone,
            status: 'PENDING',
            createdAt: new Date().toISOString()
          },
          jobId: 'job-123'
        }
      })
    );
  }),

  rest.get(`${API_URL}/videos`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '20');
    const status = req.url.searchParams.get('status');
    const search = req.url.searchParams.get('search');

    let videos = [
      {
        id: 'video-1',
        topic: 'How do airplanes fly?',
        tone: 'FUNNY',
        status: 'COMPLETED',
        videoUrl: 'https://example.com/video1.mp4',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        duration: 120,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'video-2',
        topic: 'Why is the sky blue?',
        tone: 'SERIOUS',
        status: 'PROCESSING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'video-3',
        topic: 'What are dinosaurs?',
        tone: 'POETIC',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Apply filters
    if (status) {
      videos = videos.filter(v => v.status === status);
    }
    if (search) {
      videos = videos.filter(v => 
        v.topic.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = videos.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedVideos = videos.slice(startIndex, startIndex + limit);

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          videos: paginatedVideos,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      })
    );
  }),

  rest.get(`${API_URL}/videos/stats/overview`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          totalVideos: 10,
          completedVideos: 7,
          totalDuration: 840, // 14 minutes
          recentActivity: 3,
          statusBreakdown: {
            COMPLETED: 7,
            PROCESSING: 2,
            PENDING: 1
          }
        }
      })
    );
  }),

  rest.get(`${API_URL}/videos/:videoId`, (req, res, ctx) => {
    const { videoId } = req.params;
    
    if (videoId === 'nonexistent') {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: {
            message: 'Video not found',
            code: 'VIDEO_NOT_FOUND'
          }
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          video: {
            id: videoId,
            topic: 'How do airplanes fly?',
            tone: 'FUNNY',
            status: 'COMPLETED',
            videoUrl: 'https://example.com/video.mp4',
            audioUrl: 'https://example.com/audio.mp3',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            duration: 120,
            fileSize: 1024000,
            script: {
              title: 'How Airplanes Fly - The Fun Way!',
              totalDuration: 120,
              scenes: [
                {
                  id: 'scene_1',
                  narration: 'Imagine you\'re a bird flying high in the sky...',
                  visualDescription: 'A colorful cartoon airplane soaring through fluffy clouds',
                  duration: 60,
                  keywords: ['airplane', 'flying', 'wings']
                }
              ],
              tone: 'funny',
              educationalValue: 'Understanding basic principles of flight'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            generationJobs: []
          }
        }
      })
    );
  }),

  rest.delete(`${API_URL}/videos/:videoId`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Video deleted successfully'
      })
    );
  })
];