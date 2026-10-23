/**
 * Problem Test Suite Execution Engine
 * Orchestrates running student solutions against problem test cases in the isolated sandbox.
 *
 * Enforces:
 * - Server-side test execution in remote ephemeral containers
 * - Complete redaction of hidden test case inputs and expected outputs
 * - Deep output comparison (structural JSON and primitive equality)
 * - Honest unconfigured state reporting when no sandbox is present
 * - Strict prohibition of client-side test case evaluation
 */

import { getExecutionProvider } from './index.js';
import { findProblemForEvaluation } from '../problemRepository.js';
import {
  EXECUTION_STATUS,
  EXECUTION_STATUS_CODES,
  EXECUTION_ERROR_CODES,
  generateExecutionId,
} from '../../contracts/executionContract.js';

/**
 * Extracts candidate function name from starter code or problem slug
 *
 * @param {string} slug
 * @param {string} starterCode
 * @param {string} language
 * @returns {string} Function name
 */
function extractFunctionName(slug, starterCode = '', language = 'javascript') {
  if (language === 'javascript') {
    const match = starterCode.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
    if (match) return match[1];
  } else if (language === 'python') {
    const match = starterCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
    if (match) return match[1];
  }

  // Fallback to camelCase of slug
  return slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Wraps user solution with a harness that ingests JSON test case input from stdin
 * and outputs serialized return value to stdout.
 *
 * @param {string} code
 * @param {string} language
 * @param {string} fnName
 * @returns {string} Instrumented code for remote sandbox
 */
function wrapCodeWithHarness(code, language, fnName) {
  if (language === 'javascript') {
    return `
${code}

// --- SECURE REMOTE EVALUATION HARNESS ---
(function() {
  const fs = require('fs');
  try {
    const rawInput = fs.readFileSync(0, 'utf8').trim();
    if (!rawInput) return;
    const inputObj = JSON.parse(rawInput);
    let targetFn = typeof ${fnName} === 'function' ? ${fnName} : null;
    if (!targetFn && typeof Solution === 'function') {
      const inst = new Solution();
      if (typeof inst.${fnName} === 'function') targetFn = inst.${fnName}.bind(inst);
    }
    if (!targetFn) {
      console.error("Function '${fnName}' not found in submitted solution.");
      process.exit(1);
    }
    const args = Array.isArray(inputObj) ? inputObj : Object.values(inputObj);
    const result = targetFn(...args);
    process.stdout.write(JSON.stringify(result));
  } catch (err) {
    console.error(err.message || String(err));
    process.exit(1);
  }
})();
`;
  }

  if (language === 'python') {
    return `
import sys
import json

${code}

# --- SECURE REMOTE EVALUATION HARNESS ---
if __name__ == '__main__':
    try:
        raw_input = sys.stdin.read().strip()
        if raw_input:
            input_obj = json.loads(raw_input)
            target_fn = None
            if '${fnName}' in globals():
                target_fn = globals()['${fnName}']
            elif 'Solution' in globals():
                sol = Solution()
                if hasattr(sol, '${fnName}'):
                    target_fn = getattr(sol, '${fnName}')
            
            if target_fn is None:
                sys.stderr.write("Function '${fnName}' not found in submitted solution.\\n")
                sys.exit(1)
            
            if isinstance(input_obj, list):
                result = target_fn(*input_obj)
            elif isinstance(input_obj, dict):
                result = target_fn(*input_obj.values())
            else:
                result = target_fn(input_obj)
            
            sys.stdout.write(json.dumps(result))
    except Exception as e:
        sys.stderr.write(str(e) + "\\n")
        sys.exit(1)
`;
  }

  return code;
}

/**
 * Deep compares actual output against expected output
 *
 * @param {any} actual
 * @param {any} expected
 * @returns {boolean}
 */
function areOutputsEqual(actual, expected) {
  if (actual === expected) return true;
  if (actual === null || expected === null) return actual === expected;
  if (actual === undefined || expected === undefined) return actual === expected;

  // Numerical comparison (e.g. floats)
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) < 1e-6;
  }

  // Object / Array structural comparison
  try {
    const actualNormalized = typeof actual === 'string' ? JSON.parse(actual) : actual;
    const expectedNormalized = typeof expected === 'string' ? JSON.parse(expected) : expected;

    // Array order sensitivity check (unless both are arrays of numbers representing sets)
    return JSON.stringify(actualNormalized) === JSON.stringify(expectedNormalized);
  } catch {
    return String(actual).trim() === String(expected).trim();
  }
}

