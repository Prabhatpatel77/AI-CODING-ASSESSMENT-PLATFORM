/**
 * Problem Management & CRUD API Test Suite
 * Validates problem creation, role permissions (faculty/admin vs student),
 * publication filtering, and hidden test-case exclusion.
 */

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('====================================================');
  console.log('Starting Coding Problem Model & CRUD API Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passed++;
    } else {
      console.error(`FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // Setup test users via HTTP API so server process registers them
    const timestamp = Date.now();
    const studentRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alan Turing',
        email: `student.alan.${timestamp}@example.com`,
        password: 'Password123!',
        role: 'student',
      }),
    });
    const studentRegData = await studentRegRes.json();
    const studentToken = studentRegData.token;

    const facultyRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Prof. Hopper',
        email: `faculty.hopper.${timestamp}@example.com`,
        password: 'Password123!',
        role: 'faculty',
      }),
    });
    const facultyRegData = await facultyRegRes.json();
    const facultyToken = facultyRegData.token;

    // -------------------------------------------------------------------------
    // TEST 1: Students listing problems only receive published problems
    // -------------------------------------------------------------------------
    const listRes = await fetch(`${BASE_URL}/problems`);
    const listData = await listRes.json();
    assert(listRes.status === 200, 'GET /api/problems returns HTTP 200');
    assert(Array.isArray(listData.problems), 'Response contains problems array');

    const allPublished = listData.problems.every((p) => p.status === 'published');
    assert(allPublished, 'All returned problems for students have status: "published"');

    const containsDraft = listData.problems.some((p) => p.slug === 'merge-intervals-draft');
    assert(!containsDraft, 'Draft problem "merge-intervals-draft" is NOT included in student list');

    // -------------------------------------------------------------------------
    // TEST 2: CRITICAL SECURITY: Never expose hidden test cases in public API responses
    // -------------------------------------------------------------------------
    const twoSumRes = await fetch(`${BASE_URL}/problems/two-sum`);
    const twoSumData = await twoSumRes.json();
    assert(twoSumRes.status === 200, 'GET /api/problems/two-sum returns HTTP 200');
    assert(twoSumData.problem?.slug === 'two-sum', 'Retrieves correct problem details');

    const exposedHidden = (twoSumData.problem?.visibleTestCases || []).some((tc) => tc.isHidden === true);
    assert(!exposedHidden, 'CRITICAL: No hidden test cases present in visibleTestCases');
    assert(
      twoSumData.problem?.testCases === undefined,
      'CRITICAL: Raw testCases collection with hidden test suites is NOT exposed to public'
    );
    assert(
      typeof twoSumData.problem?.hiddenTestCasesCount === 'number',
      'Exposes safe hiddenTestCasesCount metadata instead of hidden payloads'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Students cannot access un-published draft problem directly
    // -------------------------------------------------------------------------
    const draftDirectRes = await fetch(`${BASE_URL}/problems/merge-intervals-draft`);
    assert(
      draftDirectRes.status === 404,
      'Unauthenticated/Student accessing draft problem returns HTTP 404',
      `Got status ${draftDirectRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Unauthenticated attempt to create a problem is rejected
    // -------------------------------------------------------------------------
    const unauthCreateRes = await fetch(`${BASE_URL}/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized Problem',
        description: 'Should fail',
        difficulty: 'Easy',
      }),
    });
    assert(unauthCreateRes.status === 401, 'Unauthenticated POST /api/problems returns HTTP 401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST 5: Student attempt to create a problem is rejected by RBAC
    // -------------------------------------------------------------------------
    const studentCreateRes = await fetch(`${BASE_URL}/problems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Student Attempted Problem',
        description: 'Should fail with 403',
        difficulty: 'Easy',
      }),
    });
    assert(studentCreateRes.status === 403, 'Student POST /api/problems returns HTTP 403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 6: Faculty successfully creates a new coding problem
    // -------------------------------------------------------------------------
    const newProblemPayload = {
      title: 'Trapping Rain Water Challenge',
      slug: 'trapping-rain-water-challenge',
      description: 'Given `n` non-negative integers representing an elevation map...',
      constraints: ['n == height.length', '1 <= n <= 2 * 10^4', '0 <= height[i] <= 10^5'],
      difficulty: 'Hard',
      topics: ['Two Pointers', 'Dynamic Programming', 'Stack'],
      examples: [
        {
          input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
          output: '6',
          explanation: 'The above elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.',
        },
      ],
      starterCode: {
        javascript: 'function trap(height) {\n  // Code\n}\n',
        python: 'def trap(height: list[int]) -> int:\n    pass\n',
      },
      supportedLanguages: ['javascript', 'python'],
      testCases: [
        {
          id: 'tc_vis_1',
          input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
          inputStr: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
          expectedOutput: 6,
          isHidden: false,
        },
        {
          id: 'tc_hid_2',
          input: { height: [4, 2, 0, 3, 2, 5] },
          inputStr: 'height = [4,2,0,3,2,5]',
          expectedOutput: 9,
          isHidden: true,
          explanation: 'Large valley boundary hidden test',
        },
      ],
      status: 'draft',
    };

    const facultyCreateRes = await fetch(`${BASE_URL}/problems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify(newProblemPayload),
    });
    const facultyCreateData = await facultyCreateRes.json();
    assert(facultyCreateRes.status === 201, 'Faculty POST /api/problems returns HTTP 201 Created');
    assert(
      facultyCreateData.problem?.slug === 'trapping-rain-water-challenge',
      'Created problem has correct slug'
    );
    assert(
      Array.isArray(facultyCreateData.problem?.testCases) && facultyCreateData.problem?.testCases.length === 2,
      'Faculty author receives full testCases collection (both visible and hidden)'
    );

    // -------------------------------------------------------------------------
    // TEST 7: Input validation: Rejects missing description or invalid difficulty
    // -------------------------------------------------------------------------
    const invalidDifficultyRes = await fetch(`${BASE_URL}/problems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        title: 'Invalid Difficulty Problem',
        description: 'Some description',
        difficulty: 'SuperHard', // Not in Easy, Medium, Hard
      }),
    });
    assert(invalidDifficultyRes.status === 400, 'Rejects invalid difficulty with HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 8: Rejects duplicate problem slug
    // -------------------------------------------------------------------------
    const duplicateSlugRes = await fetch(`${BASE_URL}/problems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        title: 'Two Sum Duplicate',
        slug: 'two-sum',
        description: 'Duplicate slug test',
        difficulty: 'Easy',
      }),
    });
    assert(duplicateSlugRes.status === 409, 'Rejects duplicate problem slug with HTTP 409 Conflict');

    // -------------------------------------------------------------------------
    // TEST 9: Faculty can view draft problems
    // -------------------------------------------------------------------------
    const facultyDraftsRes = await fetch(`${BASE_URL}/problems?status=draft`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const facultyDraftsData = await facultyDraftsRes.json();
    assert(facultyDraftsRes.status === 200, 'Faculty GET /api/problems?status=draft returns HTTP 200');
    const hasCreatedDraft = facultyDraftsData.problems?.some(
      (p) => p.slug === 'trapping-rain-water-challenge'
    );
    assert(hasCreatedDraft, 'Faculty list includes newly created draft challenge');

    // -------------------------------------------------------------------------
    // TEST 10: Faculty can view full test cases of draft problem
    // -------------------------------------------------------------------------
    const facultyViewRes = await fetch(`${BASE_URL}/problems/trapping-rain-water-challenge`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const facultyViewData = await facultyViewRes.json();
    assert(facultyViewRes.status === 200, 'Faculty GET /api/problems/:slug returns HTTP 200 for draft');
    assert(
      Array.isArray(facultyViewData.problem?.testCases),
      'Faculty author receives testCases collection'
    );

    // -------------------------------------------------------------------------
    // TEST 11: Faculty publishes the problem
    // -------------------------------------------------------------------------
    const updateRes = await fetch(`${BASE_URL}/problems/trapping-rain-water-challenge`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        status: 'published',
        difficulty: 'Hard',
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Faculty PUT /api/problems/:slug returns HTTP 200');
    assert(updateData.problem?.status === 'published', 'Problem status updated to published');

    // -------------------------------------------------------------------------
    // TEST 12: Student can now access the published problem with hidden tests stripped
    // -------------------------------------------------------------------------
    const studentAccessPublished = await fetch(`${BASE_URL}/problems/trapping-rain-water-challenge`);
    const studentPublishedData = await studentAccessPublished.json();
    assert(studentAccessPublished.status === 200, 'Student can now access published challenge');
    assert(
      studentPublishedData.problem?.testCases === undefined,
      'CRITICAL: Hidden test suite remains stripped from student response'
    );
    assert(
      studentPublishedData.problem?.visibleTestCases?.length === 1,
      'Student receives only visible test case'
    );

    // -------------------------------------------------------------------------
    // TEST 13: Student cannot delete problems
    // -------------------------------------------------------------------------
    const studentDeleteRes = await fetch(`${BASE_URL}/problems/trapping-rain-water-challenge`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentDeleteRes.status === 403, 'Student DELETE /api/problems/:slug returns HTTP 403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 14: Faculty deletes the problem
    // -------------------------------------------------------------------------
    const facultyDeleteRes = await fetch(`${BASE_URL}/problems/trapping-rain-water-challenge`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(facultyDeleteRes.status === 200, 'Faculty DELETE /api/problems/:slug returns HTTP 200');

    // -------------------------------------------------------------------------
    // TEST 15: Verify deleted problem is 404
    // -------------------------------------------------------------------------
    const verifyDeletedRes = await fetch(`${BASE_URL}/problems/trapping-rain-water-challenge`);
    assert(verifyDeletedRes.status === 404, 'Deleted problem returns HTTP 404');
  } catch (err) {
    console.error('Test execution encountered fatal error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`Test Suite Completed: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
