/**
 * Mongoose Submission Model
 * Records formal candidate code submissions evaluated by the isolated judge engine.
 * Maintains execution metrics, test case verdicts, and strict confidentiality of hidden fixtures.
 */

import mongoose from 'mongoose';

const testResultSummarySchema = new mongoose.Schema(
  {
    testCaseId: {
      type: String,
      default: '',
    },
    testCaseNumber: {
      type: Number,
      required: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    // Only populated for visible test cases; null for hidden cases
    inputStr: {
      type: String,
      default: null,
    },
    expectedOutput: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    actualOutput: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    stdout: {
      type: String,
      default: null,
    },
    stderr: {
      type: String,
      default: null,
    },
    compileOutput: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      sparse: true,
    },
    userId: {
      type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String identifier
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    userName: {
      type: String,
      default: 'Anonymous Candidate',
    },
    problemId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    problemSlug: {
      type: String,
      required: [true, 'Problem slug is required'],
      trim: true,
      index: true,
    },
    problemTitle: {
      type: String,
      required: true,
    },
    assessmentId: {
      type: String,
      default: null,
      index: true,
    },
    assessmentTitle: {
      type: String,
      default: null,
    },
    facultyId: {
      type: String,
      default: null,
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Submission code is required'],
      maxlength: [65536, 'Code exceeds maximum permitted 64 KB limit'],
    },
    language: {
      type: String,
      enum: ['javascript', 'python'],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'RUNNING',
        'ACCEPTED',
        'WRONG_ANSWER',
        'TIME_LIMIT_EXCEEDED',
        'MEMORY_LIMIT_EXCEEDED',
        'COMPILATION_ERROR',
        'RUNTIME_ERROR',
        'INTERNAL_ERROR',
        'UNCONFIGURED',
      ],
      default: 'PENDING',
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    passedTests: {
      type: Number,
      default: 0,
    },
    totalTests: {
      type: Number,
      default: 0,
    },
    hiddenTestsPassed: {
      type: Number,
      default: 0,
    },
    hiddenTestsTotal: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    memoryUsedKb: {
      type: Number,
      default: null,
    },
    testResults: [testResultSummarySchema],
    provider: {
      type: String,
      default: 'unconfigured',
    },
    error: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Optimized compound indexes for large-scale submission history queries and pagination
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ userId: 1, problemSlug: 1, createdAt: -1 });
submissionSchema.index({ problemSlug: 1, createdAt: -1 });
submissionSchema.index({ assessmentId: 1, createdAt: -1 });
submissionSchema.index({ facultyId: 1, createdAt: -1 });
submissionSchema.index({ status: 1, createdAt: -1 });

// Critical pre-save guard: Guarantee hidden test case inputs and expected outputs are NEVER stored in MongoDB
submissionSchema.pre('save', function (next) {
  if (this.testResults && Array.isArray(this.testResults)) {
    for (const tr of this.testResults) {
      if (tr.isHidden) {
        tr.inputStr = null;
        tr.expectedOutput = null;
        tr.actualOutput = null;
        tr.stdout = null;
        tr.stderr = null;
        tr.compileOutput = null;
      }
    }
  }
  next();
});

/**
 * Returns safe JSON representation of a submission.
 * Enforces that hidden test case payloads are NEVER present.
 */
submissionSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  const safeId = obj.id || obj._id?.toString();

  // Redact any possible hidden test details
  const safeTestResults = (obj.testResults || []).map((tr) => {
    if (tr.isHidden) {
      return {
        testCaseNumber: tr.testCaseNumber,
        isHidden: true,
        passed: tr.passed,
        status: tr.status,
        durationMs: tr.durationMs,
      };
    }
    return tr;
  });

  return {
    id: safeId,
    _id: safeId,
    userId: obj.userId,
    userEmail: obj.userEmail,
    userName: obj.userName,
    problemSlug: obj.problemSlug,
    problemTitle: obj.problemTitle,
    assessmentId: obj.assessmentId || null,
    assessmentTitle: obj.assessmentTitle || null,
    facultyId: obj.facultyId || null,
    language: obj.language,
    code: obj.code,
    status: obj.status,
    score: obj.score,
    passedTests: obj.passedTests,
    totalTests: obj.totalTests,
    hiddenTestsPassed: obj.hiddenTestsPassed,
    hiddenTestsTotal: obj.hiddenTestsTotal,
    durationMs: obj.durationMs,
    memoryUsedKb: obj.memoryUsedKb,
    provider: obj.provider,
    testResults: safeTestResults,
    error: obj.error || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

export const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
