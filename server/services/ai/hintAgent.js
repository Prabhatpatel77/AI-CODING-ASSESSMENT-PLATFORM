/**
 * Adaptive Hint Agent Service
 * Implements a focused, progressive Socratic tutoring service powered by the Gemini API.
 *
 * Input Requirements:
 * - Problem statement & constraints
 * - Student's current draft code
 * - Available judge results (verdict, stdout/stderr, passed tests)
 * - Previous attempts and previous hints
 * - Requested hint level (1: Conceptual Clue, 2: Algorithmic Direction, 3: Specific Guidance)
 *
 * Output Contract:
 * - hintLevel (1 | 2 | 3)
 * - stageLabel ("Conceptual Clue" | "Algorithmic Direction" | "Specific Guidance")
 * - concept (e.g. "Two Pointers", "Hash Table", "Boundary Check")
 * - hintText (Socratic clue without code spoil)
 * - rationale (Brief reasoning based on candidate's code and test results)
 *
 * Invariants:
 * - Never fabricates judge execution results.
 * - Never reveals complete solutions or full implementations.
 * - Avoids repeating previously delivered hints.
 * - Strict context limits to prevent token overflow.
 */

import { generateGeminiContent, Type } from './geminiService.js';
import { sanitizeSecrets } from '../../config/geminiConfig.js';

export const HINT_STAGES = {
  1: {
    level: 1,
    label: 'Conceptual Clue',
    description: 'High-level conceptual nudge toward the underlying mathematical principle, invariant, or problem intuition without naming implementation details.',
  },
  2: {
    level: 2,
    label: 'Algorithmic Direction',
    description: 'Guidance on algorithmic strategy, optimal data structures, or time/space complexity targets.',
  },
  3: {
    level: 3,
    label: 'Specific Guidance',
    description: 'Targeted boundary condition, logic gap, or syntax debugging clue pointing toward the specific line or block needing adjustment.',
  },
};

/**
 * Structured schema definition for Gemini structured JSON output
 */
export const hintResponseSchema = {
  type: Type.OBJECT,
  properties: {
    hintLevel: {
      type: Type.INTEGER,
      description: 'The progressive hint level: 1 (Conceptual Clue), 2 (Algorithmic Direction), or 3 (Specific Guidance).',
    },
    stageLabel: {
      type: Type.STRING,
      description: 'Human-readable stage label: "Conceptual Clue", "Algorithmic Direction", or "Specific Guidance".',
    },
    concept: {
      type: Type.STRING,
      description: 'The core computer science or algorithmic concept being tested (e.g. Two Pointers, Hash Map, Binary Search, Edge Case Handling).',
    },
    hintText: {
      type: Type.STRING,
      description: 'The progressive Socratic hint. Must NOT provide full code solutions, full functions, or repeat previous hints.',
    },
    rationale: {
      type: Type.STRING,
      description: 'Brief pedagogical explanation of why this hint was chosen based on the student\'s code and failure patterns.',
    },
  },
  required: ['hintLevel', 'stageLabel', 'concept', 'hintText', 'rationale'],
};

/**
 * Validates parsed hint output against strict structural and content requirements.
 *
 * @param {Object} parsed
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateHintOutput(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Expected JSON object in hint response.' };
  }

  const level = Number(parsed.hintLevel);
  if (![1, 2, 3].includes(level)) {
    return { valid: false, error: `Invalid hintLevel: ${parsed.hintLevel}. Must be 1, 2, or 3.` };
  }

  if (typeof parsed.hintText !== 'string' || parsed.hintText.trim().length < 15) {
    return { valid: false, error: 'Missing or insufficiently descriptive hintText (minimum 15 characters required).' };
  }

  if (typeof parsed.concept !== 'string' || !parsed.concept.trim()) {
    return { valid: false, error: 'Missing required concept field.' };
  }

  if (typeof parsed.rationale !== 'string' || !parsed.rationale.trim()) {
    return { valid: false, error: 'Missing required rationale field.' };
  }

  // Safety check: Ensure model did not accidentally output full code solutions
  const codeFenceMatches = parsed.hintText.match(/```[\s\S]*?```/g);
  if (codeFenceMatches) {
    const totalFenceLength = codeFenceMatches.reduce((acc, match) => acc + match.length, 0);
    if (totalFenceLength > 120 || codeFenceMatches.some((m) => m.split('\n').length > 4)) {
      return { valid: false, error: 'Hint text contained full code solution or excessive code blocks, violating anti-spoil policy.' };
    }
  }

  return { valid: true };
}

/**
 * Normalizes and sanitizes inputs with defensive bounds.
 */
