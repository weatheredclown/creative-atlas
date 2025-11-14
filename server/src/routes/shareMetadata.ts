import { Router } from 'express';
import type { Request, Response } from 'express';
import { ComplianceError } from '../compliance/enforcement.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  loadSharedProjectPayload,
  ShareLookupError,
  type SharedProjectPayload,
} from './workspace.js';

const router = Router();

const BOT_USER_AGENT_PATTERN = /\b(bot|crawler|spider|slurp|facebookexternalhit|discordbot|slackbot|twitterbot|linkedinbot|embedly|pinterest|whatsapp|quora link preview)\b/i;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const isCrawlerRequest = (req: Request): boolean => {
  const userAgent = req.get('user-agent');
  if (!userAgent) {
    return false;
  }
  return BOT_USER_AGENT_PATTERN.test(userAgent);
};

interface SharePageMeta {
  title: string;
  description: string;
  shareUrl: string;
  imageUrl: string;
  robots?: string;
}

const buildShareMeta = (
  payload: SharedProjectPayload,
  shareUrl: string,
  imageUrl: string,
): SharePageMeta => {
  const projectTitle = normalizeWhitespace(payload.project.title || 'Creative Atlas Project');
  const summary = normalizeWhitespace(payload.project.summary || '');
  const artifactHighlights = payload.artifacts
    .map((artifact) => normalizeWhitespace(artifact.title || ''))
    .filter((title) => title.length > 0)
    .slice(0, 3);

  const descriptionSegments: string[] = [];
  if (summary) {
    descriptionSegments.push(summary);
  }
  if (artifactHighlights.length > 0) {
    const list = artifactHighlights.join(' · ');
    descriptionSegments.push(`Featured artifacts: ${list}.`);
  }
  if (descriptionSegments.length === 0) {
    descriptionSegments.push('Explore a Creative Atlas world shared by its creator.');
  }

  const description = truncate(descriptionSegments.join(' '), 220);

  return {
    title: `${projectTitle} — Shared in Creative Atlas`,
    description,
    shareUrl,
    imageUrl,
  };
};

const renderShareDocument = (meta: SharePageMeta, shouldBootClient: boolean): string => {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const shareUrl = escapeHtml(meta.shareUrl);
  const imageUrl = escapeHtml(meta.imageUrl);
  const robots = meta.robots ? `<meta name="robots" content="${escapeHtml(meta.robots)}" />` : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${shareUrl}" />
    ${robots}
    <meta property="og:site_name" content="Creative Atlas" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${shareUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="theme-color" content="#0f172a" />
    <style>
      body {
        margin: 0;
        padding: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at top, #0f172a, #020617);
        color: #e2e8f0;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        text-align: center;
      }
      .container {
        max-width: 640px;
        padding: 2.5rem 1.5rem;
      }
      h1 {
        font-size: clamp(1.75rem, 2.5vw + 1rem, 2.75rem);
        margin-bottom: 1rem;
      }
      p {
        font-size: 1.1rem;
        line-height: 1.6;
        margin-bottom: 1.5rem;
      }
      .cta {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border-radius: 999px;
        background: linear-gradient(135deg, #38bdf8, #818cf8);
        color: #0f172a;
        font-weight: 600;
        text-decoration: none;
        box-shadow: 0 12px 30px rgba(56, 189, 248, 0.25);
      }
      .cta:hover {
        transform: translateY(-1px);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${title}</h1>
      <p>${description}</p>
      <a class="cta" href="${shareUrl}">Open this Creative Atlas project</a>
    </div>
    ${shouldBootClient ? `
    <script type="module">
      (async () => {
        try {
          const response = await fetch('/index.html', { credentials: 'include' });
          if (!response.ok) {
            return;
          }
          const shell = await response.text();
          const doc = new DOMParser().parseFromString(shell, 'text/html');
          const scripts = doc.querySelectorAll('script[type="module"]');
          const links = doc.querySelectorAll('link[rel="stylesheet"],link[rel="modulepreload"],link[rel="preload"]');
          links.forEach((link) => document.head.appendChild(link.cloneNode(true)));
          const root = document.createElement('div');
          root.id = 'root';
          document.body.innerHTML = '';
          document.body.appendChild(root);
          scripts.forEach((script) => {
            const clone = document.createElement('script');
            clone.type = 'module';
            const src = script.getAttribute('src');
            if (src) {
              clone.src = src;
            } else {
              clone.textContent = script.textContent ?? '';
            }
            document.body.appendChild(clone);
          });
        } catch (error) {
          console.error('Failed to bootstrap Creative Atlas', error);
        }
      })();
    </script>
    ` : ''}
    <noscript>Creative Atlas requires JavaScript to load shared projects.</noscript>
  </body>
</html>`;
};

const resolveImageUrl = (req: Request): string => {
  const base = `${req.protocol}://${req.get('host') ?? 'localhost'}`;
  const imagePath = process.env.SHARE_PREVIEW_IMAGE_URL ?? '/share-preview.png';
  return new URL(imagePath, base).toString();
};

const resolveShareUrl = (req: Request): string => {
  const base = `${req.protocol}://${req.get('host') ?? 'localhost'}`;
  return new URL(req.originalUrl || req.url, base).toString();
};

router.get(
  '/share/:shareId',
  asyncHandler(async (req: Request, res: Response) => {
    const shareUrl = resolveShareUrl(req);
    const imageUrl = resolveImageUrl(req);
    const crawlerRequest = isCrawlerRequest(req);

    try {
      const payload = await loadSharedProjectPayload(req.params.shareId);
      const meta = buildShareMeta(payload, shareUrl, imageUrl);
      const document = renderShareDocument(meta, !crawlerRequest);
      res.set('Cache-Control', 'public, max-age=300');
      res.type('html').send(document);
    } catch (error) {
      if (error instanceof ComplianceError) {
        const meta = {
          title: 'Creative Atlas share expired',
          description: 'This Creative Atlas share link has expired or is no longer available.',
          shareUrl,
          imageUrl,
          robots: 'noindex, nofollow',
        } satisfies SharePageMeta;
        const document = renderShareDocument(meta, !crawlerRequest);
        res
          .status(error.violation === 'retention' ? 410 : 422)
          .set('Cache-Control', 'public, max-age=120')
          .type('html')
          .send(document);
        return;
      }

      if (error instanceof ShareLookupError) {
        const meta = {
          title: 'Creative Atlas share not found',
          description: 'The shared project you are looking for could not be found.',
          shareUrl,
          imageUrl,
          robots: 'noindex, nofollow',
        } satisfies SharePageMeta;
        const document = renderShareDocument(meta, !crawlerRequest);
        res
          .status(error.status)
          .set('Cache-Control', 'public, max-age=120')
          .type('html')
          .send(document);
        return;
      }

      throw error;
    }
  }),
);

export default router;
