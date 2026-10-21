/**
 * Judge0 Isolated Code Execution Adapter
 * Interfaces with Judge0 CE / RapidAPI microservice instances.
 * Executes student submissions inside isolated Docker / gVisor containers.
 *
 * Implements:
 * - Provider authentication via environment variables (RapidAPI headers or X-Auth-Token)
 * - Base64 encoded payload submission to prevent corruption
 * - Asynchronous submission + status polling loop with progressive backoff
 * - Per-request AbortController timeouts and controlled transient retries
 * - Output normalization (base64 decoding, output truncation, memory/duration scaling)
 * - Exhaustive status code and failure mapping
 * - Credential protection (never leaking API keys to client or error responses)
 */

import { ExecutionAdapter } from './ExecutionAdapter.js';
import {
  SUPPORTED_LANGUAGES,
  EXECUTION_STATUS,
  EXECUTION_STATUS_CODES,
  EXECUTION_ERROR_CODES,
  createExecutionResponse,
} from '../../contracts/executionContract.js';

/**
 * Helper to safely decode base64 strings returned by Judge0
 *
 * @param {string|null} str
 * @returns {string} Decoded UTF-8 string
 */
function decodeBase64(str) {
  if (!str || typeof str !== 'string') return '';
  try {
    return Buffer.from(str, 'base64').toString('utf8');
  } catch {
    return str;
  }
}

/**
 * Helper to safely encode strings to base64 for Judge0 submission
 *
 * @param {string|null} str
 * @returns {string} Base64 encoded string
 */
function encodeBase64(str) {
  if (str === null || str === undefined) return '';
  return Buffer.from(String(str), 'utf8').toString('base64');
}

/**
 * Sanitizes endpoint URL for safe diagnostic display without credentials
 *
 * @param {string} urlStr
 * @returns {string}
 */
function sanitizeEndpointUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const parsed = new URL(urlStr);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    return urlStr.replace(/\/+$/, '');
  }
}

export class Judge0Adapter extends ExecutionAdapter {
  constructor({
    apiUrl,
    apiKey = null,
    apiHost = null,
    apiUser = null,
    requestTimeoutMs = 10000,
    initialPollIntervalMs = 300,
    maxPollIntervalMs = 1000,
  } = {}) {
    super('judge0');
    this.apiUrl = (apiUrl || '').replace(/\/+$/, '');
    this.apiKey = apiKey || null;
    this.apiHost = apiHost || null;
    this.apiUser = apiUser || null;
    this.requestTimeoutMs = requestTimeoutMs;
    this.initialPollIntervalMs = initialPollIntervalMs;
    this.maxPollIntervalMs = maxPollIntervalMs;
  }

  /**
   * Returns safe provider operational status without exposing secrets.
   */
  getStatus() {
    const isConfigured = Boolean(this.apiUrl);
    const isRapidApi = Boolean(this.apiUrl && this.apiUrl.includes('rapidapi.com'));

    return {
      provider: 'judge0',
      configured: isConfigured,
      ready: isConfigured,
      endpoint: isConfigured ? sanitizeEndpointUrl(this.apiUrl) : null,
      authType: this.apiKey ? (isRapidApi ? 'rapidapi' : 'token') : 'none',
      base64Encoding: true,
      pollingSupported: true,
    };
  }