function sanitizeHintInputs({
  problem,
  code,
  language = 'javascript',
  judgeResults,
  previousAttempts = [],
  previousHints = [],
  hintLevel = 1,
}) {
  // Validate code
  if (!code || typeof code !== 'string' || !code.trim()) {
    throw new Error('Student code is required to generate adaptive hints.');
  }
  if (Buffer.byteLength(code, 'utf8') > 65536) {
    throw new Error('Student code exceeds maximum permitted size of 64 KB.');
  }

  // Validate hint level (default: 1, range 1-3)
  const normalizedLevel = Math.max(1, Math.min(3, parseInt(hintLevel, 10) || 1));

  // Sanitize problem details
  const problemTitle = String(problem?.title || 'Coding Problem').slice(0, 200);
  const problemDesc = String(problem?.description || problem?.statement || 'No description provided.').slice(0, 4000);
  const constraints = Array.isArray(problem?.constraints)
    ? problem.constraints.map((c) => String(c).slice(0, 200)).slice(0, 10).join('\n')
    : String(problem?.constraints || 'Standard time and memory constraints apply.').slice(0, 1000);

  // Sanitize judge results (DO NOT FABRICATE)
  let judgeSummary = 'No judge test execution results provided. Static code analysis only.';
  if (judgeResults && typeof judgeResults === 'object') {
    const status = judgeResults.status || judgeResults.verdict || 'UNKNOWN';
    const passed = judgeResults.passedTests !== undefined ? `${judgeResults.passedTests}/${judgeResults.totalTests || '?'}` : null;
    const stderr = judgeResults.stderr ? `Error output: ${String(judgeResults.stderr).slice(0, 300)}` : '';
    const stdout = judgeResults.stdout ? `Standard output: ${String(judgeResults.stdout).slice(0, 300)}` : '';
    judgeSummary = `Verdict: ${status}${passed ? ` (Passed: ${passed})` : ''}\n${stderr}\n${stdout}`.trim();
  }

  // Sanitize previous hints to prevent duplicates and token bloat
  const sanitizedPrevHints = (Array.isArray(previousHints) ? previousHints : [])
    .map((h) => (typeof h === 'string' ? h : h?.hintText || h?.text || ''))
    .filter(Boolean)
    .slice(-5) // Keep last 5 hints
    .map((h, i) => `[Previous Hint ${i + 1}]: ${h.slice(0, 500)}`);

  // Sanitize previous attempts summary
  const attemptCount = Array.isArray(previousAttempts)
    ? previousAttempts.length
    : typeof previousAttempts === 'number'
    ? previousAttempts
    : 0;

  return {
    problemTitle,
    problemDesc,
    constraints,
    studentCode: code.slice(0, 32768),
    language: String(language || 'javascript').slice(0, 30),
    judgeSummary,
    previousHintsList: sanitizedPrevHints,
    attemptCount,
    hintLevel: normalizedLevel,
  };
}

/**
 * Builds the prompt and system instruction for progressive hint generation.
 */
