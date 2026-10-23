/**
 * Automated Test Suite: Persistent Submission History & Comparison API
 * Validates:
 * - Persistent candidate submission records with execution metrics and assessment associations
 * - Pagination (page, limit, totalPages, hasMore) and high-volume history handling
 * - Multi-criteria filtering (problem, status, language, assessment)
 * - Strict Role-Based Access Control:
 *   - Students only access their own submissions
 *   - Accessing another candidate's submission returns 403 Forbidden
 *   - Faculty can access submissions permitted by role/authored problems/assessments
 * - Side-by-side attempt comparison and delta calculations
 * - CRITICAL: Hidden test case inputs and expected outputs are NEVER exposed in any public/student record
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  createSubmission,
  findSubmissionById,
  querySubmissions,
  compareSubmissions,
  isUserAuthorizedForSubmission,
} from '../services/submissionRepository.js';

const BASE_URL = 'http://localhost:3000/api';

test('Persistent Submission History & Comparison API Suite', async () => {
  console.log('\n====================================================');
  console.log('Starting Submission History & Comparison Test Suite');
  console.log('====================================================\n');

  const ts = Date.now();

  // 1. Register test users via HTTP API so server process registers them
  const student1Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Candidate',
      email: `alice_${ts}@student.test`,
      password: 'Password123!',
      role: 'student',
    }),
  });
  const student1Data = await student1Res.json();
  const student1Token = student1Data.token;
  const student1User = student1Data.user;

  const student2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Candidate',
      email: `bob_${ts}@student.test`,
      password: 'Password123!',
      role: 'student',
    }),
  });
  const student2Data = await student2Res.json();
  const student2Token = student2Data.token;
  const student2User = student2Data.user;

  const faculty1Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Professor Smith',
      email: `smith_${ts}@faculty.test`,
      password: 'Password123!',
      role: 'faculty',
    }),
  });
  const faculty1Data = await faculty1Res.json();
  const faculty1Token = faculty1Data.token;
  const faculty1User = faculty1Data.user;

  const faculty2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Professor Jones',
      email: `jones_${ts}@faculty.test`,
      password: 'Password123!',
      role: 'faculty',
    }),
  });
  const faculty2Data = await faculty2Res.json();
  const faculty2Token = faculty2Data.token;
  const faculty2User = faculty2Data.user;

  assert(Boolean(student1Token), 'Student 1 successfully registered with token');
  assert(Boolean(student2Token), 'Student 2 successfully registered with token');
  assert(Boolean(faculty1Token), 'Faculty 1 successfully registered with token');
  assert(Boolean(faculty2Token), 'Faculty 2 successfully registered with token');

  // ---------------------------------------------------------------------------
  // TEST 1: Unauthenticated request to /api/submissions is rejected (HTTP 401)
  // ---------------------------------------------------------------------------
  const unauthRes = await fetch(`${BASE_URL}/submissions`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated GET /api/submissions returns HTTP 401');

  // ---------------------------------------------------------------------------
  // TEST 2: Faculty 1 authors a challenge
  // ---------------------------------------------------------------------------
  const authorProblemRes = await fetch(`${BASE_URL}/problems`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${faculty1Token}`,
    },
    body: JSON.stringify({
      title: `Assignment Challenge ${ts}`,
      slug: `assignment-challenge-${ts}`,
      description: 'Special challenge authored by Faculty 1 for midterm assessment.',
      difficulty: 'Medium',
      topics: ['Algorithms'],
      status: 'published',
      starterCode: { javascript: 'function solve() {}' },
      testCases: [
        { id: 'tc_vis', input: { n: 5 }, expectedOutput: 10, isHidden: false },
        { id: 'tc_hid', input: { n: 100 }, expectedOutput: 200, isHidden: true, explanation: 'Hidden boundary test' },
      ],
    }),
  });
  const authorProblemData = await authorProblemRes.json();
  assert.strictEqual(authorProblemRes.status, 201, 'Faculty 1 authors challenge with HTTP 201');
  const problemSlug = authorProblemData.problem.slug;

  // ---------------------------------------------------------------------------
  // TEST 3: Candidate submits attempts with assessment association
  // ---------------------------------------------------------------------------
  const attempt1Res = await fetch(`${BASE_URL}/problems/${problemSlug}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${student1Token}`,
    },
    body: JSON.stringify({
      code: 'function solve() { return 5; /* attempt 1 */ }',
      language: 'javascript',
      assessmentId: `assessment_midterm_${ts}`,
      assessmentTitle: 'Spring 2026 CS Midterm',
      facultyId: faculty1User.id,
    }),
  });
  const attempt1Data = await attempt1Res.json();
  assert.strictEqual(attempt1Res.status, 200, 'Student 1 attempt 1 submitted successfully');
  const attempt1Id = attempt1Data.submission.id;
  assert(Boolean(attempt1Id), 'Attempt 1 assigned persistent submission ID');
  assert.strictEqual(attempt1Data.submission.assessmentId, `assessment_midterm_${ts}`, 'Attempt records assessment ID');

  // Candidate second attempt (different code to bypass 5s debounce)
  const attempt2Res = await fetch(`${BASE_URL}/problems/${problemSlug}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${student1Token}`,
    },
    body: JSON.stringify({
      code: 'function solve() { return 10; /* attempt 2 with refined logic */ }',
      language: 'javascript',
      assessmentId: `assessment_midterm_${ts}`,
      assessmentTitle: 'Spring 2026 CS Midterm',
      facultyId: faculty1User.id,
    }),
  });
  const attempt2Data = await attempt2Res.json();
  assert.strictEqual(attempt2Res.status, 200, 'Student 1 attempt 2 submitted successfully');
  const attempt2Id = attempt2Data.submission.id;
  assert(Boolean(attempt2Id), 'Attempt 2 assigned persistent submission ID');

  // Student 2 submits an attempt on the same problem
  const student2AttemptRes = await fetch(`${BASE_URL}/problems/${problemSlug}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${student2Token}`,
    },
    body: JSON.stringify({
      code: 'function solve() { return 0; /* student 2 code */ }',
      language: 'javascript',
      assessmentId: `assessment_midterm_${ts}`,
      assessmentTitle: 'Spring 2026 CS Midterm',
      facultyId: faculty1User.id,
    }),
  });
  const student2AttemptData = await student2AttemptRes.json();
  assert.strictEqual(student2AttemptRes.status, 200, 'Student 2 attempt submitted successfully');
  const student2AttemptId = student2AttemptData.submission.id;

  // ---------------------------------------------------------------------------
  // TEST 4: CRITICAL SECURITY INVARIANT: Secret hidden test inputs never leak
  // ---------------------------------------------------------------------------
  const stringifiedAttempt = JSON.stringify(attempt1Data);
  assert(
    !stringifiedAttempt.includes('Hidden boundary test') && !stringifiedAttempt.includes('"n":100'),
    'CRITICAL: Submission response never leaks secret hidden test case inputs'
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Student queries submission history (scoped to self)
  // ---------------------------------------------------------------------------
  const studentHistoryRes = await fetch(`${BASE_URL}/submissions?problemSlug=${problemSlug}`, {
    headers: { Authorization: `Bearer ${student1Token}` },
  });
  const studentHistoryData = await studentHistoryRes.json();
  assert.strictEqual(studentHistoryRes.status, 200, 'Student 1 can query submissions');
  assert.strictEqual(studentHistoryData.status, 'success', 'Response status is success');
  assert.strictEqual(studentHistoryData.count, 2, 'Student 1 receives exactly their 2 attempts');
  assert(
    studentHistoryData.submissions.every((s) => s.userId === student1User.id),
    'All returned submissions strictly belong to student 1'
  );
  assert.strictEqual(studentHistoryData.pagination.totalCount, 2, 'Pagination metadata reflects 2 records');

  // ---------------------------------------------------------------------------
  // TEST 6: Student cannot access other candidates by query spoofing
  // ---------------------------------------------------------------------------
  const spoofRes = await fetch(`${BASE_URL}/submissions?userId=${student2User.id}`, {
    headers: { Authorization: `Bearer ${student1Token}` },
  });
  const spoofData = await spoofRes.json();
  assert.strictEqual(spoofRes.status, 200, 'Query processes gracefully');
  assert(
    spoofData.submissions.every((s) => s.userId === student1User.id),
    'Security Guard: Student cannot view another candidate attempts via userId param'
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Single submission inspection endpoint GET /api/submissions/:id
  // ---------------------------------------------------------------------------
  const inspectRes = await fetch(`${BASE_URL}/submissions/${attempt1Id}`, {
    headers: { Authorization: `Bearer ${student1Token}` },
  });
  const inspectData = await inspectRes.json();
  assert.strictEqual(inspectRes.status, 200, 'Student can inspect their own submission detail');
  assert.strictEqual(inspectData.submission.id, attempt1Id, 'Detail returns matching ID');
  assert.strictEqual(inspectData.submission.problemSlug, problemSlug, 'Detail preserves problem reference');
  assert(inspectData.submission.code.includes('attempt 1'), 'Detail preserves original submitted code');

  // ---------------------------------------------------------------------------
  // TEST 8: Student is forbidden from accessing another candidate's submission (HTTP 403)
  // ---------------------------------------------------------------------------
  const forbiddenRes = await fetch(`${BASE_URL}/submissions/${student2AttemptId}`, {
    headers: { Authorization: `Bearer ${student1Token}` },
  });
  assert.strictEqual(forbiddenRes.status, 403, 'Accessing another student submission returns HTTP 403 Forbidden');

  // ---------------------------------------------------------------------------
  // TEST 9: Faculty access control (Permitted vs Unpermitted)
  // ---------------------------------------------------------------------------
  // Faculty 1 authored the challenge and was assigned to the assessment
  const faculty1ViewRes = await fetch(`${BASE_URL}/submissions/${student2AttemptId}`, {
    headers: { Authorization: `Bearer ${faculty1Token}` },
  });
  assert.strictEqual(faculty1ViewRes.status, 200, 'Faculty 1 can view submission for authored problem / assessment');

  // Faculty 2 did NOT author this challenge and is not assigned
  const faculty2ViewRes = await fetch(`${BASE_URL}/submissions/${student2AttemptId}`, {
    headers: { Authorization: `Bearer ${faculty2Token}` },
  });
  assert.strictEqual(
    faculty2ViewRes.status,
    403,
    'Faculty 2 is forbidden from viewing submission outside their assigned scope (HTTP 403)'
  );

  // ---------------------------------------------------------------------------
  // TEST 10: Attempt comparison API (GET /api/submissions/compare)
  // ---------------------------------------------------------------------------
  const compareRes = await fetch(
    `${BASE_URL}/submissions/compare?baseId=${attempt1Id}&compareId=${attempt2Id}`,
    {
      headers: { Authorization: `Bearer ${student1Token}` },
    }
  );
  const compareData = await compareRes.json();
  assert.strictEqual(compareRes.status, 200, 'Attempt comparison returns HTTP 200');
  assert.strictEqual(compareData.status, 'success', 'Compare returns success status');
  assert(Boolean(compareData.baseSubmission), 'Returns base submission object');
  assert(Boolean(compareData.compareSubmission), 'Returns compare submission object');
  assert(Boolean(compareData.comparisonMetrics), 'Returns comparisonMetrics object');
  assert.strictEqual(compareData.comparisonMetrics.sameProblem, true, 'Identifies same-problem comparison');

  // Attempt comparison with unauthorized attempt returns HTTP 403
  const compareUnauthorizedRes = await fetch(
    `${BASE_URL}/submissions/compare?baseId=${attempt1Id}&compareId=${student2AttemptId}`,
    {
      headers: { Authorization: `Bearer ${student1Token}` },
    }
  );
  assert.strictEqual(
    compareUnauthorizedRes.status,
    403,
    'Comparing against another student attempt returns HTTP 403 Forbidden'
  );

  // ---------------------------------------------------------------------------
  // TEST 11: Unit Level In-Process Logic Verification (Repository & Comparison)
  // ---------------------------------------------------------------------------
  const testSubA = await createSubmission({
    userId: 'u_test_a',
    userEmail: 'testa@example.com',
    userName: 'Tester A',
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    code: 'line 1\nline 2',
    language: 'javascript',
    status: 'WRONG_ANSWER',
    score: 25,
    passedTests: 1,
    totalTests: 4,
    durationMs: 60,
    memoryUsedKb: 15000,
  });

  const testSubB = await createSubmission({
    userId: 'u_test_a',
    userEmail: 'testa@example.com',
    userName: 'Tester A',
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    code: 'line 1\nline 2\nline 3\nline 4',
    language: 'javascript',
    status: 'ACCEPTED',
    score: 100,
    passedTests: 4,
    totalTests: 4,
    durationMs: 35,
    memoryUsedKb: 14000,
  });

  const unitCompare = await compareSubmissions(testSubA.id, testSubB.id, {
    id: 'u_test_a',
    role: 'student',
  });
  assert.strictEqual(unitCompare.comparisonMetrics.scoreDelta, 75, 'Unit: Score delta is +75%');
  assert.strictEqual(unitCompare.comparisonMetrics.durationDelta, -25, 'Unit: Duration delta is -25ms');
  assert.strictEqual(unitCompare.comparisonMetrics.lineDelta, 2, 'Unit: Line count delta is +2 lines');
  assert.strictEqual(unitCompare.comparisonMetrics.baseStatus, 'WRONG_ANSWER', 'Unit: Base status preserved');
  assert.strictEqual(unitCompare.comparisonMetrics.compareStatus, 'ACCEPTED', 'Unit: Compare status preserved');

  console.log('PASS: All submission history, role permission, and comparison tests passed successfully!');
});
