import express, { type NextFunction, type Request, type Response } from 'express';
import cors, { type CorsOptions } from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import workspaceRouter from './routes/workspace.js';
import githubRouter from './routes/github.js';

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'https://creative-atlas.web.app')
  .split(',')
  .map((origin) => origin.trim());

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
};

// To test:
const app = express();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));
app.use(session({
  secret: 'keyboard cat', // TODO: Use a real secret
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', workspaceRouter);
app.use('/api/github', githubRouter);

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
