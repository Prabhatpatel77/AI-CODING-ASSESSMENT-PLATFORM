/**
 * Problem Management REST API Endpoints
 * Provides protected CRUD operations for faculty/admins and filtered challenge browsing for students.
 */

import express from 'express';
import {
  findAllProblems,
  findProblemByIdOrSlug,
  createProblem,
  updateProblem,
  deleteProblem,
  generateSlug,
} from '../services/problemRepository.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { verifyToken } from '../services/jwtService.js';
import { findUserById } from '../services/userRepository.js';
import { executeProblemTestSuite } from '../services/execution/index.js';

const router = express.Router();

/**
 * Optional authentication middleware.
 * If a valid Bearer token is provided, attaches req.user.
 * If no token is provided, req.user remains null without aborting the request.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1].trim();
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const user = await findUserById(decoded.id);
        if (user && user.isActive) {
          req.user = typeof user.toSafeObject === 'function' ? user.toSafeObject() : user;
        }
      }
    }
  } catch {
    // If token is invalid or expired, proceed gracefully as unauthenticated student/guest
    req.user = null;
  }
  next();
}

/**
 * GET /api/problems
 * Retrieves coding challenges with topic, difficulty, and search filters.
 * Students only receive published problems with hidden test cases removed.
/**
 * GET /api/problems/meta/topics
 * Returns dynamic list of unique topic categories from available challenges.
 */
router.get('/meta/topics', async (req, res, next) => {
  try {
    const result = await findAllProblems({ limit: 1000 });
    const allTopics = new Set();
    result.problems.forEach((p) => {
      (p.topics || []).forEach((t) => allTopics.add(t));
    });
    res.status(200).json({
      status: 'success',
      topics: Array.from(allTopics).sort(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/problems
 * Retrieves coding challenges with topic, difficulty, search, sort, and pagination filters.
 * Students only receive published problems with hidden test cases removed.
 * Faculty/Admins can inspect drafts and full test suites.
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const isFacultyOrAdmin = Boolean(
      req.user && (req.user.role === 'faculty' || req.user.role === 'admin')
    );

    const { status, difficulty, topic, search, sortBy, page, limit } = req.query;

    const result = await findAllProblems({
      status,
      difficulty,
      topic,
      search,
      sortBy,
      page,
      limit,
      isFacultyOrAdmin,
    });

    res.status(200).json({
      status: 'success',
      count: result.problems.length,
      total: result.totalCount,
      page: result.page,
      totalPages: result.totalPages,
      problems: result.problems,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/problems/:idOrSlug
 * Retrieves a single problem by ID or URL slug.
 * Hidden test cases are completely omitted for students and unauthenticated callers.
 */
router.get('/:idOrSlug', optionalAuth, async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const isFacultyOrAdmin = Boolean(
      req.user && (req.user.role === 'faculty' || req.user.role === 'admin')
    );

    const problem = await findProblemByIdOrSlug(idOrSlug, { isFacultyOrAdmin });

    if (!problem) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Problem not found or not published.',
      });
    }

    res.status(200).json({
      status: 'success',
      problem,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/problems
 * Creates a new coding problem.
 * Protected: Requires Faculty or Admin role.
 */
router.post('/', authenticate, requireRole('faculty', 'admin'), async (req, res, next) => {
  try {
    const {
      title,
      slug,
      description,
      constraints,
      difficulty,
      topics,
      examples,
      starterCode,
      supportedLanguages,
      testCases,
      status,
    } = req.body;

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Problem title is required and must be at least 3 characters long.',
      });
    }

    if (title.trim().length > 120) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Problem title cannot exceed 120 characters.',
      });
    }

    // Validate description
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Problem description markdown is required.',
      });
    }

    // Validate difficulty
    const validDifficulties = ['Easy', 'Medium', 'Hard'];
    if (!difficulty || !validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: `Difficulty must be one of: ${validDifficulties.join(', ')}.`,
      });
    }

    // Validate status
    const validStatuses = ['draft', 'published', 'archived'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: `Status must be one of: ${validStatuses.join(', ')}.`,
      });
    }

    // Validate test cases array
    if (testCases && !Array.isArray(testCases)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Test cases must be provided as an array.',
      });
    }

    // Check slug collision
    const targetSlug = generateSlug(slug || title);
    const existing = await findProblemByIdOrSlug(targetSlug, { isFacultyOrAdmin: true });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: `A problem with the slug '${targetSlug}' already exists.`,
      });
    }

    const created = await createProblem(
      {
        title: title.trim(),
        slug: targetSlug,
        description: description.trim(),
        constraints: Array.isArray(constraints) ? constraints : [],
        difficulty,
        topics: Array.isArray(topics) ? topics : [],
        examples: Array.isArray(examples) ? examples : [],
        starterCode: starterCode || {},
        supportedLanguages: Array.isArray(supportedLanguages) ? supportedLanguages : ['javascript', 'python'],
        testCases: Array.isArray(testCases) ? testCases : [],
        status: status || 'draft',
      },
      req.user.id || req.user.email
    );

    res.status(201).json({
      status: 'success',
      message: 'Problem created successfully.',
      problem: created,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: 'A problem with this slug already exists.',
      });
    }
    next(err);
  }
});

