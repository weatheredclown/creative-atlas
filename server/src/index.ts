import { createServer } from 'node:http';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors, { type CorsOptions } from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import workspaceRouter from './routes/workspace.js';
import githubRouter from './routes/github.js';
import aiRouter from './routes/ai.js';
import historyRouter from './routes/history.js';
import agentRouter from './routes/agent.js';
import {
  CollaborationGateway,
  CollaborationWebSocketServer,
  InMemoryAdapter,
} from './collaboration/index.js';

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'https://creative-atlas.web.app')
  .split(',')
  .map((origin) => origin.trim());

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production environments.');
  }

  console.warn(
    'SESSION_SECRET is not set; using an insecure fallback secret for development.',
  );
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};

// To test:
const app = express();

const collaborationGateway = new CollaborationGateway<Record<string, unknown>>({
  adapter: new InMemoryAdapter<Record<string, unknown>>({ initialState: {} }),
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

// Trust the first proxy layer (e.g., Google App Engine)
app.set('trust proxy', 1);

app.use(session({
  secret: sessionSecret ?? 'development-insecure-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  res.send('Creative Atlas API is running.');
});

app.use('/api/github', githubRouter);
app.use('/api/ai', aiRouter);
app.use('/api/history', historyRouter);
app.use('/api/agent', agentRouter);
app.use('/api', workspaceRouter);

app.locals.collaborationGateway = collaborationGateway;

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error in API request', error);
  if (res.headersSent) {
    return;
  }
  const message = error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({ error: 'Internal server error', details: message });
});

const httpServer = createServer(app);

new CollaborationWebSocketServer<Record<string, unknown>>({
  server: httpServer,
  gateway: collaborationGateway,
});

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
httpServer.listen(port, () => {
  console.log(`Creative Atlas API (HTTP + WebSocket) listening on port ${port}`);
});
