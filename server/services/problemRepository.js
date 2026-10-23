/**
 * Problem Repository Adapter
 * Delegates to Mongoose Problem model when MongoDB is connected,
 * and maintains an in-memory collection with seeded algorithmic challenges
 * when running in local standalone development mode.
 */

import mongoose from 'mongoose';
import { Problem } from '../models/Problem.js';

// In-memory fallback collection for standalone/offline execution
const memoryProblems = new Map();

/**
 * Generates a URL-friendly slug from a title string
 *
 * @param {string} title
 * @returns {string} URL slug
 */
export function generateSlug(title) {
  if (!title || typeof title !== 'string') return '';
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Sanitizes problem representation for student / public consumption.
 * CRITICAL SECURITY: Permanently removes test cases where isHidden is true.
 */
export function sanitizeProblemForPublic(problem) {
  if (!problem) return null;

  if (typeof problem.toPublicObject === 'function') {
    return problem.toPublicObject();
  }

  const allTestCases = problem.testCases || [];
  const visibleTestCases = allTestCases
    .filter((tc) => !tc.isHidden)
    .map((tc) => ({
      id: tc.id,
      input: tc.input,
      inputStr: tc.inputStr || '',
      expectedOutput: tc.expectedOutput,
      isHidden: false,
      explanation: tc.explanation || '',
    }));

  const hiddenCount = allTestCases.filter((tc) => tc.isHidden).length;

  return {
    id: problem.id || problem._id?.toString(),
    title: problem.title,
    slug: problem.slug,
    description: problem.description,
    constraints: problem.constraints || [],
    difficulty: problem.difficulty,
    topics: problem.topics || [],
    examples: problem.examples || [],
    starterCode: problem.starterCode || {},
    supportedLanguages: problem.supportedLanguages || ['javascript', 'python'],
    status: problem.status,
    visibleTestCases,
    hiddenTestCasesCount: hiddenCount,
    createdAt: problem.createdAt,
    updatedAt: problem.updatedAt,
  };
}

/**
 * Sanitizes problem representation for faculty / admin inspection,
 * including all test fixtures (visible + hidden) and authoring details.
 */
export function sanitizeProblemForFaculty(problem) {
  if (!problem) return null;

  if (typeof problem.toFacultyObject === 'function') {
    return problem.toFacultyObject();
  }

  return {
    id: problem.id || problem._id?.toString(),
    title: problem.title,
    slug: problem.slug,
    description: problem.description,
    constraints: problem.constraints || [],
    difficulty: problem.difficulty,
    topics: problem.topics || [],
    examples: problem.examples || [],
    starterCode: problem.starterCode || {},
    supportedLanguages: problem.supportedLanguages || ['javascript', 'python'],
    testCases: problem.testCases || [],
    status: problem.status,
    author: problem.author || 'system',
    createdAt: problem.createdAt,
    updatedAt: problem.updatedAt,
  };
}

/**
 * Seed initial sample problems into memory store
 */
function seedInitialProblems() {
  if (memoryProblems.size > 0) return;

  const seeds = [
    {
      id: 'prob_two_sum',
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'Easy',
      status: 'published',
      topics: ['Arrays', 'Hash Table'],
      description:
        'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
      constraints: [
        '2 <= nums.length <= 10^4',
        '-10^9 <= nums[i] <= 10^9',
        '-10^9 <= target <= 10^9',
        'Only one valid answer exists.',
      ],
      examples: [
        {
          input: 'nums = [2,7,11,15], target = 9',
          output: '[0,1]',
          explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
        },
        {
          input: 'nums = [3,2,4], target = 6',
          output: '[1,2]',
          explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].',
        },
      ],
      starterCode: {
        javascript:
          '/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n  // Implement your solution here\n}\n',
        python:
          'class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Implement your solution here\n        pass\n',
      },
      supportedLanguages: ['javascript', 'python'],
      testCases: [
        {
          id: 'tc_1',
          input: { nums: [2, 7, 11, 15], target: 9 },
          inputStr: 'nums = [2, 7, 11, 15], target = 9',
          expectedOutput: [0, 1],
          isHidden: false,
          explanation: 'Basic example test',
        },
        {
          id: 'tc_2',
          input: { nums: [3, 2, 4], target: 6 },
          inputStr: 'nums = [3, 2, 4], target = 6',
          expectedOutput: [1, 2],
          isHidden: false,
          explanation: 'Duplicate value target',
        },
        {
          id: 'tc_hidden_3',
          input: { nums: [-1, -2, -3, -4, -5], target: -8 },
          inputStr: 'nums = [-1, -2, -3, -4, -5], target = -8',
          expectedOutput: [2, 4],
          isHidden: true,
          explanation: 'Negative integers edge case',
        },
        {
          id: 'tc_hidden_4',
          input: { nums: [0, 4, 3, 0], target: 0 },
          inputStr: 'nums = [0, 4, 3, 0], target = 0',
          expectedOutput: [0, 3],
          isHidden: true,
          explanation: 'Zero values edge case',
        },
      ],
      author: 'system',
      createdAt: new Date('2026-01-10T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-01-10T10:00:00Z').toISOString(),
    },
    {
      id: 'prob_valid_parentheses',
      title: 'Valid Parentheses',
      slug: 'valid-parentheses',
      difficulty: 'Easy',
      status: 'published',
      topics: ['String', 'Stack'],
      description:
        'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
      constraints: [
        '1 <= s.length <= 10^4',
        's consists of parentheses only: ()[]{}',
      ],
      examples: [
        {
          input: 's = "()"',
          output: 'true',
          explanation: 'Simple matched parentheses pair.',
        },
        {
          input: 's = "()[]{}"',
          output: 'true',
          explanation: 'All pairs properly closed in order.',
        },
        {
          input: 's = "(]"',
          output: 'false',
          explanation: 'Mismatched closing bracket type.',
        },
      ],
      starterCode: {
        javascript:
          '/**\n * @param {string} s\n * @return {boolean}\n */\nfunction isValid(s) {\n  // Implement your solution here\n}\n',
        python:
          'class Solution:\n    def isValid(self, s: str) -> bool:\n        # Implement your solution here\n        pass\n',
      },
      supportedLanguages: ['javascript', 'python'],
      testCases: [
        {
          id: 'tc_1',
          input: { s: '()' },
          inputStr: 's = "()"',
          expectedOutput: true,
          isHidden: false,
        },
        {
          id: 'tc_2',
          input: { s: '()[]{}' },
          inputStr: 's = "()[]{}"',
          expectedOutput: true,
          isHidden: false,
        },
        {
          id: 'tc_hidden_3',
          input: { s: '([)]' },
          inputStr: 's = "([)]"',
          expectedOutput: false,
          isHidden: true,
          explanation: 'Interleaved bracket ordering failure',
        },
      ],
      author: 'system',
      createdAt: new Date('2026-01-12T14:30:00Z').toISOString(),
      updatedAt: new Date('2026-01-12T14:30:00Z').toISOString(),
    },
    {
      id: 'prob_merge_intervals_draft',
      title: 'Merge Intervals Draft',
      slug: 'merge-intervals-draft',
      difficulty: 'Medium',
      status: 'draft',
      topics: ['Array', 'Sorting'],
      description:
        'Given an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
      constraints: [
        '1 <= intervals.length <= 10^4',
        'intervals[i].length == 2',
        '0 <= starti <= endi <= 10^4',
      ],
      examples: [
        {
          input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]',
          output: '[[1,6],[8,10],[15,18]]',
          explanation: 'Since intervals [1,3] and [2,6] overlap, merge them into [1,6].',
        },
      ],
      starterCode: {
        javascript: 'function merge(intervals) {\n  // Code\n}\n',
        python: 'def merge(intervals):\n    pass\n',
      },
      supportedLanguages: ['javascript', 'python'],
      testCases: [
        {
          id: 'tc_1',
          input: { intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] },
          expectedOutput: [[1, 6], [8, 10], [15, 18]],
          isHidden: false,
        },
        {
          id: 'tc_hidden_2',
          input: { intervals: [[1, 4], [4, 5]] },
          expectedOutput: [[1, 5]],
          isHidden: true,
        },
      ],
      author: 'system',
      createdAt: new Date('2026-01-15T11:00:00Z').toISOString(),
      updatedAt: new Date('2026-01-15T11:00:00Z').toISOString(),
    },
    {
      id: 'prob_reverse_linked_list',
      title: 'Reverse Linked List',
      slug: 'reverse-linked-list',
      difficulty: 'Easy',
      status: 'published',
      topics: ['Linked List', 'Recursion'],
      description:
        'Given the `head` of a singly linked list, reverse the list, and return the reversed list.',
      constraints: [
        'The number of nodes in the list is the range [0, 5000].',
        '-5000 <= Node.val <= 5000',
      ],
      examples: [
        {
          input: 'head = [1,2,3,4,5]',
          output: '[5,4,3,2,1]',
          explanation: 'Reversing the direction of pointers yields 5->4->3->2->1.',
        },
        {
          input: 'head = [1,2]',
          output: '[2,1]',
        },
      ],
      starterCode: {
        javascript:
          '/**\n * Definition for singly-linked list.\n * function ListNode(val, next) { this.val = val; this.next = next; }\n */\nfunction reverseList(head) {\n  // Implement solution\n}\n',
        python:
          'class Solution:\n    def reverseList(self, head):\n        # Implement solution\n        pass\n',
      },
      supportedLanguages: ['javascript', 'python'],
      testCases: [
        {
          id: 'tc_1',
          input: { head: [1, 2, 3, 4, 5] },
          inputStr: 'head = [1,2,3,4,5]',
          expectedOutput: [5, 4, 3, 2, 1],
          isHidden: false,
        },
        {
          id: 'tc_hidden_2',
          input: { head: [] },
          inputStr: 'head = []',
          expectedOutput: [],
          isHidden: true,
          explanation: 'Empty list edge case',
        },
      ],
      author: 'system',
      createdAt: new Date('2026-01-18T09:00:00Z').toISOString(),
      updatedAt: new Date('2026-01-18T09:00:00Z').toISOString(),
    },
    {
      id: 'prob_longest_substring',
      title: 'Longest Substring Without Repeating Characters',
      slug: 'longest-substring-without-repeating-characters',
      difficulty: 'Medium',
      status: 'published',
      topics: ['Hash Table', 'String', 'Sliding Window'],
      description:
        'Given a string `s`, find the length of the longest substring without duplicate characters.',
      constraints: [
        '0 <= s.length <= 5 * 10^4',
        's consists of English letters, digits, symbols and spaces.',
      ],
      examples: [
        {
          input: 's = "abcabcbb"',
          output: '3',
          explanation: 'The answer is "abc", with the length of 3.',
        },
        {
          input: 's = "bbbbb"',
          output: '1',
          explanation: 'The answer is "b", with the length of 1.',
        },
        {
          input: 's = "pwwkew"',
          output: '3',
          explanation: 'The answer is "wke", with the length of 3.',
        },
      ],
      starterCode: {
        javascript:
          'function lengthOfLongestSubstring(s) {\n  // Implement sliding window\n}\n',
        python:
          'class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        pass\n',
      },
      supportedLanguages: ['javascript', 'python'],
      testCases: [
        {
          id: 'tc_1',
          input: { s: 'abcabcbb' },
          inputStr: 's = "abcabcbb"',
          expectedOutput: 3,
          isHidden: false,
        },
        {
          id: 'tc_hidden_2',
          input: { s: ' ' },
          inputStr: 's = " "',
          expectedOutput: 1,
          isHidden: true,
          explanation: 'Whitespace single character boundary',
        },
      ],
      author: 'system',
      createdAt: new Date('2026-01-20T16:00:00Z').toISOString(),
      updatedAt: new Date('2026-01-20T16:00:00Z').toISOString(),
    },
    {
      id: 'prob_trapping_rain_water',
      title: 'Trapping Rain Water',
      slug: 'trapping-rain-water',
      difficulty: 'Hard',
      status: 'published',
      topics: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack'],
      description:
        'Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.',
      constraints: [
        'n == height.length',
        '1 <= n <= 2 * 10^4',
        '0 <= height[i] <= 10^5',
      ],
      examples: [
        {
          input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
          output: '6',
          explanation: '6 units of rain water are trapped between elevation bars.',
        },
        {
          input: 'height = [4,2,0,3,2,5]',
          output: '9',
        },
      ],
      starterCode: {
        javascript:
          'function trap(height) {\n  // Implement two-pointer optimization\n}\n',
        python:
          'class Solution:\n    def trap(self, height: list[int]) -> int:\n        pass\n',
      },
      supportedLanguages: ['javascript', 'python'],
      testCases: [
        {
          id: 'tc_1',
          input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
          inputStr: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
          expectedOutput: 6,
          isHidden: false,
        },
        {
          id: 'tc_hidden_2',
          input: { height: [4, 2, 0, 3, 2, 5] },
          inputStr: 'height = [4,2,0,3,2,5]',
          expectedOutput: 9,
          isHidden: true,
        },
      ],
      author: 'system',
      createdAt: new Date('2026-01-25T12:00:00Z').toISOString(),
      updatedAt: new Date('2026-01-25T12:00:00Z').toISOString(),
    },
  ];

  seeds.forEach((p) => memoryProblems.set(p.slug, p));
}