  /**
   * Builds provider authentication headers without leaking secrets into logs
   *
   * @returns {Object} Request headers
   */
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.apiKey) {
      if (this.apiUrl.includes('rapidapi.com') || this.apiHost) {
        headers['X-RapidAPI-Key'] = this.apiKey;
        try {
          headers['X-RapidAPI-Host'] = this.apiHost || new URL(this.apiUrl).host;
        } catch {
          headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
        }
      } else {
        headers['X-Auth-Token'] = this.apiKey;
        if (this.apiUser) {
          headers['X-Auth-User'] = this.apiUser;
        }
      }
    }

    return headers;
  }

  /**
   * Executes fetch with timeout and controlled retries for transient errors.
   *
   * @param {string} url
   * @param {Object} options
   * @param {number} maxRetries
   * @returns {Promise<Response>}
   */
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

        // Fail fast on authentication errors without retry
        if (response.status === 401 || response.status === 403) {
          const err = new Error(`Judge0 authentication failed with HTTP ${response.status}.`);
          err.statusCode = response.status;
          err.isAuthError = true;
          throw err;
        }

        // Retry on transient 429 (rate limit) or 502/503/504 (gateway errors)
        if ([429, 502, 503, 504].includes(response.status) && attempt < maxRetries) {
          const delay = Math.min(300 * Math.pow(2, attempt) + Math.random() * 100, 2000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err.isAuthError) {
          throw err;
        }

        // Only retry on network errors or aborts if retries remain
        if (attempt < maxRetries) {
          const delay = Math.min(300 * Math.pow(2, attempt) + Math.random() * 100, 2000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Network request failed after ${maxRetries} retries.`);
  }

  /**
   * Polls Judge0 for submission completion using token.
   *
   * @param {string} token
   * @param {number} maxWaitMs
   * @returns {Promise<Object>}
   */
  async pollSubmission(token, maxWaitMs) {
    const startTime = Date.now();
    let currentInterval = this.initialPollIntervalMs;
    const headers = this.getAuthHeaders();
    const pollUrl = `${this.apiUrl}/submissions/${token}?base64_encoded=true&fields=token,status_id,status,stdout,stderr,compile_output,message,time,memory,exit_code,exit_signal`;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, currentInterval));

      let response;
      try {
        response = await this.fetchWithRetry(pollUrl, { method: 'GET', headers }, 1);
      } catch (err) {
        if (err.isAuthError) throw err;
        // Continue loop if transient poll query fails
        continue;
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Submission token '${token}' not found on Judge0 host.`);
        }
        continue;
      }

      const data = await response.json();
      const statusId = data.status_id || data.status?.id;

      // Status IDs: 1 = In Queue, 2 = Processing
      if (statusId === 1 || statusId === 2) {
        // Increase polling interval with gentle backoff
        currentInterval = Math.min(currentInterval + 200, this.maxPollIntervalMs);
        continue;
      }

      // Terminal status reached (>= 3)
      return data;
    }

    // Maximum polling duration exceeded
    const timeoutErr = new Error(`Execution polling timed out after ${maxWaitMs}ms.`);
    timeoutErr.isTimeout = true;
    throw timeoutErr;
  }

  /**
   * Executes source code inside an isolated container via Judge0.
   *
   * @param {Object} params
   * @returns {Promise<Object>} Standardized execution response
   */
  async execute({ executionId, code, language, stdin, expectedOutput, resourceLimits }) {
    if (!this.apiUrl) {
      return createExecutionResponse({
        executionId,
        status: EXECUTION_STATUS.UNCONFIGURED,
        statusCode: EXECUTION_STATUS_CODES.UNCONFIGURED,
        language,
        durationMs: 0,
        resourceLimits,
        provider: 'judge0',
        error: {
          code: EXECUTION_ERROR_CODES.EXECUTION_PROVIDER_UNCONFIGURED,
          message: 'Judge0 API URL is not configured in server environment variables.',
        },
      });
    }

    const langConfig = SUPPORTED_LANGUAGES[language];
    if (!langConfig || !langConfig.judge0LanguageId) {
      throw new Error(`Judge0 does not have a mapped language ID for '${language}'.`);
    }

    const headers = this.getAuthHeaders();

    // Prepare Base64 payload
    const submissionPayload = {
      source_code: encodeBase64(code),
      language_id: langConfig.judge0LanguageId,
      stdin: encodeBase64(stdin || ''),
      expected_output: expectedOutput !== null && expectedOutput !== undefined ? encodeBase64(expectedOutput) : null,
      cpu_time_limit: resourceLimits.cpuTimeLimitSeconds,
      wall_time_limit: resourceLimits.wallTimeLimitSeconds,
      memory_limit: resourceLimits.memoryLimitMegabytes * 1024, // KB
      stack_limit: resourceLimits.stackLimitMegabytes * 1024, // KB
      max_file_size: 4096, // 4 MB file output limit
    };

    const startTime = Date.now();
    let submissionData;

    try {
      // Step 1: Submit code to Judge0
      const submitUrl = `${this.apiUrl}/submissions?base64_encoded=true&wait=false`;
      const submitResponse = await this.fetchWithRetry(submitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(submissionPayload),
      });

      if (!submitResponse.ok) {
        const errBody = await submitResponse.text();
        return createExecutionResponse({
          executionId,
          status: EXECUTION_STATUS.INTERNAL_ERROR,
          statusCode: EXECUTION_STATUS_CODES.INTERNAL_ERROR,
          language,
          durationMs: Date.now() - startTime,
          resourceLimits,
          provider: 'judge0',
          error: {
            code: submitResponse.status === 429
              ? EXECUTION_ERROR_CODES.PROVIDER_RATE_LIMITED
              : `JUDGE0_HTTP_${submitResponse.status}`,
            message: `Judge0 returned HTTP ${submitResponse.status}: ${errBody.slice(0, 300)}`,
          },
        });
      }

      const initialResult = await submitResponse.json();

      // Step 2: If result is still in queue or processing, poll for completion
      const statusId = initialResult.status_id || initialResult.status?.id;
      if (initialResult.token && (statusId === 1 || statusId === 2 || !statusId)) {
        const maxWaitMs = Math.round((resourceLimits.wallTimeLimitSeconds + 4.0) * 1000);
        submissionData = await this.pollSubmission(initialResult.token, maxWaitMs);
      } else {
        submissionData = initialResult;
      }
    } catch (err) {
      const elapsedMs = Date.now() - startTime;

      if (err.isAuthError) {
        return createExecutionResponse({
          executionId,
          status: EXECUTION_STATUS.INTERNAL_ERROR,
          statusCode: EXECUTION_STATUS_CODES.INTERNAL_ERROR,
          language,
          durationMs: elapsedMs,
          resourceLimits,
          provider: 'judge0',
          error: {
            code: EXECUTION_ERROR_CODES.PROVIDER_AUTH_FAILED,
            message: 'Judge0 authentication failed. Please verify JUDGE0_API_KEY and endpoint configuration in server environment variables.',
          },
        });
      }

      if (err.isTimeout) {
        return createExecutionResponse({
          executionId,
          status: EXECUTION_STATUS.TIME_LIMIT_EXCEEDED,
          statusCode: EXECUTION_STATUS_CODES.TIME_LIMIT_EXCEEDED,
          language,
          durationMs: elapsedMs,
          resourceLimits,
          provider: 'judge0',
          error: {
            code: EXECUTION_ERROR_CODES.EXECUTION_TIMEOUT,
            message: `Execution timed out waiting for remote sandbox response (${elapsedMs}ms).`,
          },
        });
      }

      return createExecutionResponse({
        executionId,
        status: EXECUTION_STATUS.INTERNAL_ERROR,
        statusCode: EXECUTION_STATUS_CODES.INTERNAL_ERROR,
        language,
        durationMs: elapsedMs,
        resourceLimits,
        provider: 'judge0',
        error: {
          code: EXECUTION_ERROR_CODES.PROVIDER_CONNECTION_FAILED,
          message: `Unable to connect to Judge0 provider at ${sanitizeEndpointUrl(this.apiUrl)}: ${err.message}`,
        },
      });
    }

    // Step 3: Decode and normalize execution output
    const rawStdout = decodeBase64(submissionData.stdout);
    const rawStderr = decodeBase64(submissionData.stderr);
    const rawCompileOutput = decodeBase64(submissionData.compile_output);
    const rawMessage = decodeBase64(submissionData.message);

    const judgeStatusId = submissionData.status_id || submissionData.status?.id || 13;
    const durationMs = submissionData.time !== null && submissionData.time !== undefined
      ? Math.round(Number(submissionData.time) * 1000)
      : Date.now() - startTime;
    const memoryUsedKb = submissionData.memory !== null && submissionData.memory !== undefined
      ? Number(submissionData.memory)
      : null;

    // Step 4: Map Judge0 status ID to Standardized Status
    let status = EXECUTION_STATUS.INTERNAL_ERROR;
    let errorDetail = null;

    switch (judgeStatusId) {
      case 3: // Accepted
        status = EXECUTION_STATUS.SUCCESS;
        break;
      case 4: // Wrong Answer
        status = EXECUTION_STATUS.WRONG_ANSWER;
        break;
      case 5: // Time Limit Exceeded
        status = EXECUTION_STATUS.TIME_LIMIT_EXCEEDED;
        break;
      case 6: // Compilation Error
        status = EXECUTION_STATUS.COMPILATION_ERROR;
        break;
      case 7: // Runtime Error (SIGSEGV)
      case 8: // Runtime Error (SIGXFSZ)
      case 9: // Runtime Error (SIGFPE)
      case 10: // Runtime Error (SIGABRT)
      case 11: // Runtime Error (NZEC)
      case 12: // Runtime Error (Other)
        status = EXECUTION_STATUS.RUNTIME_ERROR;
        break;
      default:
        status = EXECUTION_STATUS.INTERNAL_ERROR;
        errorDetail = { message: rawMessage || submissionData.status?.description || 'Remote execution error' };
    }

    // If memory limit was exceeded (indicated by signal or description)
    if (submissionData.exit_signal === 25 || submissionData.status?.description?.toLowerCase().includes('memory')) {
      status = EXECUTION_STATUS.MEMORY_LIMIT_EXCEEDED;
    }

    return createExecutionResponse({
      executionId,
      status,
      statusCode: judgeStatusId,
      language,
      stdout: rawStdout,
      stderr: rawStderr,
      compileOutput: rawCompileOutput || null,
      exitCode: submissionData.exit_code !== undefined ? submissionData.exit_code : null,
      exitSignal: submissionData.exit_signal ? String(submissionData.exit_signal) : null,
      durationMs,
      memoryUsedKb,
      resourceLimits,
      provider: 'judge0',
      error: errorDetail,
    });
  }
}
