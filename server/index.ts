// ============================================
// QR ATTENDANCE SYSTEM - SERVER ENTRY POINT
// Servidor Express + Socket.io
// ============================================

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { initializeSocketServer } from './socket-server';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import coursesRoutes from './routes/courses';
import reportsRoutes from './routes/reports';
import settingsRoutes from './routes/settings';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Socket.io
const io = initializeSocketServer(httpServer);

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║        QR ATTENDANCE SYSTEM - SERVER                 ║
╠══════════════════════════════════════════════════════╣
║  🚀 Server running on http://localhost:${PORT}          ║
║  🔌 Socket.io ready for connections                  ║
║  📡 API: http://localhost:${PORT}/api                   ║
╚══════════════════════════════════════════════════════╝
  `);
});

export { app, io };
