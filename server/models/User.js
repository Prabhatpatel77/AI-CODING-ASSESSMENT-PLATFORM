/**
 * Mongoose User Model
 * Includes input validation, unique normalized email, secure bcrypt password hashing,
 * and controlled roles (student, faculty, admin).
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Never return password hash in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'faculty', 'admin'],
        message: 'Role must be student, faculty, or admin',
      },
      default: 'student',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Strip password and internal fields whenever document is converted to JSON
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Pre-save hook: Hash password with bcrypt before saving to database
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method: Verify candidate password against hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    throw new Error('Password hash not loaded on document for comparison.');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe presentation helper: Extracts user data without any sensitive fields
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id ? this._id.toString() : this.id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