// Auto-seed in-memory collection on startup
seedInitialProblems();

const DIFFICULTY_WEIGHT = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

/**
 * Find all problems with filtering, sorting, and pagination
 */
export async function findAllProblems({
  status,
  difficulty,
  topic,
  search,
  sortBy = 'newest',
  page = 1,
  limit = 20,
  isFacultyOrAdmin = false,
} = {}) {
  // If MongoDB connected:
  if (mongoose.connection.readyState === 1) {
    const query = {};

    // Students only ever see 'published'
    if (!isFacultyOrAdmin) {
      query.status = 'published';
    } else if (status && status !== 'all') {
      query.status = status;
    }

    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty;
    }

    if (topic && topic !== 'all') {
      query.topics = topic;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === 'oldest') sortOption = { createdAt: 1 };
    else if (sortBy === 'title_asc') sortOption = { title: 1 };
    else if (sortBy === 'title_desc') sortOption = { title: -1 };

    const docs = await Problem.find(query).sort(sortOption).exec();
    let sanitized = docs.map((doc) =>
      isFacultyOrAdmin ? doc.toFacultyObject() : doc.toPublicObject()
    );

    if (sortBy === 'difficulty_asc') {
      sanitized.sort((a, b) => (DIFFICULTY_WEIGHT[a.difficulty] || 0) - (DIFFICULTY_WEIGHT[b.difficulty] || 0));
    } else if (sortBy === 'difficulty_desc') {
      sanitized.sort((a, b) => (DIFFICULTY_WEIGHT[b.difficulty] || 0) - (DIFFICULTY_WEIGHT[a.difficulty] || 0));
    }

    const totalCount = sanitized.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = sanitized.slice(startIndex, startIndex + limitNum);

    return {
      problems: paginated,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
    };
  }

  // In-memory fallback
  seedInitialProblems();
  const results = [];

  for (const prob of memoryProblems.values()) {
    // Permission filter
    if (!isFacultyOrAdmin && prob.status !== 'published') {
      continue;
    }

    if (isFacultyOrAdmin && status && status !== 'all' && prob.status !== status) {
      continue;
    }

    if (difficulty && difficulty !== 'all' && prob.difficulty !== difficulty) {
      continue;
    }

    if (topic && topic !== 'all' && (!prob.topics || !prob.topics.includes(topic))) {
      continue;
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const titleMatch = prob.title.toLowerCase().includes(q);
      const descMatch = (prob.description || '').toLowerCase().includes(q);
      const topicMatch = (prob.topics || []).some((t) => t.toLowerCase().includes(q));
      if (!titleMatch && !descMatch && !topicMatch) {
        continue;
      }
    }

    results.push(isFacultyOrAdmin ? sanitizeProblemForFaculty(prob) : sanitizeProblemForPublic(prob));
  }

  // Sorting
  if (sortBy === 'oldest') {
    results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortBy === 'title_asc') {
    results.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'title_desc') {
    results.sort((a, b) => b.title.localeCompare(a.title));
  } else if (sortBy === 'difficulty_asc') {
    results.sort((a, b) => (DIFFICULTY_WEIGHT[a.difficulty] || 0) - (DIFFICULTY_WEIGHT[b.difficulty] || 0));
  } else if (sortBy === 'difficulty_desc') {
    results.sort((a, b) => (DIFFICULTY_WEIGHT[b.difficulty] || 0) - (DIFFICULTY_WEIGHT[a.difficulty] || 0));
  } else {
    // newest default
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const totalCount = results.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = results.slice(startIndex, startIndex + limitNum);

  return {
    problems: paginated,
    totalCount,
    page: pageNum,
    totalPages: Math.ceil(totalCount / limitNum) || 1,
  };
}

