import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock external services
jest.mock('../src/services/ai/contentGenerator');
jest.mock('../src/services/audio/voiceGenerator');
jest.mock('../src/services/video/videoGenerator');
jest.mock('../src/services/storage/s3Service');
jest.mock('../src/config/redis');

// Global test database setup
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/eli5_test'
    }
  }
});

beforeAll(async () => {
  // Reset database
  try {
    execSync('npx prisma migrate reset --force --skip-generate', {
      cwd: join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
    });
    
    execSync('npx prisma db push --skip-generate', {
      cwd: join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
    });
  } catch (error) {
    console.error('Database setup failed:', error);
  }
});

beforeEach(async () => {
  // Clean up database between tests
  const deleteUsers = prisma.user.deleteMany();
  const deleteVideos = prisma.video.deleteMany();
  const deleteJobs = prisma.generationJob.deleteMany();
  const deleteUsage = prisma.apiUsage.deleteMany();
  
  await prisma.$transaction([deleteUsage, deleteJobs, deleteVideos, deleteUsers]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Make prisma available globally for tests
global.prisma = prisma;