import request from 'supertest';
import app from '../../src/index';
import { mockUsers, createTestUser } from '../fixtures/users';
import { mockVideos, createTestVideo } from '../fixtures/videos';

describe('Video Endpoints', () => {
  let freeUserToken: string;
  let premiumUserToken: string;
  let freeUserId: string;
  let premiumUserId: string;

  beforeEach(async () => {
    // Create test users
    const freeUser = await createTestUser(mockUsers.freeUser, global.prisma);
    const premiumUser = await createTestUser(mockUsers.premiumUser, global.prisma);
    
    freeUserId = freeUser.id;
    premiumUserId = premiumUser.id;

    // Login users to get tokens
    const freeUserLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: mockUsers.freeUser.email,
        password: mockUsers.freeUser.password
      });
    
    const premiumUserLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: mockUsers.premiumUser.email,
        password: mockUsers.premiumUser.password
      });

    freeUserToken = freeUserLogin.body.data.tokens.accessToken;
    premiumUserToken = premiumUserLogin.body.data.tokens.accessToken;
  });

  describe('POST /api/videos/generate', () => {
    it('should generate video for authenticated user', async () => {
      const videoRequest = {
        topic: 'How do plants grow?',
        tone: 'FUNNY'
      };

      const response = await request(app)
        .post('/api/videos/generate')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send(videoRequest)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.video.topic).toBe(videoRequest.topic);
      expect(response.body.data.video.tone).toBe(videoRequest.tone);
      expect(response.body.data.video.status).toBe('PENDING');
      expect(response.body.data.jobId).toBeDefined();
    });

    it('should generate video with custom tone', async () => {
      const videoRequest = {
        topic: 'Why is water wet?',
        tone: 'CUSTOM',
        customTone: 'Like a pirate explaining to kids'
      };

      const response = await request(app)
        .post('/api/videos/generate')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send(videoRequest)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.video.tone).toBe('CUSTOM');
    });

    it('should validate topic length', async () => {
      const videoRequest = {
        topic: 'Hi', // Too short
        tone: 'FUNNY'
      };

      const response = await request(app)
        .post('/api/videos/generate')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send(videoRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('should require custom tone description when tone is CUSTOM', async () => {
      const videoRequest = {
        topic: 'How do computers work?',
        tone: 'CUSTOM'
        // Missing customTone
      };

      const response = await request(app)
        .post('/api/videos/generate')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send(videoRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CUSTOM_TONE_REQUIRED');
    });

    it('should enforce rate limits for free users', async () => {
      const videoRequest = {
        topic: 'Test topic',
        tone: 'FUNNY'
      };

      // Create 3 videos in the last hour (free user limit)
      for (let i = 0; i < 3; i++) {
        await createTestVideo({
          topic: `Test topic ${i}`,
          tone: 'FUNNY',
          status: 'PENDING'
        }, freeUserId, global.prisma);
      }

      const response = await request(app)
        .post('/api/videos/generate')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send(videoRequest)
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should not enforce rate limits for premium users as strictly', async () => {
      const videoRequest = {
        topic: 'Premium test topic',
        tone: 'SERIOUS'
      };

      // Create 5 videos (under premium limit of 10)
      for (let i = 0; i < 5; i++) {
        await createTestVideo({
          topic: `Premium test topic ${i}`,
          tone: 'SERIOUS',
          status: 'PENDING'
        }, premiumUserId, global.prisma);
      }

      const response = await request(app)
        .post('/api/videos/generate')
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .send(videoRequest)
        .expect(202);

      expect(response.body.success).toBe(true);
    });

    it('should not generate video without authentication', async () => {
      const videoRequest = {
        topic: 'Unauthorized test',
        tone: 'FUNNY'
      };

      const response = await request(app)
        .post('/api/videos/generate')
        .send(videoRequest)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/videos', () => {
    beforeEach(async () => {
      // Create test videos
      await createTestVideo(mockVideos.completedVideo, freeUserId, global.prisma);
      await createTestVideo(mockVideos.processingVideo, freeUserId, global.prisma);
      await createTestVideo(mockVideos.pendingVideo, freeUserId, global.prisma);
    });

    it('should list user videos', async () => {
      const response = await request(app)
        .get('/api/videos')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.videos).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(3);
    });

    it('should filter videos by status', async () => {
      const response = await request(app)
        .get('/api/videos?status=COMPLETED')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.videos).toHaveLength(1);
      expect(response.body.data.videos[0].status).toBe('COMPLETED');
    });

    it('should filter videos by tone', async () => {
      const response = await request(app)
        .get('/api/videos?tone=POETIC')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.videos).toHaveLength(1);
      expect(response.body.data.videos[0].tone).toBe('POETIC');
    });

    it('should search videos by topic', async () => {
      const response = await request(app)
        .get('/api/videos?search=dinosaurs')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.videos).toHaveLength(1);
      expect(response.body.data.videos[0].topic.toLowerCase()).toContain('dinosaurs');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/videos?page=1&limit=2')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.videos).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.hasNext).toBe(true);
    });

    it('should not list videos without authentication', async () => {
      const response = await request(app)
        .get('/api/videos')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/videos/:videoId', () => {
    let testVideo: any;

    beforeEach(async () => {
      testVideo = await createTestVideo(mockVideos.completedVideo, freeUserId, global.prisma);
    });

    it('should get specific video details', async () => {
      const response = await request(app)
        .get(`/api/videos/${testVideo.id}`)
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.video.id).toBe(testVideo.id);
      expect(response.body.data.video.topic).toBe(testVideo.topic);
      expect(response.body.data.video.script).toBeDefined();
    });

    it('should not get video that does not exist', async () => {
      const response = await request(app)
        .get('/api/videos/nonexistent-id')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VIDEO_NOT_FOUND');
    });

    it('should not get another user\'s video', async () => {
      const response = await request(app)
        .get(`/api/videos/${testVideo.id}`)
        .set('Authorization', `Bearer ${premiumUserToken}`) // Different user
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VIDEO_NOT_FOUND');
    });
  });

  describe('DELETE /api/videos/:videoId', () => {
    let testVideo: any;

    beforeEach(async () => {
      testVideo = await createTestVideo(mockVideos.completedVideo, freeUserId, global.prisma);
    });

    it('should delete user\'s video', async () => {
      const response = await request(app)
        .delete(`/api/videos/${testVideo.id}`)
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Video deleted successfully');

      // Verify video is deleted
      const deletedVideo = await global.prisma.video.findUnique({
        where: { id: testVideo.id }
      });
      expect(deletedVideo).toBeNull();
    });

    it('should not delete another user\'s video', async () => {
      const response = await request(app)
        .delete(`/api/videos/${testVideo.id}`)
        .set('Authorization', `Bearer ${premiumUserToken}`) // Different user
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VIDEO_NOT_FOUND');
    });

    it('should not delete video that does not exist', async () => {
      const response = await request(app)
        .delete('/api/videos/nonexistent-id')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VIDEO_NOT_FOUND');
    });
  });

  describe('GET /api/videos/stats/overview', () => {
    beforeEach(async () => {
      await createTestVideo(mockVideos.completedVideo, freeUserId, global.prisma);
      await createTestVideo(mockVideos.processingVideo, freeUserId, global.prisma);
      await createTestVideo(mockVideos.pendingVideo, freeUserId, global.prisma);
    });

    it('should get user statistics', async () => {
      const response = await request(app)
        .get('/api/videos/stats/overview')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalVideos).toBe(3);
      expect(response.body.data.completedVideos).toBe(1);
      expect(response.body.data.totalDuration).toBe(120); // From completedVideo
      expect(response.body.data.statusBreakdown).toBeDefined();
    });

    it('should not get stats without authentication', async () => {
      const response = await request(app)
        .get('/api/videos/stats/overview')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});