/**
 * Find a problem by ID or Slug
 */
export async function findProblemByIdOrSlug(idOrSlug, { isFacultyOrAdmin = false } = {}) {
  if (!idOrSlug) return null;

  if (mongoose.connection.readyState === 1) {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
    const query = isObjectId ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug };

    const doc = await Problem.findOne(query).exec();
    if (!doc) return null;

    // Access check: students can only view published problems
    if (!isFacultyOrAdmin && doc.status !== 'published') {
      return null;
    }

    return isFacultyOrAdmin ? doc.toFacultyObject() : doc.toPublicObject();
  }

  // In-memory fallback
  seedInitialProblems();
  let found = memoryProblems.get(idOrSlug);

  if (!found) {
    for (const p of memoryProblems.values()) {
      if (p.id === idOrSlug || p.slug === idOrSlug) {
        found = p;
        break;
      }
    }
  }

  if (!found) return null;

  if (!isFacultyOrAdmin && found.status !== 'published') {
    return null;
  }

  return isFacultyOrAdmin ? sanitizeProblemForFaculty(found) : sanitizeProblemForPublic(found);
}

/**
 * Find a problem for isolated backend test evaluation.
 * Returns problem with full testCases collection (both visible and hidden)
 * strictly for server-side sandbox execution.
 * CRITICAL: NEVER return this object directly to client HTTP responses!
 *
 * @param {string} idOrSlug
 * @returns {Promise<Object|null>}
 */