/**
 * Evaluates a student solution against problem test fixtures.
 *
 * @param {Object} options
 * @param {string} options.problemSlug
 * @param {string} options.code
 * @param {string} options.language
 * @param {boolean} [options.isSubmit=false] Whether to run hidden test cases
 * @param {Object} [options.resourceLimits]
 * @returns {Promise<Object>} Evaluation summary
 */
export async function executeProblemTestSuite({
  problemSlug,
  code,
  language = 'javascript',
  isSubmit = false,
  customStdin,
  resourceLimits = {},
}) {
  const problem = await findProblemForEvaluation(problemSlug);
  if (!problem) {
    const notFoundError = new Error(`Problem '${problemSlug}' not found or not published.`);
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const provider = getExecutionProvider();
  const providerStatus = provider.getStatus();

  // If the isolated execution engine is not configured, return honest diagnostic
  if (!providerStatus.configured) {
    const unconfiguredExecId = generateExecutionId();
    const hasCustomInput = !isSubmit && customStdin !== null && customStdin !== undefined && String(customStdin).trim() !== '';
    return {
      executionId: unconfiguredExecId,
      status: EXECUTION_STATUS.UNCONFIGURED,
      statusCode: EXECUTION_STATUS_CODES.UNCONFIGURED,
      problemSlug: problem.slug,
      problemTitle: problem.title,
      isSubmit,
      isCustomInput: hasCustomInput,
      customInput: hasCustomInput ? String(customStdin) : null,
      totalTests: hasCustomInput ? 1 : (problem.testCases || []).length,
      passedTests: 0,
      testResults: [],
      hiddenTestsPassed: 0,
      hiddenTestsTotal: (problem.testCases || []).filter((tc) => tc.isHidden).length,
      durationMs: 0,
      provider: 'unconfigured',
      error: {
        code: EXECUTION_ERROR_CODES.EXECUTION_PROVIDER_UNCONFIGURED,
        message:
          'Remote isolated execution provider is unconfigured. Untrusted code cannot be executed on the web server.',
        configurationGuide: {
          recommendedProvider: 'Judge0 CE',
          requiredEnvVars: [
            'EXECUTION_PROVIDER="judge0"',
            'JUDGE0_API_URL="http://localhost:2358"',
            'JUDGE0_API_KEY=""',
          ],
        },
      },
    };
  }

  // If custom test input is provided by candidate for Run, execute against customStdin
  if (!isSubmit && customStdin !== null && customStdin !== undefined && String(customStdin).trim() !== '') {
    const fnName = extractFunctionName(problem.slug, problem.starterCode?.[language] || '', language);
    const instrumentedCode = wrapCodeWithHarness(code, language, fnName);

    const execResponse = await provider.execute({
      executionId: generateExecutionId(),
      code: instrumentedCode,
      language,
      stdin: String(customStdin),
      resourceLimits,
    });

    return {
      executionId: generateExecutionId(),
      status: execResponse.status,
      statusCode: execResponse.statusCode,
      problemSlug: problem.slug,
      problemTitle: problem.title,
      isCustomInput: true,
      customInput: String(customStdin),
      stdout: execResponse.stdout,
      stderr: execResponse.stderr,
      compileOutput: execResponse.compileOutput,
      durationMs: execResponse.durationMs,
      memoryUsedKb: execResponse.memoryUsedKb,
      provider: providerStatus.provider,
      evaluatedAt: new Date().toISOString(),
      testResults: [
        {
          testCaseNumber: 1,
          isHidden: false,
          passed: execResponse.status === EXECUTION_STATUS.SUCCESS,
          status: execResponse.status,
          inputStr: String(customStdin),
          stdout: execResponse.stdout,
          stderr: execResponse.stderr,
          durationMs: execResponse.durationMs,
        },
      ],
    };
  }

  // Select test suite: Submit runs all test cases; Run only runs visible fixtures
  const allCases = problem.testCases || [];
  const activeCases = isSubmit ? allCases : allCases.filter((tc) => !tc.isHidden);

  const fnName = extractFunctionName(problem.slug, problem.starterCode?.[language] || '', language);
  const instrumentedCode = wrapCodeWithHarness(code, language, fnName);

  const testResults = [];
  let totalDurationMs = 0;
  let peakMemoryKb = 0;
  let overallStatus = EXECUTION_STATUS.SUCCESS;

  for (let idx = 0; idx < activeCases.length; idx++) {
    const tc = activeCases[idx];
    const stdinPayload = typeof tc.input === 'object' ? JSON.stringify(tc.input) : String(tc.input);

    const execResponse = await provider.execute({
      executionId: generateExecutionId(),
      code: instrumentedCode,
      language,
      stdin: stdinPayload,
      expectedOutput: JSON.stringify(tc.expectedOutput),
      resourceLimits,
    });

    totalDurationMs += execResponse.durationMs || 0;
    if (execResponse.memoryUsedKb && execResponse.memoryUsedKb > peakMemoryKb) {
      peakMemoryKb = execResponse.memoryUsedKb;
    }

    let parsedActualOutput = null;
    let isPassed = false;

    if (execResponse.status === EXECUTION_STATUS.SUCCESS) {
      try {
        parsedActualOutput = JSON.parse(execResponse.stdout);
      } catch {
        parsedActualOutput = execResponse.stdout.trim();
      }
      isPassed = areOutputsEqual(parsedActualOutput, tc.expectedOutput);
      if (!isPassed && overallStatus === EXECUTION_STATUS.SUCCESS) {
        overallStatus = EXECUTION_STATUS.WRONG_ANSWER;
      }
    } else {
      isPassed = false;
      if (overallStatus === EXECUTION_STATUS.SUCCESS) {
        overallStatus = execResponse.status;
      }
    }

    // CRITICAL SECURITY ENFORCEMENT:
    // If the test fixture is hidden, NEVER expose input, expectedOutput, or raw stdout/stderr
    if (tc.isHidden) {
      testResults.push({
        testCaseId: tc.id || `tc_${idx + 1}`,
        testCaseNumber: idx + 1,
        isHidden: true,
        passed: isPassed,
        status: isPassed ? EXECUTION_STATUS.SUCCESS : execResponse.status === EXECUTION_STATUS.SUCCESS ? EXECUTION_STATUS.WRONG_ANSWER : execResponse.status,
        durationMs: execResponse.durationMs,
      });
    } else {
      testResults.push({
        testCaseId: tc.id || `tc_${idx + 1}`,
        testCaseNumber: idx + 1,
        isHidden: false,
        passed: isPassed,
        status: isPassed ? EXECUTION_STATUS.SUCCESS : execResponse.status === EXECUTION_STATUS.SUCCESS ? EXECUTION_STATUS.WRONG_ANSWER : execResponse.status,
        inputStr: tc.inputStr || JSON.stringify(tc.input),
        expectedOutput: tc.expectedOutput,
        actualOutput: parsedActualOutput,
        stdout: execResponse.stdout,
        stderr: execResponse.stderr,
        compileOutput: execResponse.compileOutput,
        durationMs: execResponse.durationMs,
      });
    }

    // Stop execution early on fatal compilation error
    if (execResponse.status === EXECUTION_STATUS.COMPILATION_ERROR) {
      break;
    }
  }

  const totalTests = activeCases.length;
  const passedTests = testResults.filter((r) => r.passed).length;
  const hiddenCases = activeCases.filter((tc) => tc.isHidden);
  const hiddenPassed = testResults.filter((r) => r.isHidden && r.passed).length;

  const finalStatus = isSubmit && overallStatus === EXECUTION_STATUS.SUCCESS ? 'ACCEPTED' : overallStatus;

  return {
    executionId: generateExecutionId(),
    status: finalStatus,
    statusCode: EXECUTION_STATUS_CODES[overallStatus] || 99,
    problemSlug: problem.slug,
    problemTitle: problem.title,
    isSubmit,
    totalTests,
    passedTests,
    allPassed: passedTests === totalTests,
    hiddenTestsTotal: hiddenCases.length,
    hiddenTestsPassed: hiddenPassed,
    durationMs: totalDurationMs,
    peakMemoryKb: peakMemoryKb || null,
    testResults,
    provider: providerStatus.provider,
    evaluatedAt: new Date().toISOString(),
  };
}
