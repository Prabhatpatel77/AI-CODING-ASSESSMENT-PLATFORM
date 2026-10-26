/**
 * Automated Test Suite: Server-Side Gemini API Service & Explanation Endpoint
 * Validates:
 * - Environment variable loading and configuration
 * - Secret sanitization invariant: API keys are NEVER logged or leaked
 * - Authentication & input validation on POST /api/ai/explain
 * - Structured response schema parsing and custom validation
 * - Timeout handling and controlled retries on transient errors (503/429)
 * - Latency and token accounting telemetry
 * - Error classification (QUOTA_EXHAUSTED, TIMEOUT_ERROR, INVALID_OUTPUT, etc.)
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  generateGeminiContent,
  GeminiServiceError,
  GEMINI_ERROR_CODES,
  setGeminiClient,
  resetGeminiClient,
  Type,
} from '../services/ai/geminiService.js';
import { getGeminiConfig, sanitizeSecrets } from '../config/geminiConfig.js';

const BASE_URL = 'http://127.0.0.1:3000/api';

test('Server-Side Gemini API Service Test Suite', async () => {
  console.log('\n====================================================');
  console.log('Starting Gemini API Service & Explanation Tests');
  console.log('====================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Configuration & Secret Sanitization
  // ---------------------------------------------------------------------------
  const config = getGeminiConfig();
  assert(Boolean(config.model), 'Config loads model name');
  assert(typeof config.timeoutMs === 'number', 'Config loads timeoutMs');
  assert(typeof config.maxRetries === 'number', 'Config loads maxRetries');

  // Invariant test: sanitizeSecrets masks API key
  const fakeKey = 'AIzaSyFakeKeyForTestSanitization123';
  const textWithKey = `Error connecting with key ${fakeKey} to endpoint`;
  const sanitized = sanitizeSecrets(textWithKey);
  assert(!sanitized.includes(fakeKey), 'CRITICAL: sanitizeSecrets masks API key patterns');
  assert(sanitized.includes('[REDACTED_GEMINI_KEY]'), 'Contains redaction indicator');
  console.log('✓ Test 1: Config and secret redaction verified');

  // ---------------------------------------------------------------------------
  // TEST 2: GET /api/ai/status returns config without leaking secret
  // ---------------------------------------------------------------------------
  const statusRes = await fetch(`${BASE_URL}/ai/status`, {
    headers: { Connection: 'close' },
  });
  const statusData = await statusRes.json();
  assert.strictEqual(statusRes.status, 200, 'GET /api/ai/status returns HTTP 200');
  assert.strictEqual(statusData.status, 'success', 'Status is success');
  assert(statusData.model.includes('gemini'), 'Reports Gemini model');
  assert.strictEqual(statusData.apiKey, undefined, 'CRITICAL: API key is NOT present in status response');
  assert(!JSON.stringify(statusData).includes('AIza'), 'CRITICAL: No raw API key in response JSON');
  console.log('✓ Test 2: AI status endpoint verified');

  // ---------------------------------------------------------------------------
  // TEST 3: Unauthenticated POST /api/ai/explain is rejected (HTTP 401)
  // ---------------------------------------------------------------------------
  const unauthRes = await fetch(`${BASE_URL}/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Connection: 'close' },
    body: JSON.stringify({ code: 'function twoSum() {}' }),
  });
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated explain request returns HTTP 401');
  console.log('✓ Test 3: Unauthenticated rejection verified');

  // Register a test student to obtain valid JWT
  const ts = Date.now();
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Connection: 'close' },
    body: JSON.stringify({
      name: 'AI Candidate',
      email: `ai.student.${ts}@devassess.test`,
      password: 'Password123!',
      role: 'student',
    }),
  });
  const regData = await regRes.json();
  const studentToken = regData.token;
  assert(Boolean(studentToken), 'Candidate registered and received token');

  // ---------------------------------------------------------------------------
  // TEST 4: Input Validation: Missing code returns HTTP 400
  // ---------------------------------------------------------------------------
  const missingCodeRes = await fetch(`${BASE_URL}/ai/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
      Connection: 'close',
    },
    body: JSON.stringify({ code: '   ' }),
  });
  assert.strictEqual(missingCodeRes.status, 400, 'Missing code returns HTTP 400 Bad Request');
  console.log('✓ Test 4: Input validation verified');

  // ---------------------------------------------------------------------------
  // TEST 5: Unit Test: Structured Output Parsing & Telemetry Tracking
  // ---------------------------------------------------------------------------
  const mockValidResponse = {
    text: JSON.stringify({
      summary: 'Finds two numbers in an array that add up to target using a hash map.',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      complexityExplanation: 'Single pass through array of length n with constant-time hash map lookups.',
      algorithmicPattern: 'Hash Table',
      keyTakeaway: 'Trade auxiliary space for linear time complexity.',
    }),
    usageMetadata: {
      promptTokenCount: 120,
      candidatesTokenCount: 65,
      totalTokenCount: 185,
    },
  };

  const mockClientSuccess = {
    models: {
      generateContent: async () => mockValidResponse,
    },
  };

  setGeminiClient(mockClientSuccess);

  const result = await generateGeminiContent({
    prompt: 'Analyze two sum solution',
    systemInstruction: 'You are an educator.',
    responseSchema: { type: Type.OBJECT },
  });

  assert.strictEqual(result.success, true, 'Service reports successful generation');
  assert.strictEqual(result.data.timeComplexity, 'O(n)', 'Parsed structured timeComplexity');
  assert.strictEqual(result.data.spaceComplexity, 'O(n)', 'Parsed structured spaceComplexity');
  assert(result.latencyMs >= 0, 'Tracks execution latency in ms');
  assert.strictEqual(result.usage.promptTokens, 120, 'Tracks prompt token usage');
  assert.strictEqual(result.usage.completionTokens, 65, 'Tracks candidate token usage');
  assert.strictEqual(result.usage.totalTokens, 185, 'Tracks total token usage');

  // ---------------------------------------------------------------------------
  // TEST 6: Unit Test: Schema Validation Rejection
  // ---------------------------------------------------------------------------
  const mockInvalidResponse = {
    text: JSON.stringify({ someOtherField: 123 }),
  };
  setGeminiClient({
    models: {
      generateContent: async () => mockInvalidResponse,
    },
  });

  await assert.rejects(
    async () => {
      await generateGeminiContent({
        prompt: 'Analyze code',
        responseSchema: { type: Type.OBJECT },
        validator: (data) => ({
          valid: Boolean(data.summary),
          error: 'Missing required summary field',
        }),
      });
    },
    (err) => {
      assert(err instanceof GeminiServiceError, 'Throws GeminiServiceError');
      assert.strictEqual(err.code, GEMINI_ERROR_CODES.INVALID_OUTPUT, 'Code is INVALID_OUTPUT');
      assert.strictEqual(err.statusCode, 502, 'HTTP status is 502 Bad Gateway');
      return true;
    },
    'Invalid schema output triggers structured validation failure'
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Unit Test: Timeout Handling Triggers TIMEOUT_ERROR
  // ---------------------------------------------------------------------------
  setGeminiClient({
    models: {
      generateContent: async () => {
        // Hang longer than timeout
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { text: 'too late' };
      },
    },
  });

  await assert.rejects(
    async () => {
      await generateGeminiContent({
        prompt: 'Timeout test',
        timeoutMs: 50, // 50ms timeout
        maxRetries: 0,
      });
    },
    (err) => {
      assert.strictEqual(err.code, GEMINI_ERROR_CODES.TIMEOUT_ERROR, 'Code is TIMEOUT_ERROR');
      assert.strictEqual(err.statusCode, 504, 'HTTP status is 504 Gateway Timeout');
      return true;
    },
    'Request exceeding timeout throws TIMEOUT_ERROR'
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Unit Test: Controlled Retries with Backoff on 503 / 429
  // ---------------------------------------------------------------------------
  let attemptCount = 0;
  setGeminiClient({
    models: {
      generateContent: async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          const err = new Error('503 Service Unavailable - model is overloaded');
          err.status = 503;
          throw err;
        }
        return mockValidResponse;
      },
    },
  });

  const retryResult = await generateGeminiContent({
    prompt: 'Retry test',
    maxRetries: 3,
    responseSchema: { type: Type.OBJECT },
  });

  assert.strictEqual(attemptCount, 3, 'Executed 2 retries before succeeding on attempt 3');
  assert.strictEqual(retryResult.retriesAttempted, 2, 'Reports 2 retries attempted');
  assert.strictEqual(retryResult.data.timeComplexity, 'O(n)', 'Successfully recovered after transient 503 errors');

  // Reset injected mock client to restore real service client
  resetGeminiClient();

  // ---------------------------------------------------------------------------
  // TEST 9: HTTP Endpoint Integration: Authenticated POST /api/ai/explain
  // ---------------------------------------------------------------------------
  // Use mock client on endpoint test to ensure deterministic behavior regardless of upstream quotas
  setGeminiClient({
    models: {
      generateContent: async () => ({
        text: JSON.stringify({
          summary: 'Efficient two sum implementation using hash table.',
          timeComplexity: 'O(n)',
          spaceComplexity: 'O(n)',
          complexityExplanation: 'We traverse the list containing n elements only once, and hash table lookup takes O(1) time.',
          algorithmicPattern: 'Hash Map Lookup',
          keyTakeaway: 'Hash maps provide constant-time lookups to avoid O(n^2) nested loops.',
        }),
        usageMetadata: {
          promptTokenCount: 145,
          candidatesTokenCount: 88,
          totalTokenCount: 233,
        },
      }),
    },
  });

  const explainRes = await fetch(`${BASE_URL}/ai/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
      Connection: 'close',
    },
    body: JSON.stringify({
      code: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) return [map.get(diff), i];
    map.set(nums[i], i);
  }
}`,
      language: 'javascript',
      concept: 'Time & Space Complexity',
      userContext: { difficulty: 'Easy', skillLevel: 'Intermediate' },
    }),
  });

  const explainData = await explainRes.json();
  const rawResponseString = JSON.stringify(explainData);
  assert(!rawResponseString.includes('AIza'), 'CRITICAL: HTTP response never leaks API key');

  if (explainRes.status === 200) {
    assert.strictEqual(explainData.status, 'success', 'Status is success');
    assert(Boolean(explainData.data?.explanation), 'Contains explanation object');
    assert(Boolean(explainData.data.explanation.timeComplexity), 'Explanation includes Big-O time');
    assert(Boolean(explainData.data.explanation.spaceComplexity), 'Explanation includes Big-O space');
    assert(Boolean(explainData.data.explanation.complexityExplanation), 'Includes complexity explanation');
    assert(Boolean(explainData.data.metrics?.usage), 'Includes token accounting');
    assert(typeof explainData.data.metrics.latencyMs === 'number', 'Includes latency metrics');
    console.log('✓ Test 9: Authenticated POST /api/ai/explain returned 200 with structured analysis');
  } else if (explainRes.status === 429 || explainRes.status === 503) {
    assert.strictEqual(explainData.status, 'error', 'Error status is returned on upstream quota limit');
    assert(['QUOTA_EXHAUSTED', 'SERVICE_UNAVAILABLE'].includes(explainData.code), 'Code is QUOTA_EXHAUSTED or SERVICE_UNAVAILABLE');
    assert(typeof explainData.message === 'string', 'Error has descriptive sanitized message');
    console.log(`✓ Test 9: Authenticated POST /api/ai/explain handled upstream ${explainRes.status} (${explainData.code}) cleanly with secret masking`);
  } else {
    assert.fail(`Unexpected status code ${explainRes.status}: ${rawResponseString}`);
  }

  // Reset client to live default
  resetGeminiClient();

  // ---------------------------------------------------------------------------
  // TEST 10: Live Provider Integration (when GEMINI_API_KEY is configured)
  // ---------------------------------------------------------------------------
  if (config.isConfigured) {
    try {
      const liveResult = await generateGeminiContent({
        prompt: 'Return a JSON with summary "live test passed" and timeComplexity "O(1)" and spaceComplexity "O(1)" and complexityExplanation "constant time operation".',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            timeComplexity: { type: Type.STRING },
            spaceComplexity: { type: Type.STRING },
            complexityExplanation: { type: Type.STRING },
          },
          required: ['summary', 'timeComplexity', 'spaceComplexity', 'complexityExplanation'],
        },
        timeoutMs: 20000,
        maxRetries: 1,
      });
      assert.strictEqual(liveResult.success, true, 'Live Gemini API call succeeded');
      assert(Boolean(liveResult.data?.summary), 'Live model produced valid structured output');
      assert(liveResult.latencyMs > 0, 'Live latency recorded');
      console.log(`✓ Test 10: Live Gemini API call succeeded in ${liveResult.latencyMs}ms using model ${liveResult.model}`);
    } catch (liveErr) {
      if (liveErr.code === GEMINI_ERROR_CODES.QUOTA_EXHAUSTED || liveErr.code === GEMINI_ERROR_CODES.SERVICE_UNAVAILABLE) {
        console.log(`✓ Test 10: Live Gemini API handled upstream capacity limit: ${liveErr.code} (${liveErr.message})`);
      } else {
        throw liveErr;
      }
    }
  } else {
    console.log('ℹ Test 10: Live Gemini call skipped (GEMINI_API_KEY not configured)');
  }

  console.log('PASS: All Gemini service, error handling, retry, and explanation tests passed successfully!');
});
