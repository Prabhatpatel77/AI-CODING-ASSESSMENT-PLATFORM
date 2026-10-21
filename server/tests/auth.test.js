/**
 * Authentication Test Suite
 * Validates registration rules, admin role protection, password hashing,
 * login validation, JWT verification, and RBAC endpoint security.
 */

import { resetMemoryUsers } from '../services/userRepository.js';

const BASE_URL = 'http://localhost:3000/api/auth';

async function runTests() {
  console.log('====================================================');
  console.log('Starting Backend Authentication Test Suite');
  console.log('====================================================\n');

  resetMemoryUsers();

  const ts = Date.now();
  const studentEmail = `sarah.connor.${ts}@example.com`;
  const facultyEmail = `alan.turing.${ts}@university.edu`;

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
    // -------------------------------------------------------------------------
    // TEST 1: Register student successfully
    // -------------------------------------------------------------------------
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: studentEmail,
        password: 'Password123!',
        role: 'student',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Student registration returns HTTP 201', `Got status ${regRes.status}`);
    assert(Boolean(regData.token), 'Registration returns signed JWT token');
    assert(regData.user?.role === 'student', 'Registration assigns student role');
    assert(regData.user?.password === undefined, 'CRITICAL: Password hash is NOT returned in registration response');

    const studentToken = regData.token;

    // -------------------------------------------------------------------------
    // TEST 2: Reject registration with invalid email format
    // -------------------------------------------------------------------------
    const invalidEmailRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'invalid-email-string',
        password: 'Password123!',
      }),
    });
    assert(invalidEmailRes.status === 400, 'Rejects invalid email with HTTP 400', `Got status ${invalidEmailRes.status}`);

    // -------------------------------------------------------------------------
    // TEST 3: Reject registration with weak password (< 8 chars or missing numbers)
    // -------------------------------------------------------------------------
    const weakPassRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: `john.doe.${ts}@example.com`,
        password: 'short',
      }),
    });
    assert(weakPassRes.status === 400, 'Rejects password shorter than 8 chars with HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 4: CRITICAL: Never allow public registration to assign administrator role
    // -------------------------------------------------------------------------
    const adminAttemptRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Malicious Attacker',
        email: `attacker.${ts}@example.com`,
        password: 'Password123!',
        role: 'admin',
      }),
    });
    const adminAttemptData = await adminAttemptRes.json();
    assert(
      adminAttemptRes.status === 403,
      'CRITICAL: Public registration attempting admin role returns HTTP 403 Forbidden',
      `Got status ${adminAttemptRes.status}`
    );
    assert(
      adminAttemptData.message.includes('administrator'),
      'Clear diagnostic message explaining admin accounts must be provisioned internally'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Reject duplicate email registration
    // -------------------------------------------------------------------------
    const dupRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Duplicate',
        email: studentEmail.toUpperCase(), // test case-insensitivity
        password: 'Password123!',
      }),
    });
    assert(dupRes.status === 409, 'Rejects duplicate email with HTTP 409 Conflict', `Got status ${dupRes.status}`);

    // -------------------------------------------------------------------------
    // TEST 6: Register faculty user successfully
    // -------------------------------------------------------------------------
    const facRegRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Prof. Turing',
        email: facultyEmail,
        password: 'SecurePassword123',
        role: 'faculty',
      }),
    });
    const facRegData = await facRegRes.json();
    assert(facRegRes.status === 201, 'Faculty registration returns HTTP 201');
    assert(facRegData.user?.role === 'faculty', 'Faculty registration assigns faculty role');
    const facultyToken = facRegData.token;

    // -------------------------------------------------------------------------
    // TEST 7: Login with valid credentials
    // -------------------------------------------------------------------------
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studentEmail,
        password: 'Password123!',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Login with valid credentials returns HTTP 200');
    assert(Boolean(loginData.token), 'Login returns signed JWT token');
    assert(loginData.user?.email === studentEmail, 'Login returns user profile');
    assert(loginData.user?.password === undefined, 'CRITICAL: Password hash is NOT returned in login response');

    // -------------------------------------------------------------------------
    // TEST 8: Login with invalid password
    // -------------------------------------------------------------------------
    const badPassRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studentEmail,
        password: 'WrongPassword456',
      }),
    });
    assert(badPassRes.status === 401, 'Login with invalid password returns HTTP 401');

    // -------------------------------------------------------------------------
    // TEST 9: Login with non-existent email
    // -------------------------------------------------------------------------
    const noUserRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `does.not.exist.${ts}@example.com`,
        password: 'Password123!',
      }),
    });
    assert(noUserRes.status === 401, 'Login with non-existent email returns generic HTTP 401');

    // -------------------------------------------------------------------------
    // TEST 10: Current user (/api/auth/me) with valid token
    // -------------------------------------------------------------------------
    const meRes = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /api/auth/me returns HTTP 200 with valid token');
    assert(meData.user?.email === studentEmail, 'GET /api/auth/me returns correct user data');
    assert(meData.user?.password === undefined, 'CRITICAL: Password hash is NOT returned on /api/auth/me');

    // -------------------------------------------------------------------------
    // TEST 11: Current user (/api/auth/me) without token
    // -------------------------------------------------------------------------
    const noTokenRes = await fetch(`${BASE_URL}/me`);
    assert(noTokenRes.status === 401, 'GET /api/auth/me without token returns HTTP 401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST 12: Role-based Access Control: Student accessing faculty endpoint
    // -------------------------------------------------------------------------
    const studentAccessFaculty = await fetch(`${BASE_URL}/faculty-check`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentAccessFaculty.status === 403,
      'RBAC: Student accessing faculty endpoint returns HTTP 403 Forbidden',
      `Got status ${studentAccessFaculty.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 13: Role-based Access Control: Faculty accessing faculty endpoint
    // -------------------------------------------------------------------------
    const facultyAccessFaculty = await fetch(`${BASE_URL}/faculty-check`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(facultyAccessFaculty.status === 200, 'RBAC: Faculty accessing faculty endpoint returns HTTP 200 Authorized');

    // -------------------------------------------------------------------------
    // TEST 14: Logout endpoint
    // -------------------------------------------------------------------------
    const logoutRes = await fetch(`${BASE_URL}/logout`, { method: 'POST' });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns HTTP 200');

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