export async function findProblemForEvaluation(idOrSlug) {
  if (!idOrSlug) return null;

  if (mongoose.connection.readyState === 1) {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
    const query = isObjectId ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug };
    const doc = await Problem.findOne(query).exec();
    if (!doc || doc.status !== 'published') return null;
    return doc.toObject();
  }

  seedInitialProblems();
  let found = memoryProblems.get(idOrSlug);
  if (!found) {
    for (const p of memoryProblems.values()) {
      if (p.id === idOrSlug || p.slug === idOrSlug) {
        found = p;
        break;
      }
    }
  }

  if (!found || found.status !== 'published') return null;
  return found;
}

/**
 * Create a new problem (Faculty or Admin only)
 */
export async function createProblem(data, authorId = 'faculty') {
  const slug = generateSlug(data.slug || data.title);

  if (mongoose.connection.readyState === 1) {
    const problem = new Problem({
      ...data,
      slug,
      author: authorId,
    });
    await problem.save();
    return problem.toFacultyObject();
  }

  // In-memory fallback
  seedInitialProblems();
  if (memoryProblems.has(slug)) {
    const err = new Error(`Problem with slug '${slug}' already exists.`);
    err.code = 11000;
    throw err;
  }

  const newId = 'prob_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const newProblem = {
    id: newId,
    title: data.title.trim(),
    slug,
    description: data.description.trim(),
    constraints: data.constraints || [],
    difficulty: data.difficulty || 'Easy',
    topics: data.topics || [],
    examples: data.examples || [],
    starterCode: data.starterCode || {
      javascript: '// Write your solution here\nfunction solution() {\n\n}\n',
      python: '# Write your solution here\ndef solution():\n    pass\n',
    },
    supportedLanguages: data.supportedLanguages || ['javascript', 'python'],
    testCases: (data.testCases || []).map((tc, idx) => ({
      id: tc.id || `tc_${idx + 1}`,
      input: tc.input,
      inputStr: tc.inputStr || '',
      expectedOutput: tc.expectedOutput,
      isHidden: Boolean(tc.isHidden),
      explanation: tc.explanation || '',
    })),
    status: data.status || 'draft',
    author: authorId,
    createdAt: now,
    updatedAt: now,
  };

  memoryProblems.set(slug, newProblem);
  return sanitizeProblemForFaculty(newProblem);
}

