/**
 * AI Assessment & Coding Explanation REST API
 * Exposes server-side Gemini endpoints for coding assistance, explanations, and diagnostics.
 *
 * Invariants:
 * - Requires JWT authentication for generation endpoints.
 * - API key is NEVER exposed in HTTP responses or headers.
 * - Returns structured JSON validated against defined schemas.
 * - Exposes execution metrics (latency and token counts).
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  generateGeminiContent,
  GeminiServiceError,
  Type,
} from '../services/ai/geminiService.js';
import { generateAdaptiveHint, HINT_STAGES } from '../services/ai/hintAgent.js';
import { getGeminiConfig, sanitizeSecrets } from '../config/geminiConfig.js';

const router = express.Router();

/**
 * GET /api/ai/status
 * Health and configuration diagnostics endpoint.
 * Invariant: Never reveals API key or credentials.
 */
router.get('/status', (req, res) => {
  const config = getGeminiConfig();
  res.status(200).json({
    status: 'success',
    configured: config.isConfigured,
    model: config.model,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    capabilities: ['structured_json', 'retries', 'latency_tracking', 'token_accounting', 'adaptive_hints'],
  });
});

/**
 * POST /api/ai/explain
 * Authenticated endpoint for basic coding explanation and Big-O complexity analysis.
 * Uses structured output schema to return a clean, educational breakdown.
 */
router.post('/explain', authenticate, async (req, res, next) => {
  try {
    const { code, language = 'javascript', concept = 'Time and Space Complexity', userContext } = req.body;

    // Validate required source code
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Source code is required for explanation.',
      });
    }

    if (Buffer.byteLength(code, 'utf8') > 65536) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Source code exceeds maximum permitted size of 64 KB.',
      });
    }

    // Define response schema for educational explanation
    const explanationSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: 'A 1-2 sentence high-level summary of what this code does.',
        },
        timeComplexity: {
          type: Type.STRING,
          description: 'Big-O time complexity (e.g., O(n), O(n log n), O(1)).',
        },
        spaceComplexity: {
          type: Type.STRING,
          description: 'Big-O space complexity (e.g., O(1), O(n)).',
        },
        complexityExplanation: {
          type: Type.STRING,
          description: 'Brief, clear reasoning explaining the Big-O time and space complexity.',
        },
        algorithmicPattern: {
          type: Type.STRING,
          description: 'Algorithmic pattern or data structure utilized (e.g., Hash Map, Two Pointers).',
        },
        keyTakeaway: {
          type: Type.STRING,
          description: 'One key lesson or best practice takeaway for the candidate.',
        },
      },
      required: ['summary', 'timeComplexity', 'spaceComplexity', 'complexityExplanation'],
    };

    // Custom response validator
    const validator = (parsed) => {
      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, error: 'Expected JSON object in response.' };
      }
      if (!parsed.summary || typeof parsed.summary !== 'string') {
        return { valid: false, error: 'Missing or invalid summary field.' };
      }
      if (!parsed.timeComplexity || typeof parsed.timeComplexity !== 'string') {
        return { valid: false, error: 'Missing or invalid timeComplexity field.' };
      }
      return { valid: true };
    };

    const systemInstruction =
      'You are an expert computer science educator and technical assessment evaluator. Provide clear, accurate, concise, and encouraging algorithmic explanations.';

    const prompt = `Analyze and explain the following ${language} code, focusing on ${concept}.\n\nSource Code:\n\`\`\`${language}\n${code}\n\`\`\``;

    const result = await generateGeminiContent({
      prompt,
      systemInstruction,
      userContext: userContext || { candidateRole: req.user?.role || 'student' },
      responseSchema: explanationSchema,
      validator,
      temperature: 0.2, // Low temperature for consistent, factual analysis
    });

    res.status(200).json({
      status: 'success',
      data: {
        explanation: result.data,
        metrics: {
          latencyMs: result.latencyMs,
          usage: result.usage,
          model: result.model,
          retriesAttempted: result.retriesAttempted,
        },
      },
    });
  } catch (err) {
    if (err instanceof GeminiServiceError) {
      return res.status(err.statusCode).json({
        status: 'error',
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
      });
    }
    next(err);
  }
});

/**
 * POST /api/ai/hint
 * Authenticated endpoint for progressive, adaptive Socratic hints.
 *
 * Inputs:
 * - problem: { title, description, constraints }
 * - code: student's current code (required)
 * - language: 'javascript' | 'python'
 * - judgeResults: optional real test execution verdict and logs
 * - previousAttempts: attempt count or array of previous attempts
 * - previousHints: array of prior hints already delivered
 * - hintLevel: 1 (Conceptual Clue) | 2 (Algorithmic Direction) | 3 (Specific Guidance)
 */
router.post('/hint', authenticate, async (req, res, next) => {
  try {
    const {
      problem,
      code,
      language = 'javascript',
      judgeResults,
      previousAttempts = [],
      previousHints = [],
      hintLevel = 1,
    } = req.body;

    // Validate required student code
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Student source code is required to generate a hint.',
      });
    }

    if (Buffer.byteLength(code, 'utf8') > 65536) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Source code exceeds maximum permitted size of 64 KB.',
      });
    }

    const result = await generateAdaptiveHint({
      problem: problem || {},
      code,
      language,
      judgeResults,
      previousAttempts,
      previousHints,
      hintLevel,
      userContext: { candidateRole: req.user?.role || 'student' },
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    if (err instanceof GeminiServiceError) {
      return res.status(err.statusCode).json({
        status: 'error',
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
      });
    }
    if (err.message && err.message.includes('required')) {
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
