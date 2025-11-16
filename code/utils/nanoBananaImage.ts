const PNG_DATA_URL_PATTERN = /^data:image\/png;base64,/i;
const MAX_NANO_BANANA_IMAGE_LENGTH = 1_200_000;
const MIN_DIMENSION = 512;
const SCALE_STEP = 0.85;
const MAX_SCALE_ITERATIONS = 8;

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode Creative Atlas generative art preview.'));
    image.src = src;
  });

const shrinkDimension = (base: number, scale: number, minValue: number): number => {
  const scaled = Math.max(1, Math.floor(base * scale));
  const effectiveMin = base >= minValue ? minValue : base;
  return Math.min(base, Math.max(effectiveMin, scaled));
};

export interface ClampNanoBananaImageResult {
  image: string;
  wasClamped: boolean;
}

export const clampNanoBananaImage = async (
  dataUrl: string,
  options: { maxLength?: number; minDimension?: number } = {},
): Promise<ClampNanoBananaImageResult> => {
  const maxLength = options.maxLength ?? MAX_NANO_BANANA_IMAGE_LENGTH;
  const minDimension = options.minDimension ?? MIN_DIMENSION;

  if (!PNG_DATA_URL_PATTERN.test(dataUrl) || dataUrl.length <= maxLength) {
    return { image: dataUrl, wasClamped: false };
  }

  if (typeof document === 'undefined') {
    throw new Error('Canvas APIs are not available in this environment.');
  }

  const image = await loadImageElement(dataUrl);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;

  if (!naturalWidth || !naturalHeight) {
    throw new Error('Creative Atlas generative art preview has invalid dimensions.');
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas rendering is not supported in this browser.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const effectiveMinWidth = Math.min(minDimension, naturalWidth);
  const effectiveMinHeight = Math.min(minDimension, naturalHeight);
  const ratio = Math.sqrt(maxLength / dataUrl.length);
  const initialScale = Number.isFinite(ratio) && ratio > 0 ? Math.min(ratio, 0.95) : 0.75;

  let targetWidth = shrinkDimension(naturalWidth, initialScale, effectiveMinWidth);
  let targetHeight = shrinkDimension(naturalHeight, initialScale, effectiveMinHeight);

  let resized = dataUrl;
  let iterations = 0;
  let wasClamped = false;

  while (iterations < MAX_SCALE_ITERATIONS) {
    canvas.width = Math.max(1, Math.round(targetWidth));
    canvas.height = Math.max(1, Math.round(targetHeight));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    resized = canvas.toDataURL('image/png');
    wasClamped = true;

    if (resized.length <= maxLength) {
      return { image: resized, wasClamped };
    }

    const nextWidth = shrinkDimension(canvas.width, SCALE_STEP, effectiveMinWidth);
    const nextHeight = shrinkDimension(canvas.height, SCALE_STEP, effectiveMinHeight);

    if (nextWidth === canvas.width && nextHeight === canvas.height) {
      break;
    }

    targetWidth = nextWidth;
    targetHeight = nextHeight;
    iterations += 1;
  }

  if (resized.length > maxLength) {
    throw new Error('Compressed Creative Atlas generative art preview is still too large.');
  }

  return { image: resized, wasClamped };
};

