/**
 * Reusable Server-Side Gemini API Service
 * Wraps @google/genai SDK with:
 * - Environment variable configuration
 * - Controlled retries with exponential backoff & jitter
 * - Abortable timeouts
 * - System instructions and user context injection
 * - Structured response generation and schema validation
 * - Quota, rate limit, and provider error classification
 * - Execution telemetry (latency and token usage tracking)
 * - Strict credential confidentiality (never logs or leaks secrets)
 */

import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiConfig, sanitizeSecrets, normalizeModelName } from '../../config/geminiConfig.js';

export { Type };

/**
 * Standardized Gemini Error Codes
 */
export const GEMINI_ERROR_CODES = {
  GEMINI_UNCONFIGURED: 'GEMINI_UNCONFIGURED',
  QUOTA_EXHAUSTED: 'QUOTA_EXHAUSTED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  INVALID_OUTPUT: 'INVALID_OUTPUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
};

/**
 * Custom Gemini Service Error with HTTP status mapping and retryability indicators.
 */
export class GeminiServiceError extends Error {
  constructor(message, { code = GEMINI_ERROR_CODES.PROVIDER_ERROR, statusCode = 502, retryable = false, cause = null } = {}) {
    super(sanitizeSecrets(message));
    this.name = 'GeminiServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    if (cause) {
      this.cause = sanitizeSecrets(cause?.message || String(cause));
    }
  }
}

// Module-level cached client instance (can be overridden in tests via setGeminiClient)
let activeGenAiClient = null;

/**
 * Retrieves or initializes the singleton @google/genai instance.
 *
 * @returns {GoogleGenAI}
 */
export function getGenAiClient() {
  if (activeGenAiClient) return activeGenAiClient;

  const { apiKey } = getGeminiConfig();
  if (!apiKey) {
    throw new GeminiServiceError(
      'Gemini API is not configured on this server. Please provide GEMINI_API_KEY.',
      {
        code: GEMINI_ERROR_CODES.GEMINI_UNCONFIGURED,
        statusCode: 503,
        retryable: false,
      }
    );
  }

  activeGenAiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return activeGenAiClient;
}

/**
 * Allows injection of a mock or custom GoogleGenAI client (for automated testing).
 */
export function setGeminiClient(customClient) {
  activeGenAiClient = customClient;
}

/**
 * Resets the active client to default singleton.
 */
export function resetGeminiClient() {
  activeGenAiClient = null;
}

/**
 * Classifies an error thrown by the Gemini SDK or fetch layer.
 *
 * @param {Error} error
 * @returns {{ code: string, statusCode: number, retryable: boolean, message: string }}
 */
function classifyProviderError(error) {
  const errMsg = String(error?.message || error || '').toLowerCase();
  const status = error?.status || error?.statusCode || 0;

  // 1. Timeout / Abort
  if (errMsg.includes('timeout') || errMsg.includes('aborted') || error?.name === 'AbortError') {
    return {
      code: GEMINI_ERROR_CODES.TIMEOUT_ERROR,
      statusCode: 504,
      retryable: true,
      message: 'The AI service timed out while processing the request.',
    };
  }

  // 2. Authentication / Permissions
  if (status === 401 || status === 403 || errMsg.includes('api key') || errMsg.includes('unauthorized') || errMsg.includes('permission_denied')) {
    return {
      code: GEMINI_ERROR_CODES.AUTHENTICATION_ERROR,
      statusCode: 401,
      retryable: false,
      message: 'Authentication failed. Please verify the server GEMINI_API_KEY configuration.',
    };
  }

  // 3. Quota / Rate Limits
  if (status === 429 || errMsg.includes('resource_exhausted') || errMsg.includes('quota') || errMsg.includes('rate limit')) {
    return {
      code: GEMINI_ERROR_CODES.QUOTA_EXHAUSTED,
      statusCode: 429,
      retryable: true,
      message: 'AI rate limit or API quota exceeded. Please try again shortly.',
    };
  }

  // 4. Temporary Service Unavailability / Overload (e.g. 503 high demand spikes)
  if (status === 503 || errMsg.includes('unavailable') || errMsg.includes('high demand') || errMsg.includes('overloaded')) {
    return {
      code: GEMINI_ERROR_CODES.SERVICE_UNAVAILABLE,
      statusCode: 503,
      retryable: true,
      message: 'The AI model is temporarily experiencing high demand. Please try again shortly.',
    };
  }

  // 5. Invalid Request / Argument (non-retryable client error)
  if (status === 400 || errMsg.includes('invalid_argument')) {
    return {
      code: GEMINI_ERROR_CODES.PROVIDER_ERROR,
      statusCode: 400,
      retryable: false,
      message: `Invalid AI request parameters: ${sanitizeSecrets(error.message)}`,
    };
  }

  // 6. Generic transient network or 5xx provider error
  if (status >= 500 || errMsg.includes('econnreset') || errMsg.includes('etimedout')) {
    return {
      code: GEMINI_ERROR_CODES.PROVIDER_ERROR,
      statusCode: 502,
      retryable: true,
      message: 'An unexpected remote error occurred while contacting the AI service.',
    };
  }

  return {
    code: GEMINI_ERROR_CODES.PROVIDER_ERROR,
    statusCode: 502,
    retryable: false,
    message: sanitizeSecrets(error.message || 'AI service execution encountered an unhandled error.'),
  };
}

