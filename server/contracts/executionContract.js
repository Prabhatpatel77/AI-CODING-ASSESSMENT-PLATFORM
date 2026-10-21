/**
 * Isolated Code Execution Service Integration Contract
 * Defines validated request/response schemas, supported language identifiers,
 * execution IDs, status definitions, resource limits, and error formats.
 */

import crypto from 'node:crypto';

/**
 * Standardized language identifiers and metadata
 */
export const SUPPORTED_LANGUAGES = {
  javascript: {
    id: 'javascript',
    displayName: 'JavaScript (Node.js 20+)',
    extension: '.js',
    judge0LanguageId: 93, // Node.js 20.17.0 (or 63 for Node.js 12.14.0)
    pistonLanguage: 'javascript',
    pistonVersion: '18.15.0',
  },
  python: {
    id: 'python',
    displayName: 'Python (3.11+)',
    extension: '.py',
    judge0LanguageId: 92, // Python 3.11.2 (or 71 for Python 3.8.1)
    pistonLanguage: 'python',
    pistonVersion: '3.10.0',
  },
};

/**
 * Execution Status Enum & Codes
 */
export const EXECUTION_STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  WRONG_ANSWER: 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED: 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  COMPILATION_ERROR: 'COMPILATION_ERROR',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNCONFIGURED: 'UNCONFIGURED',
};

export const EXECUTION_STATUS_CODES = {
  QUEUED: 1,
  PROCESSING: 2,
  SUCCESS: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR: 11,
  INTERNAL_ERROR: 13,
  UNCONFIGURED: 99,
};

/**
 * Standardized Execution Error Codes
 */
export const EXECUTION_ERROR_CODES = {
  EXECUTION_PROVIDER_UNCONFIGURED: 'EXECUTION_PROVIDER_UNCONFIGURED',
  PROVIDER_AUTH_FAILED: 'PROVIDER_AUTH_FAILED',
  PROVIDER_CONNECTION_FAILED: 'PROVIDER_CONNECTION_FAILED',
  PROVIDER_RATE_LIMITED: 'PROVIDER_RATE_LIMITED',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  CODE_TOO_LARGE: 'CODE_TOO_LARGE',
  UNSUPPORTED_LANGUAGE: 'UNSUPPORTED_LANGUAGE',
  PROBLEM_NOT_FOUND: 'PROBLEM_NOT_FOUND',
};

/**
 * Default & Maximum Resource Limits
 */
export const DEFAULT_RESOURCE_LIMITS = {
  cpuTimeLimitSeconds: 2.0, // CPU time limit
  wallTimeLimitSeconds: 5.0, // Wall clock time limit
  memoryLimitMegabytes: 128, // Max resident set memory
  stackLimitMegabytes: 64, // Stack memory
  maxOutputLengthBytes: 10240, // 10 KB stdout/stderr buffer clamp
};

export const MAX_RESOURCE_LIMITS = {
  cpuTimeLimitSeconds: 10.0,
  wallTimeLimitSeconds: 15.0,
  memoryLimitMegabytes: 512,
  stackLimitMegabytes: 128,
  maxOutputLengthBytes: 65536,
};

/**
 * Generates a unique, traceable execution ID
 * Format: `exec_<timestamp>_<randomHex>`
 */
export function generateExecutionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(6).toString('hex');
  return `exec_${timestamp}_${randomPart}`;
}

/**
 * Validates execution request payload
 *
 * @param {Object} payload
 * @returns {{ isValid: boolean, error?: string, sanitized?: Object }}
 */