/**
 * PUT /api/problems/:idOrSlug
 * Updates an existing coding problem.
 * Protected: Requires Faculty or Admin role.
 */
router.put('/:idOrSlug', authenticate, requireRole('faculty', 'admin'), async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const existing = await findProblemByIdOrSlug(idOrSlug, { isFacultyOrAdmin: true });
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Problem not found.',
      });
    }

    const {
      title,
      slug,
      description,
      constraints,
      difficulty,
      topics,
      examples,
      starterCode,
      supportedLanguages,
      testCases,
      status,
    } = req.body;

    if (difficulty) {
      const validDifficulties = ['Easy', 'Medium', 'Hard'];
      if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: `Difficulty must be one of: ${validDifficulties.join(', ')}.`,
        });
      }
    }

    if (status) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: `Status must be one of: ${validStatuses.join(', ')}.`,
        });
      }
    }

    const updated = await updateProblem(idOrSlug, {
      title,
      slug,
      description,
      constraints,
      difficulty,
      topics,
      examples,
      starterCode,
      supportedLanguages,
      testCases,
      status,
    });

    res.status(200).json({
      status: 'success',
      message: 'Problem updated successfully.',
      problem: updated,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: 'A problem with this slug already exists.',
      });
    }
    next(err);
  }
});

/**
 * DELETE /api/problems/:idOrSlug
 * Deletes a coding problem.
 * Protected: Requires Faculty or Admin role.
 */
router.delete('/:idOrSlug', authenticate, requireRole('faculty', 'admin'), async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const deleted = await deleteProblem(idOrSlug);
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Problem not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Problem deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/problems/:idOrSlug/run
 * Runs student code against visible test cases in the isolated execution sandbox.
 * Never executes on the local host.
 */
router.post('/:idOrSlug/run', optionalAuth, async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const { code, language = 'javascript', resourceLimits } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Source code string is required and cannot be empty.',
      });
    }

    if (Buffer.byteLength(code, 'utf8') > 65536) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Source code exceeds maximum permitted size of 64 KB.',
      });
    }

    const result = await executeProblemTestSuite({
      problemSlug: idOrSlug,
      code,
      language,
      isSubmit: false,
      resourceLimits,
    });

    res.status(200).json({
      status: 'success',
      execution: result,
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: err.message,
      });
    }
    next(err);
  }
});

/**
 * POST /api/problems/:idOrSlug/submit
 * Evaluates student code against the complete test suite (both visible and hidden).
 * CRITICAL SECURITY INVARIANT:
 * Hidden test case inputs and expected outputs are NEVER returned in the client response.
 * Unexecuted code is NEVER marked as successful.
 */
router.post('/:idOrSlug/submit', optionalAuth, async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const { code, language = 'javascript', resourceLimits } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Source code string is required and cannot be empty.',
      });
    }

    if (Buffer.byteLength(code, 'utf8') > 65536) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Source code exceeds maximum permitted size of 64 KB.',
      });
    }

    const evaluation = await executeProblemTestSuite({
      problemSlug: idOrSlug,
      code,
      language,
      isSubmit: true,
      resourceLimits,
    });

    res.status(200).json({
      status: 'success',
      evaluation,
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: err.message,
      });
    }
    next(err);
  }
});

export default router;
