import { onRequest } from 'firebase-functions/v2/https';

const APP_ENGINE_API_BASE_URL = process.env.APP_ENGINE_API_BASE_URL ?? 'https://creative-atlas.uc.r.appspot.com';
const SHARE_PREVIEW_IMAGE_URL = process.env.SHARE_PREVIEW_IMAGE_URL ?? '/share-preview.png';
const BOT_USER_AGENT_PATTERN = /\b(bot|crawler|spider|slurp|facebookexternalhit|discordbot|slackbot|twitterbot|linkedinbot|embedly|pinterest|whatsapp|quora link preview)\b/i;

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const truncate = (value, maxLength) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isCrawlerRequest = (req) => {
  const userAgent = req.get('user-agent');
  if (!userAgent) {
    return false;
  }
  return BOT_USER_AGENT_PATTERN.test(userAgent);
};

const getForwardedValue = (req, header) => {
  const raw = req.get(header);
  if (!raw) {
    return null;
  }
  return raw.split(',')[0]?.trim() ?? null;
};

const resolveProtocol = (req) => getForwardedValue(req, 'x-forwarded-proto') ?? req.protocol ?? 'https';

const resolveHost = (req) => getForwardedValue(req, 'x-forwarded-host') ?? req.get('host') ?? 'localhost';

const resolveBaseUrl = (req) => `${resolveProtocol(req)}://${resolveHost(req)}`;

const resolveImageUrl = (req) => new URL(SHARE_PREVIEW_IMAGE_URL, resolveBaseUrl(req)).toString();

const resolveShareUrl = (req) => new URL(req.originalUrl ?? req.url ?? '/', resolveBaseUrl(req)).toString();

const buildNanoBananaImageUrl = (shareId) =>
  new URL(`/share/${encodeURIComponent(shareId)}/nano-banana.png`, APP_ENGINE_API_BASE_URL).toString();

const buildShareMeta = (payload, shareUrl, imageUrl) => {
  const projectTitle = normalizeWhitespace(payload.project?.title ?? 'Creative Atlas Project');
  const summary = normalizeWhitespace(payload.project?.summary ?? '');

  const artifactHighlights = Array.isArray(payload.artifacts)
    ? payload.artifacts
        .map((artifact) => normalizeWhitespace(artifact?.title ?? ''))
        .filter((title) => title.length > 0)
        .slice(0, 3)
    : [];

  const descriptionSegments = [];
  if (summary) {
    descriptionSegments.push(summary);
  }
  if (artifactHighlights.length > 0) {
    descriptionSegments.push(`Featured artifacts: ${artifactHighlights.join(' · ')}.`);
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

const renderShareDocument = (meta, shouldBootClient) => {
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

const toShareNotFoundMeta = (shareUrl, imageUrl) => ({
  title: 'Creative Atlas share not found',
  description: 'The shared project you are looking for could not be found.',
  shareUrl,
  imageUrl,
  robots: 'noindex, nofollow',
});

const toShareExpiredMeta = (shareUrl, imageUrl) => ({
  title: 'Creative Atlas share expired',
  description: 'This Creative Atlas share link has expired or is no longer available.',
  shareUrl,
  imageUrl,
  robots: 'noindex, nofollow',
});

const extractShareId = (req) => {
  const path = req.path ?? req.url ?? '';
  const match = path.match(/^\/share\/(.+)$/);
  if (!match) {
    return null;
  }
  return match[1];
};

const fetchSharedProjectPayload = async (shareId) => {
  const url = new URL(`/api/share/${encodeURIComponent(shareId)}`, APP_ENGINE_API_BASE_URL);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : await response.text();

  return { response, body };
};

export const shareMetadata = onRequest({ region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'GET') {
    res.set('Allow', 'GET').status(405).send('Method Not Allowed');
    return;
  }

  const shareUrl = resolveShareUrl(req);
  const imageUrl = resolveImageUrl(req);
  const crawlerRequest = isCrawlerRequest(req);
  const shareId = extractShareId(req);
  res.set('Vary', 'User-Agent');
  if (!shareId) {
    const document = renderShareDocument(toShareNotFoundMeta(shareUrl, imageUrl), !crawlerRequest);
    res
      .status(400)
      .set('Cache-Control', 'public, max-age=120')
      .type('html')
      .send(document);
    return;
  }

  try {
    const { response, body } = await fetchSharedProjectPayload(shareId);

    if (response.ok && body && typeof body === 'object') {
      const shareImageUrl = body?.project?.nanoBananaImage
        ? buildNanoBananaImageUrl(shareId)
        : imageUrl;
      const meta = buildShareMeta(body, shareUrl, shareImageUrl);
      const document = renderShareDocument(meta, !crawlerRequest);
      res.status(200).set('Cache-Control', 'public, max-age=300').type('html').send(document);
      return;
    }

    if (response.status === 404) {
      const meta = toShareNotFoundMeta(shareUrl, imageUrl);
      const document = renderShareDocument(meta, !crawlerRequest);
      res
        .status(404)
        .set('Cache-Control', 'public, max-age=120')
        .type('html')
        .send(document);
      return;
    }

    if (response.status === 410 || response.status === 422) {
      const meta = toShareExpiredMeta(shareUrl, imageUrl);
      const document = renderShareDocument(meta, !crawlerRequest);
      res
        .status(response.status)
        .set('Cache-Control', 'public, max-age=120')
        .type('html')
        .send(document);
      return;
    }

    console.error('Unexpected response from share payload lookup', {
      status: response.status,
      body,
    });
    res
      .status(502)
      .set('Cache-Control', 'public, max-age=60')
      .type('html')
      .send('<!DOCTYPE html><title>Share service unavailable</title>');
  } catch (error) {
    console.error('Failed to load share payload', error);
    res
      .status(502)
      .set('Cache-Control', 'public, max-age=60')
      .type('html')
      .send('<!DOCTYPE html><title>Share service unavailable</title>');
  }
});
