import express, { type NextFunction, type Request, type Response } from 'express';
import cors, { type CorsOptions } from 'cors';
import morgan from 'morgan';
import workspaceRouter from './routes/workspace.js';

const defaultAllowedOrigins = ['https://creative-atlas.web.app'];

const rawAllowedOrigins = process.env.ALLOWED_ORIGINS ?? '';
const parsedAllowedOrigins = rawAllowedOrigins
  .split(/[\s,]+/)
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAllOrigins = parsedAllowedOrigins.includes('*');

// UPDATED LOGIC:
// 1. If 'allowAllOrigins' is true, use '*'.
// 2. Else, if 'parsedAllowedOrigins' is empty (env var was not set), use 'defaultAllowedOrigins'.
// 3. Otherwise, use the 'parsedAllowedOrigins' list from the env var.
const originSetting: CorsOptions['origin'] = allowAllOrigins
  ? '*'
  : parsedAllowedOrigins.length === 0
  ? defaultAllowedOrigins
  : parsedAllowedOrigins;

const corsOptions: CorsOptions = {
  origin: originSetting,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// To test:
console.log('Using CORS Origin:', originSetting);
const app = express();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', workspaceRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error in API request', error);
  if (res.headersSent) {
    return;
  }
  const message = error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({ error: 'Internal server error', details: message });
});

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
app.listen(port, () => {
  console.log(`Creative Atlas API listening on port ${port}`);
});
