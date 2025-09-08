export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier: 'FREE' | 'PREMIUM' | 'UNLIMITED';
  isEmailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface Video {
  id: string;
  topic: string;
  tone: 'FUNNY' | 'SERIOUS' | 'POETIC' | 'CUSTOM';
  customTone?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  videoUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  script?: ELI5Script;
  createdAt: string;
  updatedAt: string;
}

export interface ELI5Script {
  title: string;
  totalDuration: number;
  scenes: ScriptScene[];
  tone: string;
  educationalValue: string;
}

export interface ScriptScene {
  id: string;
  narration: string;
  visualDescription: string;
  duration: number;
  keywords: string[];
}

export interface GenerationJob {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'RETRYING';
  stage: 'SCRIPT_GENERATION' | 'VOICE_SYNTHESIS' | 'VIDEO_GENERATION' | 'VIDEO_PROCESSING' | 'FINALIZATION';
  progress: number;
  errorLogs: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface VideoGenerationRequest {
  topic: string;
  tone: 'FUNNY' | 'SERIOUS' | 'POETIC' | 'CUSTOM';
  customTone?: string;
}

export interface VideoGenerationResponse {
  video: {
    id: string;
    topic: string;
    tone: string;
    status: string;
    createdAt: string;
  };
  jobId: string;
}

export interface VideoProgress {
  videoId: string;
  stage: GenerationJob['stage'];
  progress: number;
  message?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface VideoListResponse {
  videos: Video[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserStats {
  totalVideos: number;
  completedVideos: number;
  totalDuration: number;
  recentActivity: number;
  statusBreakdown: Record<string, number>;
}