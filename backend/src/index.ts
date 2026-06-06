import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './db/database';
import projectsRouter from './routes/projects';
import snapshotsRouter from './routes/snapshots';
import uploadRouter from './routes/upload';
import activitiesRouter from './routes/activities';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

// Initialize database
initDatabase();

// Routes
app.use('/api/projects', projectsRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/activities', activitiesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

export default app;
