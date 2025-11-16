import { Storage } from '@google-cloud/storage';

const DEFAULT_BUCKET_NAME = 'creative-atlas-nano-bananas';

const envBucket = process.env.NANO_BANANA_CACHE_BUCKET;
const bucketName = envBucket === undefined ? DEFAULT_BUCKET_NAME : envBucket || undefined;

let storage: Storage | null = null;
if (bucketName) {
  storage = new Storage();
}

const sanitizeShareId = (shareId: string): string =>
  shareId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);

const buildObjectName = (shareId: string): string =>
  `share/${sanitizeShareId(shareId)}/nano-banana.png`;

const buildPublicUrl = (objectName: string): string =>
  `https://storage.googleapis.com/${bucketName!}/${encodeURI(objectName)}`;

export const isNanoBananaCacheEnabled = (): boolean => Boolean(bucketName && storage);

export const getCachedNanoBananaUrl = async (shareId: string): Promise<string | null> => {
  if (!isNanoBananaCacheEnabled()) {
    return null;
  }

  const objectName = buildObjectName(shareId);
  const bucket = storage!.bucket(bucketName!);
  const file = bucket.file(objectName);
  const [exists] = await file.exists();
  if (!exists) {
    return null;
  }

  return buildPublicUrl(objectName);
};

export const cacheNanoBananaImage = async (
  shareId: string,
  buffer: Buffer,
): Promise<string | null> => {
  if (!isNanoBananaCacheEnabled()) {
    return null;
  }

  const objectName = buildObjectName(shareId);
  const bucket = storage!.bucket(bucketName!);
  const file = bucket.file(objectName);

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  return buildPublicUrl(objectName);
};

export const deleteCachedNanoBananaImage = async (shareId: string): Promise<void> => {
  if (!isNanoBananaCacheEnabled()) {
    return;
  }

  const objectName = buildObjectName(shareId);
  const bucket = storage!.bucket(bucketName!);
  const file = bucket.file(objectName);
  await file.delete({ ignoreNotFound: true });
};
