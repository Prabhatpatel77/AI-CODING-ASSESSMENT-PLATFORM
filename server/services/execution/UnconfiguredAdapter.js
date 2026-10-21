/**
 * Unconfigured Execution Adapter
 * Default fallback when no remote isolated judge service is configured in environment variables.
 *
 * CRITICAL SECURITY INVARIANT:
 * This adapter explicitly DOES NOT run untrusted student code on the application web server
 * using eval, new Function, child_process, or worker_threads.
 * It DOES NOT fabricate simulated success metrics.
 */

import { ExecutionAdapter } from './ExecutionAdapter.js';
import {
  EXECUTION_STATUS,
  EXECUTION_STATUS_CODES,
  createExecutionResponse,
} from '../../contracts/executionContract.js';

export class UnconfiguredAdapter extends ExecutionAdapter {
  constructor() {
    super('unconfigured');
  }

  async execute({ executionId, code, language, stdin, resourceLimits }) {
    return createExecutionResponse({
      executionId,
      status: EXECUTION_STATUS.UNCONFIGURED,
      statusCode: EXECUTION_STATUS_CODES.UNCONFIGURED,
      language,
      stdout: '',
      stderr: '',
      compileOutput: null,
      exitCode: null,
      exitSignal: null,
      durationMs: 0,
      memoryUsedKb: null,
      resourceLimits,
      provider: 'unconfigured',
      error: {
        code: 'EXECUTION_PROVIDER_UNCONFIGURED',
        message:
          'Remote code execution service is not configured. To safely run code without executing untrusted processes on the web server, connect an isolated execution sandbox provider (Judge0 or Piston).',
        configurationGuide: {
          recommendedProvider: 'Judge0 CE (Docker or Cloud API)',
          requiredEnvVars: [
            'EXECUTION_PROVIDER="judge0"',
            'JUDGE0_API_URL="http://your-judge0-host:2358" (or https://judge0-ce.p.rapidapi.com)',
            'JUDGE0_API_KEY="your-api-key" (if using RapidAPI or authenticated endpoint)',
          ],
          alternativeProvider: 'Piston API',
          alternativeEnvVars: [
            'EXECUTION_PROVIDER="piston"',
            'PISTON_API_URL="http://your-piston-host:2000/api/v2"',
          ],
        },
      },
    });
  }

  getStatus() {
    return {
      provider: 'unconfigured',
      configured: false,
      ready: false,
      message:
        'No isolated execution provider configured. Student code is protected against local execution.',
    };
  }
}
