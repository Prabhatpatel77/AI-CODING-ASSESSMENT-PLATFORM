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
