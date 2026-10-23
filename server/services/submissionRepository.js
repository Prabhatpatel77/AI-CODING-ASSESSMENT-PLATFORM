/**
 * Submission Repository Adapter
 * Handles persistent storage, authorized multi-role querying, and attempt comparison
 * of candidate code evaluation records via Mongoose Submission model,
 * with high-performance in-memory fallback for offline/standalone execution.
 */

import mongoose from 'mongoose';
import { Submission } from '../models/Submission.js';
import { getProblemSlugsByAuthor } from './problemRepository.js';

// In-memory fallback map for offline/standalone operation
const memorySubmissions = new Map();

/**
 * Sanitizes submission representation for public/student view.
 * Guarantees hidden test case payloads are NEVER present.
 */
export function sanitizeSubmission(sub) {
  if (!sub) return null;
  if (typeof sub.toSafeObject === 'function') {
    return sub.toSafeObject();
  }

  const safeResults = (sub.testResults || []).map((tr) => {
    if (tr.isHidden) {
      return {
        testCaseNumber: tr.testCaseNumber,
        isHidden: true,
        passed: Boolean(tr.passed),
        status: tr.status,
        durationMs: tr.durationMs || 0,
        inputStr: null,
        expectedOutput: null,
        actualOutput: null,
        stdout: null,
        stderr: null,
        compileOutput: null,
      };
    }
    return {
      testCaseNumber: tr.testCaseNumber,
      isHidden: false,
      passed: Boolean(tr.passed),
      status: tr.status,
      durationMs: tr.durationMs || 0,
      inputStr: tr.inputStr || null,
      expectedOutput: tr.expectedOutput || null,
      actualOutput: tr.actualOutput || null,
      stdout: tr.stdout || null,
      stderr: tr.stderr || null,
      compileOutput: tr.compileOutput || null,
    };
  });

  return {
    id: sub.id || sub._id?.toString(),
    _id: sub.id || sub._id?.toString(),
    userId: sub.userId,
    userEmail: sub.userEmail,
    userName: sub.userName,
    problemSlug: sub.problemSlug,
    problemTitle: sub.problemTitle,
    assessmentId: sub.assessmentId || null,
    assessmentTitle: sub.assessmentTitle || null,
    facultyId: sub.facultyId || null,
    language: sub.language,
    code: sub.code,
    status: sub.status,
    score: sub.score,
    passedTests: sub.passedTests,
    totalTests: sub.totalTests,
    hiddenTestsPassed: sub.hiddenTestsPassed,
    hiddenTestsTotal: sub.hiddenTestsTotal,
    durationMs: sub.durationMs,
    memoryUsedKb: sub.memoryUsedKb,
    provider: sub.provider,
    testResults: safeResults,
    error: sub.error || null,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

/**
 * Checks for recent duplicate submissions to prevent accidental double-clicks or duplicate DB records.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.problemSlug
 * @param {string} params.code
 * @param {string} params.language
 * @param {number} [params.windowSeconds=5]
 * @returns {Promise<Object|null>} Existing recent submission or null
 */
export async function checkDuplicateSubmission({
  userId,
  problemSlug,
  code,
  language,
  windowSeconds = 5,
}) {
  const windowThreshold = new Date(Date.now() - windowSeconds * 1000);

  if (mongoose.connection.readyState === 1) {
    const existing = await Submission.findOne({
      userId,
      problemSlug,
      code,
      language,
      createdAt: { $gte: windowThreshold },
    })
      .sort({ createdAt: -1 })
      .exec();

    return existing ? existing.toSafeObject() : null;
  }

  // In-memory check
  for (const sub of memorySubmissions.values()) {
    if (
      String(sub.userId) === String(userId) &&
      sub.problemSlug === problemSlug &&
      sub.code === code &&
      sub.language === language &&
      new Date(sub.createdAt) >= windowThreshold
    ) {
      return sanitizeSubmission(sub);
    }
  }

  return null;
}

/**
 * Creates and saves a formal evaluation record.
 * Redacts hidden test details before persistence.
 *
 * @param {Object} submissionData
 * @returns {Promise<Object>} Safe saved submission record
 */
export async function createSubmission(submissionData) {
  const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Redact any sensitive hidden test payloads before database persistence
  const safeTestResults = (submissionData.testResults || []).map((tr) => {
    if (tr.isHidden) {
      return {
        testCaseId: tr.testCaseId || '',
        testCaseNumber: tr.testCaseNumber,
        isHidden: true,
        passed: Boolean(tr.passed),
        status: tr.status,
        durationMs: tr.durationMs || 0,
        inputStr: null,
        expectedOutput: null,
        actualOutput: null,
        stdout: null,
        stderr: null,
        compileOutput: null,
      };
    }
    return tr;
  });

  const recordData = {
    ...submissionData,
    id: subId,
    testResults: safeTestResults,
    score:
      submissionData.totalTests > 0
        ? Math.round((submissionData.passedTests / submissionData.totalTests) * 100)
        : 0,
    assessmentId: submissionData.assessmentId || null,
    assessmentTitle: submissionData.assessmentTitle || null,
    facultyId: submissionData.facultyId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (mongoose.connection.readyState === 1) {
    const doc = new Submission(recordData);
    await doc.save();
    return doc.toSafeObject();
  }

  memorySubmissions.set(subId, recordData);
  return sanitizeSubmission(recordData);
}

/**
 * Queries submissions with pagination, multi-criteria filtering, and role-based permissions.
 *
 * Permissions:
 * - Student: Restricted solely to their own submissions (req.user.id).
 * - Faculty: Can view their own submissions, submissions for assessments they created (facultyId),
 *   or submissions for problems they authored.
 * - Admin: Full unrestricted access across all submissions.
 *
 * @param {Object} options
 * @returns {Promise<{ submissions: Array<Object>, pagination: Object }>}
 */
export async function querySubmissions({
  user,
  problemSlug,
  assessmentId,
  status,
  language,
  filterUserId,
  search,
  sortBy = 'newest',
  page = 1,
  limit = 10,
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skipNum = (pageNum - 1) * limitNum;

  const userRole = user?.role || 'student';
  const currentUserId = user?.id || user?._id?.toString() || 'anonymous';
  const isAdmin = userRole === 'admin';
  const isFaculty = userRole === 'faculty';

  // Resolve faculty authored problem slugs for permission scoping
  let facultyAuthoredSlugs = [];
  if (isFaculty) {
    facultyAuthoredSlugs = await getProblemSlugsByAuthor(currentUserId);
  }

  // ---------------------------------------------------------------------------
  // MongoDB execution path
  // ---------------------------------------------------------------------------
  if (mongoose.connection.readyState === 1) {
    const andClauses = [];

    // Role-based permission scoping
    if (isAdmin) {
      if (filterUserId) {
        andClauses.push({ userId: filterUserId });
      }
    } else if (isFaculty) {
      const facultyScope = [
        { facultyId: currentUserId },
        { problemSlug: { $in: facultyAuthoredSlugs } },
        { userId: currentUserId },
      ];
      if (filterUserId) {
        andClauses.push({
          $and: [{ userId: filterUserId }, { $or: facultyScope }],
        });
      } else {
        andClauses.push({ $or: facultyScope });
      }
    } else {
      // Student is strictly pinned to their own user ID
      andClauses.push({ userId: currentUserId });
    }

    if (problemSlug && problemSlug !== 'all') {
      andClauses.push({ problemSlug });
    }

    if (assessmentId && assessmentId !== 'all') {
      andClauses.push({ assessmentId });
    }

    if (status && status !== 'all') {
      andClauses.push({ status: status.toUpperCase() });
    }

    if (language && language !== 'all') {
      andClauses.push({ language: language.toLowerCase() });
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      andClauses.push({
        $or: [
          { problemTitle: regex },
          { problemSlug: regex },
          { userName: regex },
          { userEmail: regex },
          { id: regex },
        ],
      });
    }

    const query = andClauses.length > 0 ? { $and: andClauses } : {};

    let sort = { createdAt: -1 };
    if (sortBy === 'oldest') sort = { createdAt: 1 };
    else if (sortBy === 'highest_score') sort = { score: -1, createdAt: -1 };
    else if (sortBy === 'lowest_score') sort = { score: 1, createdAt: -1 };
    else if (sortBy === 'fastest') sort = { durationMs: 1, createdAt: -1 };

    const [totalCount, docs] = await Promise.all([
      Submission.countDocuments(query).exec(),
      Submission.find(query).sort(sort).skip(skipNum).limit(limitNum).exec(),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    return {
      submissions: docs.map((doc) => doc.toSafeObject()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // High-performance in-memory fallback path
  // ---------------------------------------------------------------------------
  const candidateList = Array.from(memorySubmissions.values());
  const filtered = [];

  for (const sub of candidateList) {
    // 1. Role permission checks
    if (!isAdmin) {
      if (isFaculty) {
        const isOwner = String(sub.userId) === String(currentUserId);
        const isFacultyAssigned = String(sub.facultyId) === String(currentUserId);
        const isAuthoredProblem = facultyAuthoredSlugs.includes(sub.problemSlug);

        if (!isOwner && !isFacultyAssigned && !isAuthoredProblem) {
          continue;
        }

        if (filterUserId && String(sub.userId) !== String(filterUserId)) {
          continue;
        }
      } else {
        // Student: strictly own submissions
        if (String(sub.userId) !== String(currentUserId)) {
          continue;
        }
      }
    } else {
      // Admin filter by user
      if (filterUserId && String(sub.userId) !== String(filterUserId)) {
        continue;
      }
    }

    // 2. Problem slug filter
    if (problemSlug && problemSlug !== 'all' && sub.problemSlug !== problemSlug) {
      continue;
    }

    // 3. Assessment filter
    if (assessmentId && assessmentId !== 'all' && sub.assessmentId !== assessmentId) {
      continue;
    }

    // 4. Status/verdict filter
    if (status && status !== 'all' && sub.status !== status.toUpperCase()) {
      continue;
    }

    // 5. Language filter
    if (language && language !== 'all' && sub.language !== language.toLowerCase()) {
      continue;
    }

    // 6. Search query
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const matches =
        (sub.problemTitle || '').toLowerCase().includes(q) ||
        (sub.problemSlug || '').toLowerCase().includes(q) ||
        (sub.userName || '').toLowerCase().includes(q) ||
        (sub.userEmail || '').toLowerCase().includes(q) ||
        (sub.id || '').toLowerCase().includes(q);
      if (!matches) continue;
    }

    filtered.push(sanitizeSubmission(sub));
  }

  // Sorting
  if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortBy === 'highest_score') {
    filtered.sort((a, b) => (b.score - a.score) || (new Date(b.createdAt) - new Date(a.createdAt)));
  } else if (sortBy === 'lowest_score') {
    filtered.sort((a, b) => (a.score - b.score) || (new Date(b.createdAt) - new Date(a.createdAt)));
  } else if (sortBy === 'fastest') {
    filtered.sort((a, b) => (a.durationMs - b.durationMs) || (new Date(b.createdAt) - new Date(a.createdAt)));
  } else {
    // Default newest
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const totalCount = filtered.length;
  const paginated = filtered.slice(skipNum, skipNum + limitNum);
  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  return {
    submissions: paginated,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages,
      hasMore: pageNum < totalPages,
    },
  };
}

/**
 * Retrieves submissions for a specific problem.
 * Maintained for backward compatibility.
 *
 * @param {string} problemSlug
 * @param {string|null} [userId=null]
 * @param {number} [limit=20]
 * @returns {Promise<Array<Object>>}
 */
export async function findSubmissionsByProblem(problemSlug, userId = null, limit = 20) {
  if (mongoose.connection.readyState === 1) {
    const query = { problemSlug };
    if (userId) {
      query.userId = userId;
    }
    const docs = await Submission.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return docs.map((doc) => doc.toSafeObject());
  }

  // In-memory search
  const matches = [];
  for (const sub of memorySubmissions.values()) {
    if (sub.problemSlug === problemSlug) {
      if (!userId || String(sub.userId) === String(userId)) {
        matches.push(sanitizeSubmission(sub));
      }
    }
  }

  matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return matches.slice(0, limit);
}

/**
 * Finds a single submission by its unique ID.
 *
 * @param {string} submissionId
 * @returns {Promise<Object|null>}
 */
export async function findSubmissionById(submissionId) {
  if (!submissionId) return null;

  if (mongoose.connection.readyState === 1) {
    const isObjectId = mongoose.Types.ObjectId.isValid(submissionId);
    const query = isObjectId
      ? { $or: [{ _id: submissionId }, { id: submissionId }] }
      : { id: submissionId };

    const doc = await Submission.findOne(query).exec();
    return doc ? doc.toSafeObject() : null;
  }

  const inMem = memorySubmissions.get(submissionId);
  return inMem ? sanitizeSubmission(inMem) : null;
}

/**
 * Validates whether a user is authorized to view a specific submission.
 *
 * Rules:
 * - Admin: always authorized.
 * - Student: authorized ONLY if submission.userId === user.id.
 * - Faculty: authorized if submission.userId === user.id OR
 *   submission.facultyId === user.id OR
 *   submission.problemSlug is authored by the faculty.
 *
 * @param {Object} submission
 * @param {Object} user
 * @returns {Promise<boolean>}
 */
export async function isUserAuthorizedForSubmission(submission, user) {
  if (!submission || !user) return false;
  const userRole = user.role || 'student';
  const userId = user.id || user._id?.toString();

  if (userRole === 'admin') return true;

  // Candidate is always permitted to view their own submission
  if (String(submission.userId) === String(userId)) return true;

  // Students can NEVER view another candidate's submission
  if (userRole !== 'faculty') return false;

  // Faculty permitted if assigned to the assessment
  if (submission.facultyId && String(submission.facultyId) === String(userId)) {
    return true;
  }

  // Faculty permitted if they authored the challenge
  const authoredSlugs = await getProblemSlugsByAuthor(userId);
  if (authoredSlugs.includes(submission.problemSlug)) {
    return true;
  }

  return false;
}

/**
 * Compares two submissions and calculates comparative metrics and diff statistics.
 *
 * @param {string} baseId
 * @param {string} compareId
 * @param {Object} user
 * @returns {Promise<Object>}
 */
export async function compareSubmissions(baseId, compareId, user) {
  const [baseSub, compareSub] = await Promise.all([
    findSubmissionById(baseId),
    findSubmissionById(compareId),
  ]);

  if (!baseSub) {
    const err = new Error(`Base submission '${baseId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  if (!compareSub) {
    const err = new Error(`Comparison submission '${compareId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  // Verify authorization for both attempts
  const [authBase, authCompare] = await Promise.all([
    isUserAuthorizedForSubmission(baseSub, user),
    isUserAuthorizedForSubmission(compareSub, user),
  ]);

  if (!authBase || !authCompare) {
    const forbiddenErr = new Error('You are not authorized to access one or both of the requested submissions.');
    forbiddenErr.statusCode = 403;
    throw forbiddenErr;
  }

  // Calculate comparison deltas
  const scoreDelta = (compareSub.score || 0) - (baseSub.score || 0);
  const durationDelta = (compareSub.durationMs || 0) - (baseSub.durationMs || 0);
  const memoryDelta =
    compareSub.memoryUsedKb && baseSub.memoryUsedKb
      ? compareSub.memoryUsedKb - baseSub.memoryUsedKb
      : null;

  const baseLines = (baseSub.code || '').split('\n');
  const compareLines = (compareSub.code || '').split('\n');

  const baseLineCount = baseLines.length;
  const compareLineCount = compareLines.length;
  const lineDelta = compareLineCount - baseLineCount;

  return {
    baseSubmission: baseSub,
    compareSubmission: compareSub,
    comparisonMetrics: {
      scoreDelta,
      durationDelta,
      memoryDelta,
      lineDelta,
      baseScore: baseSub.score || 0,
      compareScore: compareSub.score || 0,
      baseStatus: baseSub.status,
      compareStatus: compareSub.status,
      baseDurationMs: baseSub.durationMs || 0,
      compareDurationMs: compareSub.durationMs || 0,
      basePassedTests: baseSub.passedTests || 0,
      comparePassedTests: compareSub.passedTests || 0,
      baseTotalTests: baseSub.totalTests || 0,
      compareTotalTests: compareSub.totalTests || 0,
      timeBetweenMs: Math.abs(new Date(compareSub.createdAt) - new Date(baseSub.createdAt)),
      sameProblem: baseSub.problemSlug === compareSub.problemSlug,
      sameLanguage: baseSub.language === compareSub.language,
    },
  };
}

/**
 * Resets memory submissions (useful for test runs)
 */
export function resetMemorySubmissions() {
  memorySubmissions.clear();
}
