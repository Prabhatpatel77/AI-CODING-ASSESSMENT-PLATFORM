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
