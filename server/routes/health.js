import express from 'express';
import { getDatabaseStatus } from '../config/database.js';

const router = express.Router();

/**
 * Health-check endpoint for system status and database connectivity verification.
 * Safely exposes database operational state without leaking credentials.
 */
router.get('/', (req, res) => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    status: dbStatus.status === 'error' ? 'degraded' : 'healthy',
    service: 'AI Coding Assessment Platform API',
    uptime: Math.round(process.uptime() * 100) / 100,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
  });
});

export default router;
