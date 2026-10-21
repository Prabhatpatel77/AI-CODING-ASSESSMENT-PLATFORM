/**
 * Judge0 Code Execution Adapter
 * Interfaces with an isolated Judge0 CE / RapidAPI microservice instance.
 * Executes student submissions inside isolated Docker / gVisor containers.
 */

import { ExecutionAdapter } from './ExecutionAdapter.js';
import {
  SUPPORTED_LANGUAGES,
  EXECUTION_STATUS,
  EXECUTION_STATUS_CODES,
  createExecutionResponse,
} from '../../contracts/executionContract.js';

export class Judge0Adapter extends ExecutionAdapter {
  constructor({ apiUrl, apiKey = null }) {
    super('judge0');
    this.apiUrl = (apiUrl || '').replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  getStatus() {
    return {
      provider: 'judge0',
      configured: Boolean(this.apiUrl),
      ready: Boolean(this.apiUrl),
      endpoint: this.apiUrl ? this.apiUrl.replace(/\/+$/, '') : null,
      authRequired: Boolean(this.apiKey),
    };
  }

  async execute({ executionId, code, language, stdin, expectedOutput, resourceLimits }) {
    const langConfig = SUPPORTED_LANGUAGES[language];
    if (!langConfig || !langConfig.judge0LanguageId) {
      throw new Error(`Judge0 does not have a mapped language ID for '${language}'.`);
    }

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.apiKey) {
      // Support RapidAPI or direct X-Auth headers
      if (this.apiUrl.includes('rapidapi.com')) {
        headers['X-RapidAPI-Key'] = this.apiKey;
        headers['X-RapidAPI-Host'] = new URL(this.apiUrl).host;
      } else {
        headers['X-Auth-Token'] = this.apiKey;
      }
    }

    const submissionPayload = {
      source_code: code,
      language_id: langConfig.judge0LanguageId,
      stdin: stdin || '',
      expected_output: expectedOutput || null,
      cpu_time_limit: resourceLimits.cpuTimeLimitSeconds,
      wall_time_limit: resourceLimits.wallTimeLimitSeconds,
      memory_limit: resourceLimits.memoryLimitMegabytes * 1024, // in KB
      stack_limit: resourceLimits.stackLimitMegabytes * 1024, // in KB
    };

    const startTime = Date.now();
    let response;

    try {
      response = await fetch(`${this.apiUrl}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify(submissionPayload),
      });
    } catch (fetchErr) {
      return createExecutionResponse({
        executionId,
        status: EXECUTION_STATUS.INTERNAL_ERROR,
        statusCode: EXECUTION_STATUS_CODES.INTERNAL_ERROR,
        language,
        durationMs: Date.now() - startTime,
        resourceLimits,
        provider: 'judge0',
        error: {
          code: 'JUDGE0_CONNECTION_FAILED',
          message: `Unable to reach Judge0 execution provider at ${this.apiUrl}: ${fetchErr.message}`,
        },
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      return createExecutionResponse({
        executionId,
        status: EXECUTION_STATUS.INTERNAL_ERROR,
        statusCode: EXECUTION_STATUS_CODES.INTERNAL_ERROR,
        language,
        durationMs: Date.now() - startTime,
        resourceLimits,
        provider: 'judge0',
        error: {
          code: `JUDGE0_HTTP_${response.status}`,
          message: `Judge0 returned HTTP ${response.status}: ${errText}`,
        },
      });
    }

    const data = await response.json();
    const durationMs = data.time !== null && data.time !== undefined ? Math.round(Number(data.time) * 1000) : Date.now() - startTime;
    const memoryUsedKb = data.memory !== null && data.memory !== undefined ? Number(data.memory) : null;

    // Map Judge0 Status
    let status = EXECUTION_STATUS.SUCCESS;
    const judgeStatusId = data.status?.id;

    if (judgeStatusId === 3) {
      status = EXECUTION_STATUS.SUCCESS;
    } else if (judgeStatusId === 4) {
      status = EXECUTION_STATUS.WRONG_ANSWER;
    } else if (judgeStatusId === 5) {
      status = EXECUTION_STATUS.TIME_LIMIT_EXCEEDED;
    } else if (judgeStatusId === 6) {
      status = EXECUTION_STATUS.COMPILATION_ERROR;
    } else if (judgeStatusId >= 7 && judgeStatusId <= 12) {
      status = EXECUTION_STATUS.RUNTIME_ERROR;
    } else {
      status = EXECUTION_STATUS.INTERNAL_ERROR;
    }

    return createExecutionResponse({
      executionId,
      status,
      statusCode: judgeStatusId,
      language,
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      compileOutput: data.compile_output || null,
      exitCode: data.exit_code,
      exitSignal: data.exit_signal ? String(data.exit_signal) : null,
      durationMs,
      memoryUsedKb,
      resourceLimits,
      provider: 'judge0',
      error: status === EXECUTION_STATUS.INTERNAL_ERROR ? { message: data.message || 'Judge0 execution error' } : null,
    });
  }
}
