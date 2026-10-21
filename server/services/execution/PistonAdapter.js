/**
 * Piston Code Execution Adapter
 * Interfaces with EngineerMan/Piston isolated execution engine.
 */

import { ExecutionAdapter } from './ExecutionAdapter.js';
import {
  SUPPORTED_LANGUAGES,
  EXECUTION_STATUS,
  EXECUTION_STATUS_CODES,
  createExecutionResponse,
} from '../../contracts/executionContract.js';

export class PistonAdapter extends ExecutionAdapter {
  constructor({ apiUrl }) {
    super('piston');
    this.apiUrl = (apiUrl || '').replace(/\/+$/, '');
  }

  getStatus() {
    return {
      provider: 'piston',
      configured: Boolean(this.apiUrl),
      ready: Boolean(this.apiUrl),
      endpoint: this.apiUrl ? this.apiUrl.replace(/\/+$/, '') : null,
    };
  }

  async execute({ executionId, code, language, stdin, resourceLimits }) {
    const langConfig = SUPPORTED_LANGUAGES[language];
    if (!langConfig || !langConfig.pistonLanguage) {
      throw new Error(`Piston does not have a mapped language for '${language}'.`);
    }

    const startTime = Date.now();
    let response;

    const payload = {
      language: langConfig.pistonLanguage,
      version: langConfig.pistonVersion || '*',
      files: [
        {
          name: `solution${langConfig.extension}`,
          content: code,
        },
      ],
      stdin: stdin || '',
      run_timeout: Math.round(resourceLimits.wallTimeLimitSeconds * 1000),
      compile_timeout: 10000,
    };

    try {
      response = await fetch(`${this.apiUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchErr) {
      return createExecutionResponse({
        executionId,
        status: EXECUTION_STATUS.INTERNAL_ERROR,
        statusCode: EXECUTION_STATUS_CODES.INTERNAL_ERROR,
        language,
        durationMs: Date.now() - startTime,
        resourceLimits,
        provider: 'piston',
        error: {
          code: 'PISTON_CONNECTION_FAILED',
          message: `Unable to reach Piston execution provider at ${this.apiUrl}: ${fetchErr.message}`,
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
        provider: 'piston',
        error: {
          code: `PISTON_HTTP_${response.status}`,
          message: `Piston returned HTTP ${response.status}: ${errText}`,
        },
      });
    }

    const data = await response.json();
    const runResult = data.run || {};
    const compileResult = data.compile || {};
    const durationMs = Date.now() - startTime;

    let status = EXECUTION_STATUS.SUCCESS;
    let statusCode = EXECUTION_STATUS_CODES.SUCCESS;

    if (compileResult.code !== undefined && compileResult.code !== 0) {
      status = EXECUTION_STATUS.COMPILATION_ERROR;
      statusCode = EXECUTION_STATUS_CODES.COMPILATION_ERROR;
    } else if (runResult.signal === 'SIGKILL' || runResult.signal === 'SIGXCPU') {
      status = EXECUTION_STATUS.TIME_LIMIT_EXCEEDED;
      statusCode = EXECUTION_STATUS_CODES.TIME_LIMIT_EXCEEDED;
    } else if (runResult.code !== 0) {
      status = EXECUTION_STATUS.RUNTIME_ERROR;
      statusCode = EXECUTION_STATUS_CODES.RUNTIME_ERROR;
    }

    return createExecutionResponse({
      executionId,
      status,
      statusCode,
      language,
      stdout: runResult.stdout || '',
      stderr: runResult.stderr || '',
      compileOutput: compileResult.stderr || compileResult.stdout || null,
      exitCode: runResult.code !== undefined ? runResult.code : null,
      exitSignal: runResult.signal || null,
      durationMs,
      memoryUsedKb: null,
      resourceLimits,
      provider: 'piston',
    });
  }
}
