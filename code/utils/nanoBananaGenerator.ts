export interface NanoBananaGeneratorInput {
  title: string;
  summary?: string;
  tags?: readonly string[];
}

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

  const sparkCount = 30;
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

export const generateNanoBananaImage = (input: NanoBananaGeneratorInput): string => {
  if (typeof document === 'undefined') {
    throw new Error('Nano banana generator requires a browser environment.');
  }

  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 630;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create drawing context for nano banana art.');
  }

  const seedSource = `${input.title}|${input.summary ?? ''}|${(input.tags ?? []).join(',')}`;
  const random = mulberry32(stringToSeed(seedSource || 'nano-banana'));
  const baseHue = Math.floor(random() * 360);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${(baseHue + 20) % 360}, 65%, 16%)`);
  gradient.addColorStop(1, `hsl(${(baseHue + 240) % 360}, 85%, 8%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = `hsla(${(baseHue + 150) % 360}, 80%, 80%, 0.08)`;
  for (let i = 0; i < 160; i += 1) {
    const radius = random() * 3 + 0.5;
    const x = width * random();
    const y = height * random();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBanana(ctx, random, width, height, baseHue);

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
  const summary = input.summary?.trim() || 'A new nano banana spark is ready to share.';
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
