import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../config/logger';

export interface VoiceSettings {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

export interface AudioGenerationResult {
  audioUrl: string;
  duration: number;
  fileSize: number;
  tempFilePath: string;
}

class VoiceGenerator {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  private readonly tempDir: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.tempDir = process.env.TEMP_UPLOAD_DIR || './temp';
    
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async generateSpeech(
    text: string, 
    voiceSettings?: Partial<VoiceSettings>
  ): Promise<AudioGenerationResult> {
    try {
      const settings: VoiceSettings = {
        voiceId: 'pNInz6obpgDQGcFmaJgB', // Child-friendly voice
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true,
        ...voiceSettings
      };

      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${settings.voiceId}`,
        {
          text: this.preprocessText(text),
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
            style: settings.style,
            use_speaker_boost: settings.useSpeakerBoost
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      const audioFileName = `audio_${uuidv4()}.mp3`;
      const tempFilePath = path.join(this.tempDir, audioFileName);
      
      fs.writeFileSync(tempFilePath, response.data);
      
      const stats = fs.statSync(tempFilePath);
      const duration = await this.getAudioDuration(tempFilePath);

      logger.info(`Generated speech for text of length ${text.length}`);
      
      return {
        audioUrl: '', // Will be set after S3 upload
        duration,
        fileSize: stats.size,
        tempFilePath
      };

    } catch (error) {
      logger.error('Error generating speech:', error);
      throw new Error(`Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSceneAudio(scenes: Array<{narration: string}>): Promise<AudioGenerationResult[]> {
    const audioPromises = scenes.map(scene => 
      this.generateSpeech(scene.narration)
    );

    try {
      const results = await Promise.all(audioPromises);
      logger.info(`Generated audio for ${scenes.length} scenes`);
      return results;
    } catch (error) {
      logger.error('Error generating scene audio:', error);
      throw error;
    }
  }

  async combineAudioFiles(audioPaths: string[]): Promise<string> {
    const ffmpeg = require('fluent-ffmpeg');
    const outputPath = path.join(this.tempDir, `combined_${uuidv4()}.mp3`);

    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      audioPaths.forEach(audioPath => {
        command.input(audioPath);
      });

      command
        .on('end', () => {
          logger.info('Audio files combined successfully');
          resolve(outputPath);
        })
        .on('error', (error: Error) => {
          logger.error('Error combining audio files:', error);
          reject(error);
        })
        .mergeToFile(outputPath);
    });
  }

  private preprocessText(text: string): string {
    // Add pauses and improve pronunciation for children
    return text
      .replace(/\./g, '. <break time="0.5s"/>')
      .replace(/,/g, ', <break time="0.2s"/>')
      .replace(/!/g, '! <break time="0.5s"/>')
      .replace(/\?/g, '? <break time="0.5s"/>')
      // Slow down numbers for better comprehension
      .replace(/\b\d+\b/g, (match) => `<prosody rate="slow">${match}</prosody>`)
      // Emphasize important words
      .replace(/\*([^*]+)\*/g, '<emphasis level="strong">$1</emphasis>');
  }

  private async getAudioDuration(filePath: string): Promise<number> {
    const ffprobe = require('fluent-ffmpeg').ffprobe;
    
    return new Promise((resolve, reject) => {
      ffprobe(filePath, (err: Error, metadata: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  async getAvailableVoices(): Promise<Array<{id: string, name: string, category: string}>> {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      // Filter for child-appropriate voices
      return response.data.voices
        .filter((voice: any) => voice.category === 'premade' || voice.labels?.includes('child-friendly'))
        .map((voice: any) => ({
          id: voice.voice_id,
          name: voice.name,
          category: voice.category
        }));
    } catch (error) {
      logger.error('Error fetching voices:', error);
      return [];
    }
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

export default new VoiceGenerator();