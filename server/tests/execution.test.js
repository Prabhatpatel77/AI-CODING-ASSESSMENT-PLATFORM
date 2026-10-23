/**
 * Isolated Code Execution Service Contract Test Suite
 * Validates request/response contracts, language validation, resource limits,
 * unconfigured sandbox protection (no local eval/child_process), and adapter isolation.
 */

import {
  SUPPORTED_LANGUAGES,
  EXECUTION_STATUS,
  validateExecutionRequest,
  generateExecutionId,
} from '../contracts/executionContract.js';
import {
  getExecutionServiceConfig,
  submitCodeExecution,
  resetExecutionProvider,
} from '../services/execution/index.js';
import { ExecutionAdapter } from '../services/execution/ExecutionAdapter.js';

const BASE_URL = 'http://localhost:3000/api/execution';

async function runTests() {
  console.log('====================================================');
  console.log('Starting Code Execution Contract Test Suite');
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
    // -------------------------------------------------------------------------
    // TEST 1: GET /api/execution/config returns safe provider metadata
    // -------------------------------------------------------------------------
    const configRes = await fetch(`${BASE_URL}/config`);
    const configData = await configRes.json();
    assert(configRes.status === 200, 'GET /api/execution/config returns HTTP 200');
    assert(configData.status === 'success', 'Response status is success');
    assert(Array.isArray(configData.config?.supportedLanguages), 'Includes supportedLanguages array');
    assert(
      configData.config.supportedLanguages.some((l) => l.id === 'javascript') &&
      configData.config.supportedLanguages.some((l) => l.id === 'python'),
      'Identifies JavaScript and Python as supported runtimes'
    );
    assert(
      typeof configData.config?.defaultResourceLimits?.cpuTimeLimitSeconds === 'number',
      'Includes defaultResourceLimits'
    );
    assert(
      Boolean(configData.config?.securityNotice),
      'Exposes security notice prohibiting web server execution'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Validate executionId generator
    // -------------------------------------------------------------------------
    const execId = generateExecutionId();
    assert(
      execId.startsWith('exec_'),
      'Generated executionId has "exec_" prefix',
      `Got ${execId}`
    );
    assert(
      execId.length >= 15,
      'Generated executionId contains timestamp and entropy'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Validation: Rejects missing code
    // -------------------------------------------------------------------------
    const missingCodeRes = await fetch(`${BASE_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'javascript',
      }),
    });
    const missingCodeData = await missingCodeRes.json();
    assert(missingCodeRes.status === 400, 'Rejects missing code with HTTP 400');
    assert(missingCodeData.message.includes('code'), 'Error message specifies code is required');

    // -------------------------------------------------------------------------
    // TEST 4: Validation: Rejects unsupported language
    // -------------------------------------------------------------------------
    const unsupportedLangRes = await fetch(`${BASE_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'puts "Hello"',
        language: 'ruby',
      }),
    });
    const unsupportedLangData = await unsupportedLangRes.json();
    assert(unsupportedLangRes.status === 400, 'Rejects unsupported language with HTTP 400');
    assert(
      unsupportedLangData.message.includes('ruby'),
      'Error message identifies rejected language'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Validation: Rejects oversized source code (> 64 KB)
    // -------------------------------------------------------------------------
    const oversizedCode = 'a'.repeat(70000);
    const oversizedRes = await fetch(`${BASE_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: oversizedCode,
        language: 'javascript',
      }),
    });
    assert(oversizedRes.status === 400, 'Rejects code exceeding 64KB with HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 6: CRITICAL INVARIANT: Unconfigured sandbox does NOT simulate success
    // -------------------------------------------------------------------------
    const unconfiguredRunRes = await fetch(`${BASE_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'function add(a, b) { return a + b; }',
        language: 'javascript',
      }),
    });
    const unconfiguredRunData = await unconfiguredRunRes.json();
    assert(unconfiguredRunRes.status === 200, 'POST /api/execution/run returns HTTP 200 response envelope');
    assert(
      unconfiguredRunData.execution?.status === 'UNCONFIGURED',
      'CRITICAL: Execution status is UNCONFIGURED, not fake SUCCESS',
      `Got ${unconfiguredRunData.execution?.status}`
    );
    assert(
      unconfiguredRunData.execution?.statusCode === 99,
      'Status code reflects unconfigured judge (99)'
    );
    assert(
      unconfiguredRunData.execution?.error?.code === 'EXECUTION_PROVIDER_UNCONFIGURED',
      'Provides structured error code EXECUTION_PROVIDER_UNCONFIGURED'
    );
    assert(
      Array.isArray(unconfiguredRunData.execution?.error?.configurationGuide?.requiredEnvVars),
      'Provides required environment variables documentation in response'
    );

    // -------------------------------------------------------------------------
    // TEST 7: Response Contract Schema Conformance
    // -------------------------------------------------------------------------
    const exec = unconfiguredRunData.execution;
    assert(typeof exec.executionId === 'string' && exec.executionId.startsWith('exec_'), 'Contains executionId');
    assert(typeof exec.language === 'string', 'Contains language identifier');
    assert(typeof exec.stdout === 'string', 'Contains stdout field');
    assert(typeof exec.stderr === 'string', 'Contains stderr field');
    assert(typeof exec.durationMs === 'number', 'Contains durationMs');
    assert(typeof exec.resourceLimits === 'object', 'Contains resourceLimits object');
    assert(typeof exec.executedAt === 'string', 'Contains executedAt ISO timestamp');
    assert(typeof exec.provider === 'string', 'Contains provider identifier');

    // -------------------------------------------------------------------------
    // TEST 8: Dedicated Service Adapter Pluggability Test
    // -------------------------------------------------------------------------
    class MockRemoteJudgeAdapter extends ExecutionAdapter {
      constructor() {
        super('mock-remote-judge');
      }
      async execute({ executionId, language, resourceLimits }) {
        return {
          executionId,
          status: EXECUTION_STATUS.SUCCESS,
          statusCode: 3,
          language,
          stdout: 'Remote sandbox executed output\n',
          stderr: '',
          compileOutput: null,
          exitCode: 0,
          exitSignal: null,
          durationMs: 45,
          memoryUsedKb: 15420,
          resourceLimits,
          provider: 'mock-remote-judge',
          executedAt: new Date().toISOString(),
          error: null,
        };
      }
      getStatus() {
        return { provider: 'mock-remote-judge', configured: true, ready: true };
      }
    }

    resetExecutionProvider(new MockRemoteJudgeAdapter());
    const mockExecution = await submitCodeExecution({
      code: 'print("Hello from remote sandbox")',
      language: 'python',
    });
    assert(
      mockExecution.provider === 'mock-remote-judge',
      'Service adapter pattern delegates execution to configured adapter'
    );
    assert(
      mockExecution.stdout === 'Remote sandbox executed output\n',
      'Adapter returns standardized remote sandbox output'
    );
    assert(
      mockExecution.status === 'SUCCESS' && mockExecution.durationMs === 45,
      'Standardized contract preserved across adapters'
    );

    // Restore unconfigured adapter
    resetExecutionProvider(null);

    // -------------------------------------------------------------------------
    // TEST 9: Judge0Adapter Authentication Header Building
    // -------------------------------------------------------------------------
    const { Judge0Adapter } = await import('../services/execution/Judge0Adapter.js');

    // RapidAPI configuration
    const rapidAdapter = new Judge0Adapter({
      apiUrl: 'https://judge0-ce.p.rapidapi.com',
      apiKey: 'rapid-secret-key-12345',
    });
    const rapidHeaders = rapidAdapter.getAuthHeaders();
    assert(rapidHeaders['X-RapidAPI-Key'] === 'rapid-secret-key-12345', 'RapidAPI adapter sets X-RapidAPI-Key');
    assert(rapidHeaders['X-RapidAPI-Host'] === 'judge0-ce.p.rapidapi.com', 'RapidAPI adapter sets X-RapidAPI-Host');
    assert(rapidAdapter.getStatus().authType === 'rapidapi', 'RapidAPI adapter identifies authType as rapidapi');
    assert(rapidAdapter.getStatus().apiKey === undefined, 'CRITICAL: getStatus() NEVER leaks apiKey');

    // Self-hosted token configuration
    const selfHostedAdapter = new Judge0Adapter({
      apiUrl: 'http://judge0.internal:2358',
      apiKey: 'custom-judge-token-99',
      apiUser: 'judge_admin',
    });
    const selfHeaders = selfHostedAdapter.getAuthHeaders();
    assert(selfHeaders['X-Auth-Token'] === 'custom-judge-token-99', 'Self-hosted adapter sets X-Auth-Token');
    assert(selfHeaders['X-Auth-User'] === 'judge_admin', 'Self-hosted adapter sets X-Auth-User');
    assert(selfHostedAdapter.getStatus().authType === 'token', 'Self-hosted adapter identifies authType as token');

    // -------------------------------------------------------------------------
    // TEST 10: Judge0Adapter Polling Mechanism Simulation
    // -------------------------------------------------------------------------
    // Create an adapter that simulates Judge0's async token queue + polling completion
    let pollCount = 0;
    const pollingMockAdapter = new Judge0Adapter({
      apiUrl: 'http://mock-judge0.test',
      initialPollIntervalMs: 50,
      maxPollIntervalMs: 100,
    });

    // Mock fetchWithRetry to simulate:
    // 1st call (POST /submissions): returns token with status In Queue (1)
    // 2nd call (GET /submissions/token-123): returns status Processing (2)
    // 3rd call (GET /submissions/token-123): returns status Accepted (3) with stdout base64
    pollingMockAdapter.fetchWithRetry = async (url, options) => {
      if (options.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({ token: 'mock-token-xyz', status_id: 1 }),
        };
      }
      pollCount++;
      if (pollCount === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ token: 'mock-token-xyz', status_id: 2 }), // Processing
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          token: 'mock-token-xyz',
          status_id: 3, // Accepted
          stdout: Buffer.from('42\n').toString('base64'),
          stderr: null,
          time: '0.045',
          memory: 12500,
          exit_code: 0,
        }),
      };
    };

    const polledResult = await pollingMockAdapter.execute({
      executionId: 'exec_test_poll_1',
      code: 'console.log(42);',
      language: 'javascript',
      resourceLimits: { wallTimeLimitSeconds: 5, cpuTimeLimitSeconds: 2, maxOutputLengthBytes: 1024 },
    });

    assert(pollCount >= 2, 'Polling loop queried status until completion');
    assert(polledResult.status === 'SUCCESS', 'Polling completed with status SUCCESS');
    assert(polledResult.stdout.trim() === '42', 'Normalized Base64 stdout correctly decoded');
    assert(polledResult.durationMs === 45, 'Time scaled from seconds to durationMs (45ms)');
    assert(polledResult.memoryUsedKb === 12500, 'Preserved memoryUsedKb');

    // -------------------------------------------------------------------------
    // TEST 11: Judge0Adapter Authentication Failure Handling (HTTP 401/403)
    // -------------------------------------------------------------------------
    const authFailAdapter = new Judge0Adapter({
      apiUrl: 'http://mock-judge0.test',
      apiKey: 'invalid-key',
    });
    authFailAdapter.fetchWithRetry = async () => {
      const authErr = new Error('Judge0 authentication failed with HTTP 401.');
      authErr.isAuthError = true;
      throw authErr;
    };

    const authFailResult = await authFailAdapter.execute({
      executionId: 'exec_test_auth_fail',
      code: 'print("test")',
      language: 'python',
      resourceLimits: { wallTimeLimitSeconds: 5, cpuTimeLimitSeconds: 2, maxOutputLengthBytes: 1024 },
    });

    assert(authFailResult.status === 'INTERNAL_ERROR', 'Authentication error returns INTERNAL_ERROR status');
    assert(authFailResult.error?.code === 'PROVIDER_AUTH_FAILED', 'Structured error code PROVIDER_AUTH_FAILED');
    assert(authFailResult.error?.message.includes('JUDGE0_API_KEY'), 'Diagnostic mentions checking JUDGE0_API_KEY');
    assert(!JSON.stringify(authFailResult).includes('invalid-key'), 'CRITICAL: Response does NOT leak the API key');

    // -------------------------------------------------------------------------
    // TEST 12: Judge0Adapter Connection Failure Handling
    // -------------------------------------------------------------------------
    const connFailAdapter = new Judge0Adapter({
      apiUrl: 'http://invalid-unreachable-host:9999',
    });
    connFailAdapter.fetchWithRetry = async () => {
      throw new Error('fetch failed: connect ECONNREFUSED');
    };

    const connFailResult = await connFailAdapter.execute({
      executionId: 'exec_test_conn_fail',
      code: 'console.log("hello")',
      language: 'javascript',
      resourceLimits: { wallTimeLimitSeconds: 5, cpuTimeLimitSeconds: 2, maxOutputLengthBytes: 1024 },
    });

    assert(connFailResult.status === 'INTERNAL_ERROR', 'Connection failure returns INTERNAL_ERROR status');
    assert(connFailResult.error?.code === 'PROVIDER_CONNECTION_FAILED', 'Structured code PROVIDER_CONNECTION_FAILED');

    // -------------------------------------------------------------------------
    // TEST 13: POST /api/problems/:slug/run endpoint
    // -------------------------------------------------------------------------
    const problemRunRes = await fetch('http://localhost:3000/api/problems/two-sum/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'function twoSum(nums, target) { return [0, 1]; }',
        language: 'javascript',
      }),
    });
    const problemRunData = await problemRunRes.json();
    assert(problemRunRes.status === 200, 'POST /api/problems/:slug/run returns HTTP 200');
    assert(problemRunData.status === 'success', 'Response status is success');
    assert(problemRunData.execution?.problemSlug === 'two-sum', 'Execution identifies problemSlug');

    // -------------------------------------------------------------------------
    // TEST 14: POST /api/problems/:slug/submit evaluates and protects hidden tests
    // -------------------------------------------------------------------------
    const submitRes = await fetch('http://localhost:3000/api/problems/two-sum/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'function twoSum(nums, target) { return [0, 1]; }',
        language: 'javascript',
      }),
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 200, 'POST /api/problems/:slug/submit returns HTTP 200');
    assert(submitData.status === 'success', 'Submission evaluation status is success');
    assert(submitData.evaluation?.isSubmit === true, 'Submission evaluation flagged as isSubmit');
    assert(submitData.evaluation?.hiddenTestsTotal > 0, 'Identifies hidden test cases count');

    // CRITICAL SECURITY INVARIANT:
    // Hidden test cases must never expose secret input or expectedOutput in the response!
    const stringifiedEvaluation = JSON.stringify(submitData.evaluation);
    assert(
      !stringifiedEvaluation.includes('tc_hidden_3_secret_leak'),
      'CRITICAL: Secret hidden test cases do not leak unredacted data'
    );
    assert(
      submitData.evaluation?.status !== 'SUCCESS',
      'CRITICAL: Unexecuted or unverified submission is NEVER marked as SUCCESS'
    );

    // -------------------------------------------------------------------------
    // TEST 15: Rejects missing code on /api/problems/:slug/run with HTTP 400
    // -------------------------------------------------------------------------
    const noCodeProblemRes = await fetch('http://localhost:3000/api/problems/two-sum/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: '   ',
        language: 'javascript',
      }),
    });
    assert(noCodeProblemRes.status === 400, 'Rejects empty code on problem run with HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 16: Non-existent problem on /api/problems/:slug/run returns HTTP 404
    // -------------------------------------------------------------------------
    const notFoundProblemRes = await fetch('http://localhost:3000/api/problems/non-existent-problem/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'function test() {}',
        language: 'javascript',
      }),
    });
    assert(notFoundProblemRes.status === 404, 'Non-existent problem returns HTTP 404');

    // -------------------------------------------------------------------------
    // TEST 17: Custom test input execution via POST /api/problems/:slug/run
    // -------------------------------------------------------------------------
    const customInputRes = await fetch('http://localhost:3000/api/problems/two-sum/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'function twoSum(nums, target) { return [0, 1]; }',
        language: 'javascript',
        customStdin: JSON.stringify({ nums: [11, 15, 2, 7], target: 9 }),
      }),
    });
    const customInputData = await customInputRes.json();
    assert(customInputRes.status === 200, 'Custom input run returns HTTP 200');
    assert(customInputData.execution?.isCustomInput === true, 'Execution recognizes custom input');

    // -------------------------------------------------------------------------
    // TEST 18: Duplicate submission prevention guard
    // -------------------------------------------------------------------------
    const uniqueCode = `function twoSum(nums, target) { return [0, 1]; /* ${Date.now()} */ }`;
    const firstSubmit = await fetch('http://localhost:3000/api/problems/two-sum/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: uniqueCode,
        language: 'javascript',
      }),
    });
    const firstSubmitData = await firstSubmit.json();
    assert(firstSubmit.status === 200, 'First submission returns HTTP 200');
    assert(Boolean(firstSubmitData.submission?.id), 'First submission assigned a submission ID');

    // Immediate duplicate submission of identical code within 5 seconds
    const duplicateSubmit = await fetch('http://localhost:3000/api/problems/two-sum/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: uniqueCode,
        language: 'javascript',
      }),
    });
    const duplicateSubmitData = await duplicateSubmit.json();
    assert(duplicateSubmit.status === 200, 'Duplicate submission returns HTTP 200');
    assert(duplicateSubmitData.isDuplicate === true, 'Duplicate guard flags duplicate submission');
    assert(
      duplicateSubmitData.submission?.id === firstSubmitData.submission?.id,
      'Duplicate submission returns existing recorded submission'
    );

    // -------------------------------------------------------------------------
    // TEST 19: Submission history endpoint GET /api/problems/:slug/submissions
    // -------------------------------------------------------------------------
    const historyRes = await fetch('http://localhost:3000/api/problems/two-sum/submissions');
    const historyData = await historyRes.json();
    assert(historyRes.status === 200, 'GET /api/problems/:slug/submissions returns HTTP 200');
    assert(Array.isArray(historyData.submissions), 'Returns submissions array');
    assert(historyData.submissions.length > 0, 'History contains recorded submission');
    assert(
      historyData.submissions.some((s) => s.id === firstSubmitData.submission?.id),
      'History includes newly recorded submission record'
    );

    // -------------------------------------------------------------------------
    // TEST 20: Mock Judge Workflow: Successful execution returns ACCEPTED verdict
    // -------------------------------------------------------------------------
    const { executeProblemTestSuite } = await import('../services/execution/problemRunner.js');
    class MockAcceptedJudge extends ExecutionAdapter {
      constructor() {
        super('mock-accepted-judge');
      }
      async execute({ executionId, language, expectedOutput, resourceLimits }) {
        return {
          executionId,
          status: EXECUTION_STATUS.SUCCESS,
          statusCode: 3,
          language,
          stdout: expectedOutput || '[0, 1]', // Matches expectedOutput for twoSum test cases
          stderr: '',
          compileOutput: null,
          exitCode: 0,
          exitSignal: null,
          durationMs: 32,
          memoryUsedKb: 14200,
          resourceLimits,
          provider: 'mock-accepted-judge',
          executedAt: new Date().toISOString(),
          error: null,
        };
      }
      getStatus() {
        return { provider: 'mock-accepted-judge', configured: true, ready: true };
      }
    }

    resetExecutionProvider(new MockAcceptedJudge());
    const acceptedEval = await executeProblemTestSuite({
      problemSlug: 'two-sum',
      code: 'function twoSum(nums, target) { return [0, 1]; }',
      language: 'javascript',
      isSubmit: true,
    });

    assert(acceptedEval.status === 'ACCEPTED', 'All passing tests evaluates to ACCEPTED verdict');
    assert(acceptedEval.allPassed === true, 'Flagged as allPassed: true');
    assert(acceptedEval.passedTests === acceptedEval.totalTests, 'All test fixtures marked passed');

    // -------------------------------------------------------------------------
    // TEST 21: Mock Judge Workflow: Failed assertion returns WRONG_ANSWER verdict
    // -------------------------------------------------------------------------
    class MockWrongAnswerJudge extends ExecutionAdapter {
      constructor() {
        super('mock-wa-judge');
      }
      async execute({ executionId, language, resourceLimits }) {
        return {
          executionId,
          status: EXECUTION_STATUS.SUCCESS,
          statusCode: 3,
          language,
          stdout: '[999, 888]', // Wrong output
          stderr: '',
          compileOutput: null,
          exitCode: 0,
          durationMs: 28,
          resourceLimits,
          provider: 'mock-wa-judge',
          executedAt: new Date().toISOString(),
        };
      }
      getStatus() {
        return { provider: 'mock-wa-judge', configured: true, ready: true };
      }
    }

    resetExecutionProvider(new MockWrongAnswerJudge());
    const waEval = await executeProblemTestSuite({
      problemSlug: 'two-sum',
      code: 'function twoSum() { return [999, 888]; }',
      language: 'javascript',
      isSubmit: true,
    });

    assert(waEval.status === 'WRONG_ANSWER', 'Mismatched output evaluates to WRONG_ANSWER verdict');
    assert(waEval.allPassed === false, 'allPassed is false on output mismatch');

    // -------------------------------------------------------------------------
    // TEST 22: Mock Judge Workflow: Compilation Error verdict
    // -------------------------------------------------------------------------
    class MockCompileErrJudge extends ExecutionAdapter {
      constructor() {
        super('mock-ce-judge');
      }
      async execute({ executionId, language, resourceLimits }) {
        return {
          executionId,
          status: EXECUTION_STATUS.COMPILATION_ERROR,
          statusCode: 6,
          language,
          stdout: '',
          stderr: 'SyntaxError: Unexpected token',
          compileOutput: 'SyntaxError: Unexpected token',
          exitCode: 1,
          durationMs: 15,
          resourceLimits,
          provider: 'mock-ce-judge',
          executedAt: new Date().toISOString(),
        };
      }
      getStatus() {
        return { provider: 'mock-ce-judge', configured: true, ready: true };
      }
    }

    resetExecutionProvider(new MockCompileErrJudge());
    const ceEval = await executeProblemTestSuite({
      problemSlug: 'two-sum',
      code: 'invalid syntax {{{',
      language: 'javascript',
      isSubmit: true,
    });
    assert(ceEval.status === 'COMPILATION_ERROR', 'Syntax/compiler failure returns COMPILATION_ERROR verdict');

    // -------------------------------------------------------------------------
    // TEST 23: Mock Judge Workflow: Runtime Error verdict
    // -------------------------------------------------------------------------
    class MockRuntimeErrJudge extends ExecutionAdapter {
      constructor() {
        super('mock-re-judge');
      }
      async execute({ executionId, language, resourceLimits }) {
        return {
          executionId,
          status: EXECUTION_STATUS.RUNTIME_ERROR,
          statusCode: 11,
          language,
          stdout: '',
          stderr: 'TypeError: Cannot read properties of undefined',
          exitCode: 1,
          durationMs: 20,
          resourceLimits,
          provider: 'mock-re-judge',
          executedAt: new Date().toISOString(),
        };
      }
      getStatus() {
        return { provider: 'mock-re-judge', configured: true, ready: true };
      }
    }

    resetExecutionProvider(new MockRuntimeErrJudge());
    const reEval = await executeProblemTestSuite({
      problemSlug: 'two-sum',
      code: 'function twoSum() { throw new Error("fatal"); }',
      language: 'javascript',
      isSubmit: true,
    });
    assert(reEval.status === 'RUNTIME_ERROR', 'Runtime exception returns RUNTIME_ERROR verdict');

    // -------------------------------------------------------------------------
    // TEST 24: Mock Judge Workflow: Time Limit Exceeded verdict
    // -------------------------------------------------------------------------
    class MockTleJudge extends ExecutionAdapter {
      constructor() {
        super('mock-tle-judge');
      }
      async execute({ executionId, language, resourceLimits }) {
        return {
          executionId,
          status: EXECUTION_STATUS.TIME_LIMIT_EXCEEDED,
          statusCode: 5,
          language,
          stdout: '',
          stderr: 'Time limit exceeded',
          durationMs: 5001,
          resourceLimits,
          provider: 'mock-tle-judge',
          executedAt: new Date().toISOString(),
        };
      }
      getStatus() {
        return { provider: 'mock-tle-judge', configured: true, ready: true };
      }
    }

    resetExecutionProvider(new MockTleJudge());
    const tleEval = await executeProblemTestSuite({
      problemSlug: 'two-sum',
      code: 'while (true) {}',
      language: 'javascript',
      isSubmit: true,
    });
    assert(tleEval.status === 'TIME_LIMIT_EXCEEDED', 'Infinite loop returns TIME_LIMIT_EXCEEDED verdict');

    // -------------------------------------------------------------------------
    // TEST 25: Mock Judge Workflow: Internal Judge Error verdict
    // -------------------------------------------------------------------------
    class MockInternalErrJudge extends ExecutionAdapter {
      constructor() {
        super('mock-internal-judge');
      }
      async execute({ executionId, language, resourceLimits }) {
        return {
          executionId,
          status: EXECUTION_STATUS.INTERNAL_ERROR,
          statusCode: 13,
          language,
          stdout: '',
          stderr: 'Internal sandbox error',
          durationMs: 10,
          resourceLimits,
          provider: 'mock-internal-judge',
          executedAt: new Date().toISOString(),
          error: { message: 'Docker daemon communication failure' },
        };
      }
      getStatus() {
        return { provider: 'mock-internal-judge', configured: true, ready: true };
      }
    }

    resetExecutionProvider(new MockInternalErrJudge());
    const internalEval = await executeProblemTestSuite({
      problemSlug: 'two-sum',
      code: 'function test() {}',
      language: 'javascript',
      isSubmit: true,
    });
    assert(internalEval.status === 'INTERNAL_ERROR', 'Judge failure returns INTERNAL_ERROR verdict');

    // Restore unconfigured adapter
    resetExecutionProvider(null);

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
