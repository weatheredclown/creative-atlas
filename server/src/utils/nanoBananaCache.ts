import { Storage } from '@google-cloud/storage';

const DEFAULT_BUCKET_NAME = 'creative-atlas-nano-bananas';

const envBucket = process.env.NANO_BANANA_CACHE_BUCKET;
const bucketName = envBucket === undefined ? DEFAULT_BUCKET_NAME : envBucket || undefined;

let storage: Storage | null = null;
if (bucketName) {
  storage = new Storage();
}

const sanitizeIdentifier = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);

const buildShareObjectName = (shareId: string): string =>
  `share/${sanitizeIdentifier(shareId)}/nano-banana.png`;

const buildProjectObjectName = (projectId: string, version: string): string =>
  `project/${sanitizeIdentifier(projectId)}/nano-banana-${sanitizeIdentifier(version)}.png`;

const buildPublicUrl = (objectName: string): string =>
  `https://storage.googleapis.com/${bucketName!}/${encodeURI(objectName)}`;

const appendCacheBustParam = (url: string): string => {
  const version = Date.now().toString(36);
  return `${url}?v=${version}`;
};

export const isNanoBananaCacheEnabled = (): boolean => Boolean(bucketName && storage);

export const isNanoBananaStorageEnabled = (): boolean => isNanoBananaCacheEnabled();

export const getCachedNanoBananaUrl = async (shareId: string): Promise<string | null> => {
  if (!isNanoBananaCacheEnabled()) {
    return null;
  }

  const objectName = buildShareObjectName(shareId);
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

  const objectName = buildShareObjectName(shareId);
  const bucket = storage!.bucket(bucketName!);
  const file = bucket.file(objectName);

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  return appendCacheBustParam(buildPublicUrl(objectName));
};

export const deleteCachedNanoBananaImage = async (shareId: string): Promise<void> => {
  if (!isNanoBananaCacheEnabled()) {
    return;
  }

  const objectName = buildShareObjectName(shareId);
  const bucket = storage!.bucket(bucketName!);
  const file = bucket.file(objectName);
  await file.delete({ ignoreNotFound: true });
};

export const persistNanoBananaImage = async (
  projectId: string,
  dataUrl: string,
): Promise<string | null> => {
  if (!isNanoBananaStorageEnabled()) {
    return null;
  }

  const [, encoded] = dataUrl.split(',', 2);
  if (!encoded) {
    return null;
  }

  const buffer = Buffer.from(encoded, 'base64');
  const version = Date.now().toString(36);
  const objectName = buildProjectObjectName(projectId, version);
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
