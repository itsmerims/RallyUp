import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import notificationRouter from './routes/notifications.js';
import playerStatusRouter from './routes/playerStatus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(express.json());

// API routes
app.use('/api', notificationRouter);
app.use('/api', playerStatusRouter);

// On Vercel, static files are served by Vercel's edge network (see vercel.json rewrites)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const distPath = path.resolve(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Don't call app.listen() on Vercel — it runs as a serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`RallyUp server running on port ${PORT}`);
  });
}

export default app;