/**
 * Update an existing problem (Faculty or Admin only)
 */
export async function updateProblem(idOrSlug, updateData) {
  if (mongoose.connection.readyState === 1) {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
    const query = isObjectId ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug };

    const doc = await Problem.findOne(query).exec();
    if (!doc) return null;

    if (updateData.title && updateData.title !== doc.title) {
      doc.title = updateData.title.trim();
    }
    if (updateData.slug && updateData.slug !== doc.slug) {
      doc.slug = generateSlug(updateData.slug);
    }
    if (updateData.description !== undefined) doc.description = updateData.description.trim();
    if (updateData.constraints !== undefined) doc.constraints = updateData.constraints;
    if (updateData.difficulty !== undefined) doc.difficulty = updateData.difficulty;
    if (updateData.topics !== undefined) doc.topics = updateData.topics;
    if (updateData.examples !== undefined) doc.examples = updateData.examples;
    if (updateData.starterCode !== undefined) doc.starterCode = updateData.starterCode;
    if (updateData.supportedLanguages !== undefined) doc.supportedLanguages = updateData.supportedLanguages;
    if (updateData.testCases !== undefined) doc.testCases = updateData.testCases;
    if (updateData.status !== undefined) doc.status = updateData.status;

    await doc.save();
    return doc.toFacultyObject();
  }

  // In-memory fallback
  seedInitialProblems();
  let existingKey = null;
  let target = memoryProblems.get(idOrSlug);

  if (target) {
    existingKey = idOrSlug;
  } else {
    for (const [key, p] of memoryProblems.entries()) {
      if (p.id === idOrSlug || p.slug === idOrSlug) {
        target = p;
        existingKey = key;
        break;
      }
    }
  }

  if (!target) return null;

  const newSlug = updateData.slug ? generateSlug(updateData.slug) : target.slug;
  if (newSlug !== target.slug && memoryProblems.has(newSlug)) {
    const err = new Error(`Problem with slug '${newSlug}' already exists.`);
    err.code = 11000;
    throw err;
  }

  const updated = {
    ...target,
    ...updateData,
    slug: newSlug,
    title: updateData.title !== undefined ? updateData.title.trim() : target.title,
    description: updateData.description !== undefined ? updateData.description.trim() : target.description,
    testCases: updateData.testCases !== undefined ? updateData.testCases : target.testCases,
    updatedAt: new Date().toISOString(),
  };

  if (existingKey !== newSlug) {
    memoryProblems.delete(existingKey);
  }
  memoryProblems.set(newSlug, updated);

  return sanitizeProblemForFaculty(updated);
}