function buildHintPrompt(inputs) {
  const stageInfo = HINT_STAGES[inputs.hintLevel];

  const systemInstruction = `You are a world-class Computer Science educator and Socratic technical assessment coach.
Your primary directive is to guide candidates toward solving algorithmic challenges on their own through carefully calibrated, progressive nudges.

PEDAGOGICAL DIRECTIVES:
1. PROGRESSIVE CALIBRATION:
   - Level 1 (Conceptual Clue): Offer a high-level nudge about the problem's underlying mental model, invariants, or mathematical properties. DO NOT name specific data structures, algorithms, or write any code.
   - Level 2 (Algorithmic Direction): Recommend specific algorithmic paradigms, optimal data structure patterns, or time/space trade-offs (e.g. "Consider maintaining a Hash Map to store complement values so lookups take O(1)").
   - Level 3 (Specific Guidance): Point out the exact logical boundary, syntax misunderstanding, off-by-one condition, or loop termination gap in their current code. DO NOT rewrite the complete function.
2. STRICT ANTI-SPOIL POLICY:
   - NEVER write out the complete solution or full working functions.
   - Limit code references to small pseudocode snippets or short 1-line fragments.
3. PREVENT REPETITION:
   - Review previous hints thoroughly. Provide fresh guidance that advances beyond what was already communicated.
4. NO FABRICATION:
   - Base all diagnostics exclusively on the provided problem, student code, and actual judge results.`;

  let prompt = `Provide a Level ${inputs.hintLevel} (${stageInfo.label}) hint for the student.

--- PROBLEM CONTEXT ---
Title: ${inputs.problemTitle}
Description:
${inputs.problemDesc}

Constraints:
${inputs.constraints}

--- CANDIDATE CURRENT CODE (${inputs.language}) ---
\`\`\`${inputs.language}
${inputs.studentCode}
\`\`\`

--- AVAILABLE JUDGE EXECUTION RESULTS ---
${inputs.judgeSummary}

--- CANDIDATE ATTEMPT HISTORY ---
Total attempts made: ${inputs.attemptCount}
`;

  if (inputs.previousHintsList.length > 0) {
    prompt += `\n--- PREVIOUS HINTS ALREADY DELIVERED (DO NOT REPEAT) ---\n${inputs.previousHintsList.join('\n')}\n`;
  }

  prompt += `\nTarget Hint Level: ${inputs.hintLevel} (${stageInfo.label})
Generate the response strictly according to the required JSON schema with:
- hintLevel: exactly ${inputs.hintLevel}
- stageLabel: exactly "${stageInfo.label}"
- concept: the relevant computer science concept being tested
- hintText: progressive Socratic guidance matching Level ${inputs.hintLevel} criteria
- rationale: concise pedagogical reasoning based on the candidate's current draft and errors`;

  return { prompt, systemInstruction };
}

/**
 * Generates an adaptive, progressive hint for a student based on problem state, current draft, and judge output.
 *
 * @param {Object} options
 * @param {Object} options.problem - Problem details (title, description, constraints)
 * @param {string} options.code - Student's current draft code
 * @param {string} [options.language='javascript'] - Programming language
 * @param {Object} [options.judgeResults] - Raw sandbox execution results
 * @param {Array|number} [options.previousAttempts] - History of attempts
 * @param {Array} [options.previousHints] - Prior hints already delivered
 * @param {number} [options.hintLevel=1] - Requested hint level (1, 2, or 3)
 * @param {string} [options.model] - Optional model override
 * @returns {Promise<Object>} Formatted and validated hint output envelope
 */
export async function generateAdaptiveHint(options) {
  const sanitized = sanitizeHintInputs(options);
  const { prompt, systemInstruction } = buildHintPrompt(sanitized);

  const result = await generateGeminiContent({
    prompt,
    systemInstruction,
    responseSchema: hintResponseSchema,
    validator: validateHintOutput,
    model: options.model,
    temperature: 0.2, // Low temperature for consistent, focused educational reasoning
    timeoutMs: options.timeoutMs || 30000,
    maxRetries: options.maxRetries !== undefined ? options.maxRetries : 2,
  });

  const parsedData = result.data;

  // Enrich with stage metadata and next level indicator
  const nextAvailableLevel = sanitized.hintLevel < 3 ? sanitized.hintLevel + 1 : null;

  return {
    hint: {
      hintLevel: parsedData.hintLevel,
      stageLabel: parsedData.stageLabel || HINT_STAGES[parsedData.hintLevel]?.label,
      concept: parsedData.concept,
      hintText: parsedData.hintText,
      rationale: parsedData.rationale,
      nextAvailableLevel,
      hasMoreHints: nextAvailableLevel !== null,
    },
    metrics: {
      latencyMs: result.latencyMs,
      usage: result.usage,
      model: result.model,
      retriesAttempted: result.retriesAttempted,
    },
  };
}
