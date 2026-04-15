import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRouter         from './routes/auth.js';
import postsRouter        from './routes/posts.js';
import trendsRouter       from './routes/trends.js';
import aiRouter           from './routes/ai.js';
import scheduleRouter     from './routes/schedule.js';
import teamRouter         from './routes/team.js';
import competitorsRouter  from './routes/competitors.js';

import { scheduleTrendSync, startTrendWorker } from './jobs/trendSync.js';
import { startSchedulerWorker }                from './jobs/postScheduler.js';

const app = express();

app.use(helmet());
app.use(morgan('dev'));

// ✅ FIXED CORS HERE
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://diedra-polyzoarial-erlene.ngrok-free.dev'
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date() });
});

app.use('/api/auth',         authRouter);
app.use('/api/posts',        postsRouter);
app.use('/api/trends',       trendsRouter);
app.use('/api/ai',           aiRouter);
app.use('/api/schedule',     scheduleRouter);
app.use('/api/team',         teamRouter);
app.use('/api/competitors',  competitorsRouter);

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled:', err?.message);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`SocialIQ backend running on http://localhost:${PORT}`);

  try {
    startTrendWorker();
    startSchedulerWorker();
    await scheduleTrendSync();
  } catch (err) {
    console.warn('Workers not started:', err.message);
  }
});