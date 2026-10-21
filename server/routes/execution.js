/**
 * Code Execution REST API Endpoints
 * Exposes endpoints for executing student submissions via remote sandboxes
 * and inspecting provider configuration and supported languages.
 */

import express from 'express';
import {
  submitCodeExecution,
  getExecutionServiceConfig,
} from '../services/execution/index.js';

const router = express.Router();

/**
 * GET /api/execution/config
 * Retrieves safe metadata on supported languages, resource bounds, and active judge provider.
 */
router.get('/config', (req, res) => {
  const config = getExecutionServiceConfig();
  res.status(200).json({
    status: 'success',
    config,
  });
});

/**
 * POST /api/execution/run
 * Submits source code to the isolated execution engine.
 * Validates request schema and delegates strictly to the configured remote sandbox.
 */
router.post('/run', async (req, res, next) => {
  try {
    const result = await submitCodeExecution(req.body);

    res.status(200).json({
      status: 'success',
      execution: result,
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: err.message,
      });
    }
    next(err);
  }
});

export default router;
