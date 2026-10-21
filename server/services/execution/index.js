/**
 * Execution Service Manager
 * Factory and facade for remote isolated code execution adapters.
 * Guarantees that code execution is delegated to an isolated sandbox and never executed locally.
 */

import { Judge0Adapter } from './Judge0Adapter.js';
import { PistonAdapter } from './PistonAdapter.js';
import { UnconfiguredAdapter } from './UnconfiguredAdapter.js';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_RESOURCE_LIMITS,
  validateExecutionRequest,
  generateExecutionId,
} from '../../contracts/executionContract.js';

let activeAdapter = null;

/**
 * Initializes and returns the active execution adapter based on environment configuration.
 *
 * @returns {ExecutionAdapter} Configured execution adapter
 */
export function getExecutionProvider() {
  if (activeAdapter) return activeAdapter;

  const providerType = (process.env.EXECUTION_PROVIDER || '').trim().toLowerCase();
  const judge0Url = process.env.JUDGE0_API_URL;
  const pistonUrl = process.env.PISTON_API_URL;

  if ((providerType === 'judge0' || !providerType) && judge0Url) {
    activeAdapter = new Judge0Adapter({
      apiUrl: judge0Url,
      apiKey: process.env.JUDGE0_API_KEY,
    });
    console.log(`[Execution Service] Initialized Judge0 adapter at ${judge0Url}`);
  } else if ((providerType === 'piston' || !providerType) && pistonUrl) {
    activeAdapter = new PistonAdapter({
      apiUrl: pistonUrl,
    });
    console.log(`[Execution Service] Initialized Piston adapter at ${pistonUrl}`);
  } else {
    activeAdapter = new UnconfiguredAdapter();
    console.log('[Execution Service] Initialized Unconfigured adapter (Local execution disabled for security).');
  }

  return activeAdapter;
}

/**
 * Executes code using the configured remote sandbox provider.
 * Enforces schema validation and resource clamping.
 *
 * @param {Object} rawRequest
 * @returns {Promise<Object>} Standardized execution response
 */
export async function submitCodeExecution(rawRequest) {
  const validation = validateExecutionRequest(rawRequest);
  if (!validation.isValid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }

  const { code, language, stdin, expectedOutput, resourceLimits } = validation.sanitized;
  const executionId = generateExecutionId();

  const provider = getExecutionProvider();

  return provider.execute({
    executionId,
    code,
    language,
    stdin,
    expectedOutput,
    resourceLimits,
  });
}

/**
 * Returns safe metadata about supported languages, resource bounds, and provider readiness.
 * Never leaks API keys or secrets.
 *
 * @returns {Object} Safe configuration metadata
 */
export function getExecutionServiceConfig() {
  const provider = getExecutionProvider();
  const providerStatus = provider.getStatus();

  return {
    provider: providerStatus.provider,
    configured: providerStatus.configured,
    ready: providerStatus.ready,
    supportedLanguages: Object.values(SUPPORTED_LANGUAGES).map((l) => ({
      id: l.id,
      displayName: l.displayName,
      extension: l.extension,
    })),
    defaultResourceLimits: DEFAULT_RESOURCE_LIMITS,
    securityNotice:
      'Code execution is strictly isolated in remote ephemeral containers. Web server execution (eval/child_process) is prohibited by system design.',
  };
}

/**
 * Allows resetting the active adapter (used for testing different providers)
 */
export function resetExecutionProvider(customAdapter = null) {
  activeAdapter = customAdapter;
}
