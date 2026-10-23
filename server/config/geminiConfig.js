/**
 * Gemini API Configuration and Secret Sanitization
 * Reads API key and runtime parameters strictly from server environment variables.
 * Enforces secret masking to ensure credentials are never leaked to client bundles or log streams.
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * Retrieves normalized Gemini configuration from environment variables.
 */
export function getGeminiConfig() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  let model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash').trim();
  const deprecatedModels = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
  ];
  if (deprecatedModels.includes(model)) {
    model = 'gemini-3.5-flash';
  }
  const timeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 30000;
  const maxRetries = parseInt(process.env.GEMINI_MAX_RETRIES, 10) || 3;
  const isConfigured = Boolean(apiKey && apiKey.length > 0);

  return {
    apiKey,
    model,
    timeoutMs,
    maxRetries,
    isConfigured,
  };
}

/**
 * Sanitizes any string or serialized object to mask potential API keys or sensitive secrets.
 *
 * @param {string|Object} input
 * @returns {string} Sanitized string
 */
export function sanitizeSecrets(input) {
  if (input === null || input === undefined) return '';
  const text = typeof input === 'string' ? input : JSON.stringify(input);

  const { apiKey } = getGeminiConfig();
  let sanitized = text;

  // Mask exact API key if configured
  if (apiKey && apiKey.length > 5) {
    sanitized = sanitized.replaceAll(apiKey, '[REDACTED_API_KEY]');
  }

  // Generic Google AI / GCP API key pattern masking (AIzaSy...)
  sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{20,}/g, '[REDACTED_GEMINI_KEY]');

  return sanitized;
}
