/**
 * Submissions Management & History API Endpoints
 * Provides authorized queries, candidate history inspection, and attempt comparison.
 *
 * Security & Access Rules:
 * - Students: May access only their own submissions.
 * - Faculty: May access their own submissions and candidate submissions for
 *   problems they authored or assessments they oversee.
 * - Admin: Full platform-wide submission visibility.
 * - Invariant: Hidden test fixtures are NEVER leaked in any API response.
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  querySubmissions,
  findSubmissionById,
  isUserAuthorizedForSubmission,
  compareSubmissions,
} from '../services/submissionRepository.js';

const router = express.Router();

/**
 * GET /api/submissions
 * Retrieves paginated submission history filtered by criteria and role permissions.
 *
 * Query Parameters:
 * - page (default 1)
 * - limit (default 10, max 100)
 * - problemSlug
 * - assessmentId
 * - status / verdict
 * - language
 * - userId (allowed for faculty/admin; ignored/overridden for students)
 * - search
 * - sortBy (newest, oldest, highest_score, lowest_score, fastest)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      problemSlug,
      assessmentId,
      status,
      language,
      userId,
      search,
      sortBy = 'newest',
    } = req.query;

    const result = await querySubmissions({
      user: req.user,
      problemSlug,
      assessmentId,
      status,
      language,
      filterUserId: userId,
      search,
      sortBy,
      page,
      limit,
    });

    res.status(200).json({
      status: 'success',
      count: result.submissions.length,
      pagination: result.pagination,
      submissions: result.submissions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/submissions/compare
 * Compares two submissions and computes execution metric deltas and diff insights.
 *
 * Query Parameters:
 * - baseId (Submission ID 1)
 * - compareId (Submission ID 2)
 */
router.get('/compare', authenticate, async (req, res, next) => {
  try {
    const { baseId, compareId } = req.query;

    if (!baseId || !compareId) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Both baseId and compareId query parameters are required for submission comparison.',
      });
    }

    if (baseId === compareId) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'baseId and compareId must be distinct submission records.',
      });
    }

    const comparison = await compareSubmissions(baseId, compareId, req.user);

    res.status(200).json({
      status: 'success',
      ...comparison,
    });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 403) {
      return res.status(err.statusCode).json({
        status: 'error',
        statusCode: err.statusCode,
        message: err.message,
      });
    }
    next(err);
  }
});

/**
 * GET /api/submissions/:id
 * Retrieves detailed inspection for a single submission.
 * Enforces role and assignment permissions.
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const submission = await findSubmissionById(id);

    if (!submission) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: `Submission with ID '${id}' not found.`,
      });
    }

    const isAuthorized = await isUserAuthorizedForSubmission(submission, req.user);
    if (!isAuthorized) {
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Forbidden: You do not have permission to access this candidate submission.',
      });
    }

    res.status(200).json({
      status: 'success',
      submission,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
