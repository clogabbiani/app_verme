import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import cardsRouter from './routes/cards.js';
import collectionRouter from './routes/collection.js';
import wishlistRouter from './routes/wishlists.js';
import tradesRouter from './routes/trades.js';
import usersRouter from './routes/users.js';
import mapRouter from './routes/map.js';
import agentsRouter from './routes/agents.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' })); // larger limit for base64 images

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use('/api/cards', cardsRouter);
app.use('/api/collection', collectionRouter);
app.use('/api/wishlists', wishlistRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/users', usersRouter);
app.use('/api/map', mapRouter);
app.use('/api/agents', agentsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Listen only when running locally (not on Vercel serverless)
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`TCG Collector backend running on port ${PORT}`));
}

export default app;
