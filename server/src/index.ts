import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import workspaceRouter from './routes/workspace.js';

const app = express();

app.use(cors());
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
