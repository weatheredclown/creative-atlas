type NanoBananaOverlayStyle = 'aurora' | 'sunburst' | 'prism';

interface NanoBananaArtModeConfig {
  label: string;
  description: string;
  gradientStartOffset: number;
  gradientEndOffset: number;
  hueShift: number;
  sparkMultiplier: number;
  overlay: NanoBananaOverlayStyle;
}

export const NANO_BANANA_ART_MODES = {
  aurora: {
    label: 'Aurora Drift',
    description: 'Cool cosmic gradients with flowing aurora streaks.',
    gradientStartOffset: 20,
    gradientEndOffset: 220,
    hueShift: 15,
    sparkMultiplier: 1,
    overlay: 'aurora',
  },
  sunrise: {
    label: 'Sunrise Bloom',
    description: 'Warm blooms, sunbursts, and atmospheric dust.',
    gradientStartOffset: -35,
    gradientEndOffset: 145,
    hueShift: -30,
    sparkMultiplier: 0.85,
    overlay: 'sunburst',
  },
  prismatic: {
    label: 'Prismatic Pulse',
    description: 'High-contrast prisms with neon grid energy.',
    gradientStartOffset: 60,
    gradientEndOffset: 300,
    hueShift: 60,
    sparkMultiplier: 1.2,
    overlay: 'prism',
  },
} satisfies Record<string, NanoBananaArtModeConfig>;

export type NanoBananaArtMode = keyof typeof NANO_BANANA_ART_MODES;

export interface NanoBananaGeneratorInput {
  title: string;
  summary?: string;
  tags?: readonly string[];
  mode?: NanoBananaArtMode;
  variant?: number;
}

const normalizeHue = (value: number): number => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const stringToSeed = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const wrapLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        break;
      }
    } else {
      current = next;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length === maxLines && words.length > 0 && words.join(' ') !== lines.join(' ')) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = `${last.slice(0, Math.max(0, last.length - 1)).trimEnd()}…`;
  }

  return lines;
};

