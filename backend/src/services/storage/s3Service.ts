import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../config/logger';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
}

class S3Service {
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-west-2'
    });

    this.s3 = new AWS.S3();
    this.bucket = process.env.AWS_S3_BUCKET || 'eli5-video-storage';
  }

  async uploadVideo(filePath: string, userId: string, videoId: string): Promise<UploadResult> {
    const fileExtension = path.extname(filePath);
    const key = `videos/${userId}/${videoId}/video_${uuidv4()}${fileExtension}`;
    
    return this.uploadFile(filePath, key, 'video/mp4');
  }

  async uploadAudio(filePath: string, userId: string, videoId: string): Promise<UploadResult> {
    const fileExtension = path.extname(filePath);
    const key = `audio/${userId}/${videoId}/audio_${uuidv4()}${fileExtension}`;
    
    return this.uploadFile(filePath, key, 'audio/mpeg');
  }

  async uploadThumbnail(filePath: string, userId: string, videoId: string): Promise<UploadResult> {
    const fileExtension = path.extname(filePath);
    const key = `thumbnails/${userId}/${videoId}/thumb_${uuidv4()}${fileExtension}`;
    
    return this.uploadFile(filePath, key, 'image/jpeg');
  }

  private async uploadFile(filePath: string, key: string, contentType: string): Promise<UploadResult> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);

      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'file-size': stats.size.toString()
        }
      };

      // Set appropriate cache and access policies
      if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
        uploadParams.CacheControl = 'public, max-age=31536000'; // 1 year
      } else if (contentType.startsWith('image/')) {
        uploadParams.CacheControl = 'public, max-age=2592000'; // 30 days
      }

      const result = await this.s3.upload(uploadParams).promise();

      logger.info(`Successfully uploaded file to S3: ${key}`);

      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        size: stats.size
      };

    } catch (error) {
      logger.error(`Error uploading file to S3: ${key}`, error);
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key
      }).promise();

      logger.info(`Successfully deleted file from S3: ${key}`);
    } catch (error) {
      logger.error(`Error deleting file from S3: ${key}`, error);
      throw new Error(`S3 delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteUserFiles(userId: string): Promise<void> {
    try {
      // List all objects for the user
      const listParams = {
        Bucket: this.bucket,
        Prefix: `videos/${userId}/`
      };

      const listedObjects = await this.s3.listObjectsV2(listParams).promise();

      if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        return;
      }

      // Delete all objects
      const deleteParams = {
        Bucket: this.bucket,
        Delete: {
          Objects: listedObjects.Contents.map(obj => ({ Key: obj.Key! }))
        }
      };

      await this.s3.deleteObjects(deleteParams).promise();

      logger.info(`Successfully deleted all files for user: ${userId}`);
    } catch (error) {
      logger.error(`Error deleting user files: ${userId}`, error);
      throw error;
    }
  }

  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const url = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn
      });

      return url;
    } catch (error) {
      logger.error(`Error generating presigned URL for: ${key}`, error);
      throw new Error(`Presigned URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const result = await this.s3.headObject({
        Bucket: this.bucket,
        Key: key
      }).promise();

      return result;
    } catch (error) {
      logger.error(`Error getting file metadata: ${key}`, error);
      throw error;
    }
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.s3.copyObject({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey
      }).promise();

      logger.info(`Successfully copied file from ${sourceKey} to ${destinationKey}`);
    } catch (error) {
      logger.error(`Error copying file from ${sourceKey} to ${destinationKey}`, error);
      throw error;
    }
  }

  async createMultipartUpload(key: string, contentType: string): Promise<string> {
    try {
      const result = await this.s3.createMultipartUpload({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ServerSideEncryption: 'AES256'
      }).promise();

      return result.UploadId!;
    } catch (error) {
      logger.error(`Error creating multipart upload for: ${key}`, error);
      throw error;
    }
  }

  async uploadPart(
    key: string, 
    uploadId: string, 
    partNumber: number, 
    body: Buffer
  ): Promise<AWS.S3.UploadPartOutput> {
    try {
      const result = await this.s3.uploadPart({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body
      }).promise();

      return result;
    } catch (error) {
      logger.error(`Error uploading part ${partNumber} for: ${key}`, error);
      throw error;
    }
  }

  async completeMultipartUpload(
    key: string, 
    uploadId: string, 
    parts: Array<{ ETag: string; PartNumber: number }>
  ): Promise<AWS.S3.CompleteMultipartUploadOutput> {
    try {
      const result = await this.s3.completeMultipartUpload({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts }
      }).promise();

      logger.info(`Successfully completed multipart upload: ${key}`);
      return result;
    } catch (error) {
      logger.error(`Error completing multipart upload for: ${key}`, error);
      throw error;
    }
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    try {
      await this.s3.abortMultipartUpload({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId
      }).promise();

      logger.info(`Aborted multipart upload: ${key}`);
    } catch (error) {
      logger.error(`Error aborting multipart upload for: ${key}`, error);
      throw error;
    }
  }
}

export default new S3Service();