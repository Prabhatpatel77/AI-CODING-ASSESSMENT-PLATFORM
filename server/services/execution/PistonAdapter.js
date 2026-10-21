/**
 * Piston Code Execution Adapter
 * Interfaces with EngineerMan/Piston isolated execution engine.
 *
 * Implements:
 * - Provider authentication (optional header/token)
 * - Per-request AbortController timeouts and controlled transient retries
 * - Handling of public API whitelist / quota notices
 * - Output normalization and status code mapping
 * - Safe status inspection without leaking secrets
 */

import { ExecutionAdapter } from './ExecutionAdapter.js';
import {
  SUPPORTED_LANGUAGES,
  EXECUTION_STATUS,
  EXECUTION_STATUS_CODES,
  EXECUTION_ERROR_CODES,
  createExecutionResponse,
} from '../../contracts/executionContract.js';

function sanitizeEndpointUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const parsed = new URL(urlStr);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    return urlStr.replace(/\/+$/, '');
  }
}

export class PistonAdapter extends ExecutionAdapter {
  constructor({
    apiUrl,
    apiKey = null,
    requestTimeoutMs = 12000,
  } = {}) {
    super('piston');
    this.apiUrl = (apiUrl || '').replace(/\/+$/, '');
    this.apiKey = apiKey || null;
    this.requestTimeoutMs = requestTimeoutMs;
  }

  getStatus() {
    const isConfigured = Boolean(this.apiUrl);
    return {
      provider: 'piston',
      configured: isConfigured,
      ready: isConfigured,
      endpoint: isConfigured ? sanitizeEndpointUrl(this.apiUrl) : null,
      authType: this.apiKey ? 'token' : 'none',
      pollingSupported: false,
    };
  }

  async fetchWithRetry(url, options = {}, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
          const delay = Math.min(300 * Math.pow(2, attempt) + Math.random() * 100, 2000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;

        if (attempt < maxRetries) {
          const delay = Math.min(300 * Math.pow(2, attempt) + Math.random() * 100, 2000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Network request failed after ${maxRetries} retries.`);
  }

  async execute({ executionId, code, language, stdin, resourceLimits }) {
    if (!this.apiUrl) {
      return createExecutionResponse({
        executionId,
        status: EXECUTION_STATUS.UNCONFIGURED,
        statusCode: EXECUTION_STATUS_CODES.UNCONFIGURED,
        language,
        durationMs: 0,
        resourceLimits,
        provider: 'piston',
        error: {
          code: EXECUTION_ERROR_CODES.EXECUTION_PROVIDER_UNCONFIGURED,
          message: 'Piston API URL is not configured in server environment variables.',
        },
      });
    }

    const langConfig = SUPPORTED_LANGUAGES[language];
    if (!langConfig || !langConfig.pistonLanguage) {
      throw new Error(`Piston does not have a mapped language for '${language}'.`);
    }

    const startTime = Date.now();
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['x-api-key'] = this.apiKey;
    }

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

    let response;
    try {
      response = await this.fetchWithRetry(`${this.apiUrl}/execute`, {
        method: 'POST',
        headers,
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
          code: EXECUTION_ERROR_CODES.PROVIDER_CONNECTION_FAILED,
          message: `Unable to reach Piston execution provider at ${sanitizeEndpointUrl(this.apiUrl)}: ${fetchErr.message}`,
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
          message: `Piston returned HTTP ${response.status}: ${errText.slice(0, 300)}`,
        },
      });
    }

    const data = await response.json();

    // Check if Piston returned a service message (e.g., whitelist notice)
    if (data.message && !data.run) {
      return createExecutionResponse({
        executionId,
        status: EXECUTION_STATUS.INTERNAL_ERROR,
        statusCode: EXECUTION_STATUS_CODES.INTERNAL_ERROR,
        language,
        durationMs: Date.now() - startTime,
        resourceLimits,
        provider: 'piston',
        error: {
          code: EXECUTION_ERROR_CODES.PROVIDER_AUTH_FAILED,
          message: `Piston service notice: ${data.message}`,
        },
      });
    }

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
