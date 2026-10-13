import express from 'express';

const router = express.Router();

/**
 * Health-check endpoint for system status verification
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'AI Coding Assessment Platform API',
    uptime: Math.round(process.uptime() * 100) / 100,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