/**
 * Strips markdown code fences (e.g. ```json ... ```) from model output if present.
 */
function stripMarkdownFences(rawText = '') {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Delays execution for exponential backoff.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reusable Gemini Content Generation Function
 *
 * @param {Object} options
 * @param {string} [options.prompt] - User prompt text
 * @param {Array|Object} [options.contents] - Raw contents payload (overrides prompt)
 * @param {string} [options.systemInstruction] - Persona, instructions, or role guidelines
 * @param {Object|string} [options.userContext] - Additional assessment/candidate context
 * @param {Object} [options.responseSchema] - Expected schema for structured JSON output
 * @param {string} [options.responseMimeType] - Output MIME type ('application/json' or 'text/plain')
 * @param {Function} [options.validator] - Custom schema/content validator: (parsed) => { valid, error }
 * @param {string} [options.model] - Model name override
 * @param {number} [options.timeoutMs] - Execution timeout in ms (default: 30000)
 * @param {number} [options.maxRetries] - Max retry attempts on transient errors (default: 3)
 * @param {number} [options.temperature] - Sampling temperature (0.0 to 2.0)
 * @param {number} [options.topP] - Nucleus sampling parameter
 * @returns {Promise<Object>} Standardized result envelope with data, text, latency, and usage metrics
 */
export async function generateGeminiContent({
  prompt,
  contents,
  systemInstruction,
  userContext,
  responseSchema,
  responseMimeType,
  validator,
  model,
  timeoutMs,
  maxRetries,
  temperature,
  topP,
}) {
  const config = getGeminiConfig();

  // Validate configuration presence
  if (!config.isConfigured && !activeGenAiClient) {
    throw new GeminiServiceError(
      'Gemini API is not configured on this server. Please set GEMINI_API_KEY in environment variables.',
      {
        code: GEMINI_ERROR_CODES.GEMINI_UNCONFIGURED,
        statusCode: 503,
        retryable: false,
      }
    );
  }

  const selectedModel = normalizeModelName(model || config.model);
  const effectiveTimeoutMs = timeoutMs || config.timeoutMs;
  const effectiveMaxRetries = maxRetries !== undefined ? maxRetries : config.maxRetries;

  // Build system instruction with optional userContext
  let effectiveSystemInstruction = systemInstruction || '';
  if (userContext) {
    const formattedContext =
      typeof userContext === 'object'
        ? JSON.stringify(userContext, null, 2)
        : String(userContext);
    effectiveSystemInstruction = effectiveSystemInstruction
      ? `${effectiveSystemInstruction}\n\n[USER CONTEXT]\n${formattedContext}`
      : `[USER CONTEXT]\n${formattedContext}`;
  }

  // Build model configuration object
  const modelConfig = {};
  if (effectiveSystemInstruction) {
    modelConfig.systemInstruction = effectiveSystemInstruction;
  }
  if (temperature !== undefined) {
    modelConfig.temperature = temperature;
  }
  if (topP !== undefined) {
    modelConfig.topP = topP;
  }

  // Handle structured output if schema is supplied
  const isStructured = Boolean(responseSchema);
  if (isStructured) {
    modelConfig.responseMimeType = 'application/json';
    modelConfig.responseSchema = responseSchema;
  } else if (responseMimeType) {
    modelConfig.responseMimeType = responseMimeType;
  }

  // Resolve input contents
  const effectiveContents = contents || prompt || '';
  if (!effectiveContents) {
    throw new GeminiServiceError('Missing prompt or contents for Gemini request.', {
      code: GEMINI_ERROR_CODES.PROVIDER_ERROR,
      statusCode: 400,
      retryable: false,
    });
  }

  const startTime = Date.now();
  let lastError = null;
  let attempts = 0;

  // Controlled Retry Loop with Exponential Backoff
  while (attempts <= effectiveMaxRetries) {
    attempts++;
    try {
      const client = getGenAiClient();

      // Enforce timeout using Promise.race
      let timeoutHandle;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          const err = new Error(`Gemini request timed out after ${effectiveTimeoutMs}ms`);
          err.name = 'AbortError';
          reject(err);
        }, effectiveTimeoutMs);
      });

      let modelToUse = selectedModel;
      if (attempts > 1 && (modelToUse === 'gemini-3.8-flash' || modelToUse === 'gemini-flash-latest')) {
        modelToUse = 'gemini-3.5-flash';
      }

      const generatePromise = client.models.generateContent({
        model: modelToUse,
        contents: effectiveContents,
        config: Object.keys(modelConfig).length > 0 ? modelConfig : undefined,
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      clearTimeout(timeoutHandle);

      const latencyMs = Date.now() - startTime;
      const rawText = response.text || '';

      // Token usage metrics tracking
      const usage = {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      };

      // Process Structured Output
      if (isStructured || modelConfig.responseMimeType === 'application/json') {
        const cleanedJson = stripMarkdownFences(rawText);
        let parsedData;
        try {
          parsedData = JSON.parse(cleanedJson);
        } catch (jsonErr) {
          throw new GeminiServiceError(
            `Failed to parse structured JSON response from Gemini model: ${jsonErr.message}`,
            {
              code: GEMINI_ERROR_CODES.INVALID_OUTPUT,
              statusCode: 502,
              retryable: false,
              cause: rawText.slice(0, 300),
            }
          );
        }

        // Run custom validator if provided
        if (typeof validator === 'function') {
          const validationResult = validator(parsedData);
          if (validationResult === false || (validationResult && validationResult.valid === false)) {
            const validationMsg = validationResult?.error || 'Response failed schema validation requirements.';
            throw new GeminiServiceError(`Structured response failed validation: ${validationMsg}`, {
              code: GEMINI_ERROR_CODES.INVALID_OUTPUT,
              statusCode: 502,
              retryable: false,
            });
          }
        }

        return {
          success: true,
          data: parsedData,
          text: rawText,
          model: selectedModel,
          latencyMs,
          usage,
          retriesAttempted: attempts - 1,
        };
      }

      // Plain Text Response
      return {
        success: true,
        data: rawText,
        text: rawText,
        model: selectedModel,
        latencyMs,
        usage,
        retriesAttempted: attempts - 1,
      };
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        lastError = err;
        if (!err.retryable || attempts > effectiveMaxRetries) {
          break;
        }
      } else {
        const classified = classifyProviderError(err);
        lastError = new GeminiServiceError(classified.message, {
          code: classified.code,
          statusCode: classified.statusCode,
          retryable: classified.retryable,
          cause: err,
        });

        // Stop immediately if non-retryable or if we reached max retries
        if (!classified.retryable || attempts > effectiveMaxRetries) {
          break;
        }
      }

      // Exponential backoff with jitter: 500ms, 1000ms, 2000ms... + [0-250ms]
      const backoffMs = Math.min(4000, 500 * Math.pow(2, attempts - 1) + Math.random() * 250);
      await delay(backoffMs);
    }
  }

  // If retries exhausted or non-retryable failure, throw normalized error
  throw lastError;
}
