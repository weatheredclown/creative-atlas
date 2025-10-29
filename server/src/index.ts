import express from 'express';
import cors, { type CorsOptions } from 'cors';
import morgan from 'morgan';
import workspaceRouter from './routes/workspace.js';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? [];

const corsOptions: CorsOptions = {
  origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const app = express();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', workspaceRouter);

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
app.listen(port, () => {
  console.log(`Creative Atlas API listening on port ${port}`);
});
