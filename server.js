/**
 * Node.js + Express backend entry point
 * Bridges Express API with Vite in development and static assets in production.
 * Initializes MongoDB connectivity via dedicated Mongoose configuration module.
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import healthRouter from './server/routes/health.js';
import authRouter from './server/routes/auth.js';
import problemsRouter from './server/routes/problems.js';
import { notFoundHandler, globalErrorHandler } from './server/middleware/errorHandler.js';
import { connectDatabase, disconnectDatabase } from './server/config/database.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database connectivity (non-blocking in development/prototype mode)
await connectDatabase({ exitOnFailure: false });

// Body parsing middleware
app.use(express.json());

// Request logger for API calls
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Authentication endpoints
app.use('/api/auth', authRouter);

// Problem endpoints
app.use('/api/problems', problemsRouter);

// Health-check endpoint
app.use('/api/health', healthRouter);

// Catch unhandled /api routes
app.all('/api/*', notFoundHandler);

// Centralized error handler
app.use(globalErrorHandler);

// Vite middleware in development or static asset serving in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Backend running at http://0.0.0.0:${PORT}`);
});

// Graceful shutdown listeners
const handleShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    await disconnectDatabase();
    console.log('[Server] Process terminated cleanly.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