export function validateExecutionRequest(payload) {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'Request payload must be a JSON object.' };
  }

  const { code, language, stdin = '', expectedOutput = null, resourceLimits = {} } = payload;

  // Validate Code
  if (typeof code !== 'string' || !code.trim()) {
    return { isValid: false, error: 'Source code string is required and cannot be empty.' };
  }

  if (Buffer.byteLength(code, 'utf8') > 65536) {
    return { isValid: false, error: 'Source code exceeds maximum permitted size of 64 KB.' };
  }

  // Validate Language
  const normalizedLang = typeof language === 'string' ? language.trim().toLowerCase() : '';
  if (!normalizedLang || !SUPPORTED_LANGUAGES[normalizedLang]) {
    const supportedList = Object.keys(SUPPORTED_LANGUAGES).join(', ');
    return {
      isValid: false,
      error: `Unsupported language '${language}'. Supported languages are: [${supportedList}].`,
    };
  }

  // Sanitize Resource Limits
  const sanitizedLimits = {
    cpuTimeLimitSeconds: Math.min(
      Math.max(0.5, Number(resourceLimits.cpuTimeLimitSeconds) || DEFAULT_RESOURCE_LIMITS.cpuTimeLimitSeconds),
      MAX_RESOURCE_LIMITS.cpuTimeLimitSeconds
    ),
    wallTimeLimitSeconds: Math.min(
      Math.max(1.0, Number(resourceLimits.wallTimeLimitSeconds) || DEFAULT_RESOURCE_LIMITS.wallTimeLimitSeconds),
      MAX_RESOURCE_LIMITS.wallTimeLimitSeconds
    ),
    memoryLimitMegabytes: Math.min(
      Math.max(16, Number(resourceLimits.memoryLimitMegabytes) || DEFAULT_RESOURCE_LIMITS.memoryLimitMegabytes),
      MAX_RESOURCE_LIMITS.memoryLimitMegabytes
    ),
    stackLimitMegabytes: Math.min(
      Math.max(8, Number(resourceLimits.stackLimitMegabytes) || DEFAULT_RESOURCE_LIMITS.stackLimitMegabytes),
      MAX_RESOURCE_LIMITS.stackLimitMegabytes
    ),
    maxOutputLengthBytes: Math.min(
      Math.max(1024, Number(resourceLimits.maxOutputLengthBytes) || DEFAULT_RESOURCE_LIMITS.maxOutputLengthBytes),
      MAX_RESOURCE_LIMITS.maxOutputLengthBytes
    ),
  };

  return {
    isValid: true,
    sanitized: {
      code,
      language: normalizedLang,
      stdin: typeof stdin === 'string' ? stdin : JSON.stringify(stdin),
      expectedOutput: expectedOutput !== null && expectedOutput !== undefined ? String(expectedOutput) : null,
      resourceLimits: sanitizedLimits,
    },
  };
}

/**
 * Formats a standardized execution response contract
 *
 * @param {Object} params
 * @returns {Object} Standardized execution result schema
 */
export function createExecutionResponse({
  executionId,
  status,
  statusCode,
  language,
  stdout = '',
  stderr = '',
  compileOutput = null,
  exitCode = null,
  exitSignal = null,
  durationMs = 0,
  memoryUsedKb = null,
  resourceLimits = DEFAULT_RESOURCE_LIMITS,
  provider = 'unconfigured',
  error = null,
}) {
  return {
    executionId: executionId || generateExecutionId(),
    status,
    statusCode: statusCode || EXECUTION_STATUS_CODES[status] || 99,
    language,
    stdout: typeof stdout === 'string' ? stdout.slice(0, resourceLimits.maxOutputLengthBytes) : '',
    stderr: typeof stderr === 'string' ? stderr.slice(0, resourceLimits.maxOutputLengthBytes) : '',
    compileOutput: compileOutput ? String(compileOutput).slice(0, resourceLimits.maxOutputLengthBytes) : null,
    exitCode,
    exitSignal,
    durationMs: Math.round(Number(durationMs) || 0),
    memoryUsedKb: memoryUsedKb !== null && memoryUsedKb !== undefined ? Math.round(Number(memoryUsedKb)) : null,
    resourceLimits,
    provider,
    executedAt: new Date().toISOString(),
    error: error || null,
  };
}