/**
 * Delete a problem by ID or Slug (Faculty or Admin only)
 */
export async function deleteProblem(idOrSlug) {
  if (mongoose.connection.readyState === 1) {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
    const query = isObjectId ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug };
    const res = await Problem.findOneAndDelete(query).exec();
    return Boolean(res);
  }

  // In-memory fallback
  seedInitialProblems();
  let deleted = false;
  if (memoryProblems.has(idOrSlug)) {
    memoryProblems.delete(idOrSlug);
    deleted = true;
  } else {
    for (const [key, p] of memoryProblems.entries()) {
      if (p.id === idOrSlug || p.slug === idOrSlug) {
        memoryProblems.delete(key);
        deleted = true;
        break;
      }
    }
  }

  return deleted;
}

/**
 * Retrieves list of problem slugs authored by a specific user/faculty.
 * Used for role-based assignment and submission access control.
 *
 * @param {string} authorId
 * @returns {Promise<Array<string>>}
 */
export async function getProblemSlugsByAuthor(authorId) {
  if (!authorId) return [];
  if (mongoose.connection.readyState === 1) {
    const docs = await Problem.find({ author: authorId }).select('slug').lean().exec();
    return docs.map((d) => d.slug);
  }
  seedInitialProblems();
  const slugs = [];
  for (const prob of memoryProblems.values()) {
    if (String(prob.author) === String(authorId)) {
      slugs.push(prob.slug);
    }
  }
  return slugs;
}

/**
 * Reset memory store (useful for clean test runs)
 */
export function resetMemoryProblems() {
  memoryProblems.clear();
  seedInitialProblems();
}
