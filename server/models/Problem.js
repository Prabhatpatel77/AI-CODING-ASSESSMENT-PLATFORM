/**
 * Mongoose Problem Model
 * Defines the coding challenge schema with markdown statements, constraints,
 * difficulty ratings, topic tags, starter templates, and secure test case references.
 */

import mongoose from 'mongoose';

const exampleSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: [true, 'Example input string is required'],
      trim: true,
    },
    output: {
      type: String,
      required: [true, 'Example output string is required'],
      trim: true,
    },
    explanation: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const testCaseSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Test case ID is required'],
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Test case input is required'],
    },
    inputStr: {
      type: String,
      default: '',
    },
    expectedOutput: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Expected output is required'],
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    explanation: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Problem slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Problem description markdown is required'],
      trim: true,
    },
    constraints: {
      type: [String],
      default: [],
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty is required'],
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: 'Difficulty must be Easy, Medium, or Hard',
      },
      index: true,
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
    examples: {
      type: [exampleSchema],
      default: [],
    },
    starterCode: {
      javascript: {
        type: String,
        default: '// Write your solution here\nfunction solution() {\n\n}\n',
      },
      python: {
        type: String,
        default: '# Write your solution here\ndef solution():\n    pass\n',
      },
    },
    supportedLanguages: {
      type: [String],
      default: ['javascript', 'python'],
    },
    testCases: {
      type: [testCaseSchema],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'archived'],
        message: 'Status must be draft, published, or archived',
      },
      default: 'draft',
      index: true,
    },
    author: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Returns safe public problem payload for students and public callers.
 * CRITICAL SECURITY RULE: Hidden test cases are completely stripped from responses.
 */
problemSchema.methods.toPublicObject = function () {
  const visibleTestCases = (this.testCases || [])
    .filter((tc) => !tc.isHidden)
    .map((tc) => ({
      id: tc.id,
      input: tc.input,
      inputStr: tc.inputStr || '',
      expectedOutput: tc.expectedOutput,
      isHidden: false,
      explanation: tc.explanation || '',
    }));

  const totalHiddenCount = (this.testCases || []).filter((tc) => tc.isHidden).length;

  return {
    id: this._id ? this._id.toString() : this.id,
    title: this.title,
    slug: this.slug,
    description: this.description,
    constraints: this.constraints || [],
    difficulty: this.difficulty,
    topics: this.topics || [],
    examples: this.examples || [],
    starterCode: this.starterCode || {},
    supportedLanguages: this.supportedLanguages || ['javascript', 'python'],
    status: this.status,
    visibleTestCases,
    hiddenTestCasesCount: totalHiddenCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Returns comprehensive problem payload for authorized faculty and administrators,
 * including all authoring test fixtures (both visible and hidden).
 */
problemSchema.methods.toFacultyObject = function () {
  return {
    id: this._id ? this._id.toString() : this.id,
    title: this.title,
    slug: this.slug,
    description: this.description,
    constraints: this.constraints || [],
    difficulty: this.difficulty,
    topics: this.topics || [],
    examples: this.examples || [],
    starterCode: this.starterCode || {},
    supportedLanguages: this.supportedLanguages || ['javascript', 'python'],
    testCases: this.testCases || [],
    status: this.status,
    author: this.author,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Problem = mongoose.models.Problem || mongoose.model('Problem', problemSchema);
