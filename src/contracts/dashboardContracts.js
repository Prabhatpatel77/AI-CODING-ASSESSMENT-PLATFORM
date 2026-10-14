/**
 * Student Dashboard Data Contracts & Mock Presets
 * Clearly defines data schemas for student metrics, goals, recommendations, and activity.
 */

/**
 * @typedef {Object} DailyGoal
 * @property {number} targetCount
 * @property {number} completedCount
 * @property {string} label
 */

/**
 * @typedef {Object} ProblemMetrics
 * @property {number} solvedTotal
 * @property {number} attemptedTotal
 * @property {number} easySolved
 * @property {number} mediumSolved
 * @property {number} hardSolved
 * @property {number|null} accuracyRate - percentage (0-100) or null if unattempted
 */

/**
 * @typedef {Object} StreakData
 * @property {number} currentDays
 * @property {number} longestDays
 * @property {boolean[]} weeklyActivity - 7-day array of active days [Mon..Sun]
 */

/**
 * @typedef {Object} ContinueLearningItem
 * @property {string} problemId
 * @property {string} title
 * @property {string} category
 * @property {'Easy'|'Medium'|'Hard'} difficulty
 * @property {string} language
 * @property {number} percentCompleted
 * @property {string} lastWorkedAt
 */

/**
 * @typedef {Object} RecommendedProblem
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {'Easy'|'Medium'|'Hard'} difficulty
 * @property {number} estimatedMinutes
 * @property {string} reason
 */

/**
 * @typedef {Object} UpcomingAssessment
 * @property {string} id
 * @property {string} title
 * @property {string} track
 * @property {number} durationMinutes
 * @property {string} scheduledDate
 * @property {boolean} isMandatory
 */

/**
 * @typedef {Object} RecentActivityItem
 * @property {string} id
 * @property {string} problemTitle
 * @property {'Accepted'|'Wrong Answer'|'In Progress'} status
 * @property {string} timestamp
 * @property {string} language
 */

/**
 * @typedef {Object} StudentDashboardData
 * @property {string} studentName
 * @property {DailyGoal} dailyGoal
 * @property {ProblemMetrics} metrics
 * @property {StreakData} streak
 * @property {ContinueLearningItem|null} continueLearning
 * @property {RecommendedProblem[]} recommendedProblems
 * @property {UpcomingAssessment[]} upcomingAssessments
 * @property {RecentActivityItem[]} recentActivity
 */

/**
 * Pure Empty State for new or unattempted students.
 * Prevents presenting fabricated telemetry as actual student performance.
 */
export const EMPTY_DASHBOARD_DATA = {
  studentName: 'Candidate',
  dailyGoal: {
    targetCount: 2,
    completedCount: 0,
    label: 'Daily Practice Goal',
  },
  metrics: {
    solvedTotal: 0,
    attemptedTotal: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    accuracyRate: null,
  },
  streak: {
    currentDays: 0,
    longestDays: 0,
    weeklyActivity: [false, false, false, false, false, false, false],
  },
  continueLearning: null,
  recommendedProblems: [
    {
      id: 'two-sum',
      title: 'Two Sum',
      category: 'Arrays & Hashing',
      difficulty: 'Easy',
      estimatedMinutes: 15,
      reason: 'Recommended starter problem for hash map patterns',
    },
    {
      id: 'valid-parentheses',
      title: 'Valid Parentheses',
      category: 'Stack',
      difficulty: 'Easy',
      estimatedMinutes: 20,
      reason: 'Essential LIFO data structure practice',
    },
    {
      id: 'longest-substring',
      title: 'Longest Substring Without Repeating Characters',
      category: 'Sliding Window',
      difficulty: 'Medium',
      estimatedMinutes: 30,
      reason: 'Classic two-pointer technique challenge',
    },
  ],
  upcomingAssessments: [],
  recentActivity: [],
};

/**
 * Explicit Demo Preview Dataset.
 * Clearly identified in the UI as sample preview data for inspecting layout behavior.
 */
export const DEMO_PREVIEW_DASHBOARD_DATA = {
  studentName: 'Alex Chen',
  dailyGoal: {
    targetCount: 3,
    completedCount: 2,
    label: 'Daily Practice Goal',
  },
  metrics: {
    solvedTotal: 14,
    attemptedTotal: 18,
    easySolved: 8,
    mediumSolved: 5,
    hardSolved: 1,
    accuracyRate: 77.8,
  },
  streak: {
    currentDays: 4,
    longestDays: 9,
    weeklyActivity: [true, true, true, true, false, false, false],
  },
  continueLearning: {
    problemId: 'merge-intervals',
    title: 'Merge Intervals',
    category: 'Intervals & Sorting',
    difficulty: 'Medium',
    language: 'JavaScript',
    percentCompleted: 65,
    lastWorkedAt: '2 hours ago',
  },
  recommendedProblems: [
    {
      id: 'two-sum',
      title: 'Two Sum',
      category: 'Arrays & Hashing',
      difficulty: 'Easy',
      estimatedMinutes: 15,
      reason: 'High-frequency algorithmic interview staple',
    },
    {
      id: 'longest-substring',
      title: 'Longest Substring Without Repeating Characters',
      category: 'Sliding Window',
      difficulty: 'Medium',
      estimatedMinutes: 30,
      reason: 'Strengthens dynamic sliding window boundaries',
    },
    {
      id: 'trapping-rain-water',
      title: 'Trapping Rain Water',
      category: 'Two Pointers',
      difficulty: 'Hard',
      estimatedMinutes: 45,
      reason: 'Advanced two-pointer array optimization',
    },
  ],
  upcomingAssessments: [
    {
      id: 'midterm-dsa-2026',
      title: 'Data Structures Midterm Assessment',
      track: 'CS 301 - Algorithms',
      durationMinutes: 90,
      scheduledDate: 'Tomorrow at 10:00 AM',
      isMandatory: true,
    },
    {
      id: 'mock-eval-01',
      title: 'Weekly Timed Technical Evaluation',
      track: 'Frontend Engineering Track',
      durationMinutes: 60,
      scheduledDate: 'Friday, 3:00 PM',
      isMandatory: false,
    },
  ],
  recentActivity: [
    {
      id: 'act-1',
      problemTitle: 'Valid Parentheses',
      status: 'Accepted',
      timestamp: 'Today, 11:24 AM',
      language: 'JavaScript',
    },
    {
      id: 'act-2',
      problemTitle: 'Merge Intervals',
      status: 'In Progress',
      timestamp: 'Today, 09:40 AM',
      language: 'JavaScript',
    },
    {
      id: 'act-3',
      problemTitle: 'Reverse Linked List',
      status: 'Accepted',
      timestamp: 'Yesterday, 4:15 PM',
      language: 'Python',
    },
  ],
};
