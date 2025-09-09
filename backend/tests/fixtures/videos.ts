import { Tone, VideoStatus } from '@prisma/client';

export const mockVideos = {
  pendingVideo: {
    topic: 'How do airplanes fly?',
    tone: Tone.FUNNY,
    status: VideoStatus.PENDING
  },
  processingVideo: {
    topic: 'Why is the sky blue?',
    tone: Tone.SERIOUS,
    status: VideoStatus.PROCESSING
  },
  completedVideo: {
    topic: 'What are dinosaurs?',
    tone: Tone.POETIC,
    status: VideoStatus.COMPLETED,
    videoUrl: 'https://example.com/video.mp4',
    audioUrl: 'https://example.com/audio.mp3',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    duration: 120,
    fileSize: 1024000,
    script: JSON.stringify({
      title: 'Dinosaurs: The Amazing Ancient Animals',
      totalDuration: 120,
      scenes: [
        {
          id: 'scene_1',
          narration: 'Long, long ago, before your grandparents were even born...',
          visualDescription: 'A colorful prehistoric landscape with friendly dinosaurs',
          duration: 30,
          keywords: ['dinosaurs', 'prehistoric', 'ancient']
        }
      ],
      tone: 'poetic',
      educationalValue: 'Learn about prehistoric life and evolution'
    })
  },
  customToneVideo: {
    topic: 'How do plants grow?',
    tone: Tone.CUSTOM,
    customTone: 'Like a friendly robot teacher',
    status: VideoStatus.PENDING
  }
};

export const createTestVideo = async (videoData: any, userId: string, prisma: any) => {
  return await prisma.video.create({
    data: {
      userId,
      topic: videoData.topic,
      tone: videoData.tone,
      customTone: videoData.customTone || null,
      status: videoData.status,
      videoUrl: videoData.videoUrl || null,
      audioUrl: videoData.audioUrl || null,
      thumbnailUrl: videoData.thumbnailUrl || null,
      duration: videoData.duration || null,
      fileSize: videoData.fileSize || null,
      script: videoData.script || null
    }
  });
};