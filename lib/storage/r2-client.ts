/**
 * KofyOne - Media & Object Storage Client (Cloudflare R2)
 *
 * Provides an abstract storage interface for platform logos, resource images,
 * and user-uploaded media. In Phase 0, defines the storage contract and asset URL generator.
 */

export interface StorageAsset {
  key: string;
  bucket: string;
  publicUrl: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface IStorageClient {
  getPublicUrl(key: string): string;
  getUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; key: string }>;
}

export class CloudflareR2StorageClient implements IStorageClient {
  private publicBaseUrl: string;
  private bucketName: string;

  constructor() {
    this.publicBaseUrl =
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://media.kofyone.com';
    this.bucketName = process.env.R2_BUCKET_NAME || 'kofyone-media';
  }

  /**
   * Generates public CDN URL for a stored asset key.
   */
  getPublicUrl(key: string): string {
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    return `${this.publicBaseUrl}/${cleanKey}`;
  }

  /**
   * Pre-signed upload URL generation (placeholder for Phase 3 asset uploads).
   */
  async getUploadUrl(
    key: string,
    contentType: string
  ): Promise<{ uploadUrl: string; key: string }> {
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    // Architecture stub for Phase 3 S3-compatible pre-signed PUT URL
    return {
      uploadUrl: `${this.publicBaseUrl}/upload-stub/${cleanKey}?type=${encodeURIComponent(contentType)}`,
      key: cleanKey,
    };
  }

  getBucketName(): string {
    return this.bucketName;
  }
}

export const storageClient = new CloudflareR2StorageClient();