const drawBanana = (
  ctx: CanvasRenderingContext2D,
  random: () => number,
  width: number,
  height: number,
  hue: number,
  sparkMultiplier = 1,
): void => {
  ctx.save();
  ctx.translate(width * (0.3 + random() * 0.4), height * (0.3 + random() * 0.4));
  ctx.rotate((random() - 0.5) * 0.6);
  ctx.scale(1.1 + random() * 0.2, 1 + random() * 0.15);
  const bodyHue = (hue + 45) % 360;
  const edgeHue = (hue + 25) % 360;

  ctx.beginPath();
  ctx.moveTo(-240, -80);
  ctx.quadraticCurveTo(-320, 120, 80, 160);
  ctx.quadraticCurveTo(220, 140, 280, -20);
  ctx.quadraticCurveTo(180, -150, -180, -120);
  ctx.closePath();
  ctx.fillStyle = `hsl(${bodyHue}, 78%, 62%)`;
  ctx.shadowColor = `hsla(${bodyHue}, 80%, 40%, 0.65)`;
  ctx.shadowBlur = 40;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 18;
  ctx.strokeStyle = `hsl(${edgeHue}, 70%, 40%)`;
  ctx.stroke();

  ctx.lineWidth = 6;
  ctx.strokeStyle = `hsl(${(hue + 90) % 360}, 60%, 55%)`;
  ctx.beginPath();
  ctx.moveTo(-200, -40);
  ctx.quadraticCurveTo(-100, 40, 40, 80);
  ctx.quadraticCurveTo(140, 100, 200, 10);
  ctx.stroke();
  ctx.restore();

  const sparkCount = Math.max(20, Math.round(30 * sparkMultiplier));
  for (let i = 0; i < sparkCount; i += 1) {
    ctx.save();
    ctx.translate(width * random(), height * random());
    ctx.rotate(random() * Math.PI * 2);
    const sparkleLength = 15 + random() * 30;
    ctx.strokeStyle = `hsla(${(hue + 180) % 360}, 85%, 70%, 0.6)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-sparkleLength / 2, 0);
    ctx.lineTo(sparkleLength / 2, 0);
    ctx.stroke();
    ctx.restore();
  }
};

const drawAuroraOverlay = (
  ctx: CanvasRenderingContext2D,
  random: () => number,
  width: number,
  height: number,
  hue: number,
): void => {
  for (let i = 0; i < 4; i += 1) {
    ctx.save();
    const streakWidth = width * (0.5 + random() * 0.4);
    const streakHeight = height * (0.1 + random() * 0.15);
    ctx.translate(width * random(), height * random() * 0.8);
    ctx.rotate((random() - 0.5) * 0.6);
    const gradient = ctx.createLinearGradient(0, 0, streakWidth, 0);
    gradient.addColorStop(0, `hsla(${normalizeHue(hue + 120)}, 80%, 70%, 0)`);
    gradient.addColorStop(0.5, `hsla(${normalizeHue(hue + 180)}, 70%, 75%, 0.25)`);
    gradient.addColorStop(1, `hsla(${normalizeHue(hue + 260)}, 65%, 78%, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(-streakWidth / 2, -streakHeight / 2, streakWidth, streakHeight);
    ctx.restore();
  }
};

const drawSunburstOverlay = (
  ctx: CanvasRenderingContext2D,
  random: () => number,
  width: number,
  height: number,
  hue: number,
): void => {
  const centerX = width * (0.2 + random() * 0.3);
  const centerY = height * (0.2 + random() * 0.2);
  const rayCount = 18;
  for (let i = 0; i < rayCount; i += 1) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((i / rayCount) * Math.PI * 2 + random() * 0.05);
    const rayLength = width * 0.8 * (0.5 + random() * 0.5);
    const rayWidth = 6 + random() * 10;
    const gradient = ctx.createLinearGradient(0, 0, rayLength, 0);
    gradient.addColorStop(0, `hsla(${normalizeHue(hue + 20)}, 90%, 70%, 0.6)`);
    gradient.addColorStop(1, 'hsla(0, 0%, 100%, 0)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = rayWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(rayLength, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  const dustCount = 40;
  ctx.fillStyle = `hsla(${normalizeHue(hue + 15)}, 70%, 65%, 0.2)`;
  for (let i = 0; i < dustCount; i += 1) {
    const radius = 5 + random() * 12;
    const x = width * random();
    const y = height * (0.2 + random() * 0.6);
    ctx.beginPath();
    ctx.ellipse(x, y, radius * (0.7 + random() * 0.6), radius, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawPrismOverlay = (
  ctx: CanvasRenderingContext2D,
  random: () => number,
  width: number,
  height: number,
  hue: number,
): void => {
  const gridSize = 80;
  ctx.save();
  ctx.strokeStyle = `hsla(${normalizeHue(hue + 200)}, 70%, 70%, 0.15)`;
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + gridSize * 0.4, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + gridSize * 0.4);
    ctx.stroke();
  }
  ctx.restore();

  const prismCount = 5;
  for (let i = 0; i < prismCount; i += 1) {
    ctx.save();
    const prismWidth = 200 + random() * 220;
    const prismHeight = 160 + random() * 120;
    ctx.translate(width * random(), height * random());
    ctx.rotate((random() - 0.5) * 0.5);
    const gradient = ctx.createLinearGradient(-prismWidth / 2, 0, prismWidth / 2, 0);
    gradient.addColorStop(0, `hsla(${normalizeHue(hue + 320)}, 85%, 60%, 0.25)`);
    gradient.addColorStop(0.5, `hsla(${normalizeHue(hue + 30)}, 85%, 65%, 0.2)`);
    gradient.addColorStop(1, `hsla(${normalizeHue(hue + 180)}, 85%, 62%, 0.25)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(-prismWidth / 2, -prismHeight / 2, prismWidth, prismHeight);
    ctx.restore();
  }
};

const drawModeOverlay = (
  ctx: CanvasRenderingContext2D,
  random: () => number,
  width: number,
  height: number,
  hue: number,
  mode: NanoBananaArtMode,
): void => {
  const overlay = NANO_BANANA_ART_MODES[mode].overlay;
  if (overlay === 'aurora') {
    drawAuroraOverlay(ctx, random, width, height, hue);
  } else if (overlay === 'sunburst') {
    drawSunburstOverlay(ctx, random, width, height, hue);
  } else if (overlay === 'prism') {
    drawPrismOverlay(ctx, random, width, height, hue);
  }
};

export const generateNanoBananaImage = (input: NanoBananaGeneratorInput): string => {
  if (typeof document === 'undefined') {
    throw new Error('Creative Atlas Generative AI previews require a browser environment.');
  }

  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 630;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create drawing context for Creative Atlas generative art.');
  }

  const mode = input.mode ?? 'aurora';
  const variantSeed = input.variant ?? 0;
  const seedSource = `${input.title}|${input.summary ?? ''}|${(input.tags ?? []).join(',')}|${mode}|${variantSeed}`;
  const random = mulberry32(stringToSeed(seedSource || 'creative-atlas-generative-ai'));
  const modeConfig = NANO_BANANA_ART_MODES[mode];
  const baseHue = normalizeHue(Math.floor(random() * 360) + (modeConfig.hueShift ?? 0));

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${normalizeHue(baseHue + modeConfig.gradientStartOffset)}, 65%, 16%)`);
  gradient.addColorStop(1, `hsl(${normalizeHue(baseHue + modeConfig.gradientEndOffset)}, 85%, 8%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = `hsla(${(baseHue + 150) % 360}, 80%, 80%, 0.08)`;
  const particleCount = Math.round(160 * (modeConfig.sparkMultiplier ?? 1));
  for (let i = 0; i < particleCount; i += 1) {
    const radius = random() * 3 + 0.5;
    const x = width * random();
    const y = height * random();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawModeOverlay(ctx, random, width, height, baseHue, mode);
  drawBanana(ctx, random, width, height, baseHue, modeConfig.sparkMultiplier);

  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = 'rgba(15, 23, 42, 0.6)';
  ctx.shadowBlur = 25;
  ctx.font = '600 56px "Space Grotesk", "Inter", "Segoe UI", sans-serif';
  const titleLines = wrapLines(ctx, input.title || 'Creative Atlas Project', width - 200, 2);
  titleLines.forEach((line, index) => {
    ctx.fillText(line, 80, 420 + index * 64);
  });

  ctx.shadowBlur = 15;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
  ctx.font = '400 28px "Inter", "Segoe UI", sans-serif';
  const summary = input.summary?.trim() || 'A new Creative Atlas generative spark is ready to share.';
  const summaryLines = wrapLines(ctx, summary, width - 200, 2);
  summaryLines.forEach((line, index) => {
    ctx.fillText(line, 80, 420 + titleLines.length * 64 + 20 + index * 40);
  });

  const tagLine = (input.tags ?? [])
    .filter((tag) => tag.trim().length > 0)
    .slice(0, 3)
    .map((tag) => `#${tag}`)
    .join('   ');
  if (tagLine) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
    ctx.font = '500 22px "Space Grotesk", "Inter", sans-serif';
    ctx.fillText(tagLine, 80, height - 80);
  }

  return canvas.toDataURL('image/png');
};
