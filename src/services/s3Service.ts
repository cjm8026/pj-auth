/**
 * S3 Service - Profile Image Upload
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// 환경변수에서 credentials를 명시적으로 설정
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // credentials가 없으면 기본 provider chain 사용
});

const S3_BUCKET = process.env.S3_BUCKET || 'knowledge-base-test-6575574';

export class S3Service {
  /**
   * Upload profile image to S3
   */
  async uploadProfileImage(
    userId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string
  ): Promise<string> {
    const extension = originalName.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const key = `${userId}/profile_image/profile_${timestamp}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    // Return the S3 URL
    const imageUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
    console.log(`[S3Service] Profile image uploaded: ${imageUrl}`);
    
    return imageUrl;
  }

  /**
   * Delete profile image from S3
   */
  async deleteProfileImage(imageUrl: string): Promise<void> {
    try {
      // Extract key from URL
      const urlParts = imageUrl.split('.s3.amazonaws.com/');
      if (urlParts.length < 2) return;
      
      const key = urlParts[1];

      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      await s3Client.send(command);
      console.log(`[S3Service] Profile image deleted: ${key}`);
    } catch (error) {
      console.error('[S3Service] Error deleting image:', error);
    }
  }
}

let s3ServiceInstance: S3Service | null = null;

export function getS3Service(): S3Service {
  if (!s3ServiceInstance) {
    s3ServiceInstance = new S3Service();
  }
  return s3ServiceInstance;
}
