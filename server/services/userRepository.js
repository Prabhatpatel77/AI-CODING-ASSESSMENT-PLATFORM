/**
 * User Repository Adapter
 * Delegates to Mongoose User model when MongoDB is connected,
 * and maintains an in-memory store with bcrypt hashing when running in local standalone mode.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

// In-memory fallback user registry for development when MongoDB is unconfigured
const memoryUsers = new Map();

/**
 * Normalizes email address
 */
export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/**
 * Find user by email (optionally including password for authentication check)
 */
export async function findUserByEmail(email, { includePassword = false } = {}) {
  const normalized = normalizeEmail(email);

  if (mongoose.connection.readyState === 1) {
    const query = User.findOne({ email: normalized });
    if (includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  // In-memory fallback
  const user = memoryUsers.get(normalized);
  if (!user) return null;

  return {
    ...user,
    comparePassword: async (candidate) => bcrypt.compare(candidate, user.password),
    toSafeObject: () => {
      const { password, ...safe } = user;
      return safe;
    },
  };
}

/**
 * Find user by ID
 */
export async function findUserById(id) {
  if (mongoose.connection.readyState === 1) {
    return User.findById(id).exec();
  }

  // In-memory fallback
  for (const user of memoryUsers.values()) {
    if (user.id === id || user._id === id) {
      return {
        ...user,
        toSafeObject: () => {
          const { password, ...safe } = user;
          return safe;
        },
      };
    }
  }
  return null;
}

/**
 * Create a new user with bcrypt password hashing
 */
export async function createUser({ name, email, password, role = 'student' }) {
  const normalized = normalizeEmail(email);

  if (mongoose.connection.readyState === 1) {
    const user = new User({
      name: name.trim(),
      email: normalized,
      password,
      role,
    });
    await user.save();
    return user;
  }

  // In-memory fallback
  if (memoryUsers.has(normalized)) {
    const err = new Error('A user with this email address already exists.');
    err.code = 11000;
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const newUser = {
    id: userId,
    _id: userId,
    name: name.trim(),
    email: normalized,
    password: hashedPassword,
    role,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comparePassword: async (candidate) => bcrypt.compare(candidate, hashedPassword),
    toSafeObject: () => ({
      id: userId,
      name: name.trim(),
      email: normalized,
      role,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  };

  memoryUsers.set(normalized, newUser);
  return newUser;
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(id) {
  const now = new Date();
  if (mongoose.connection.readyState === 1) {
    await User.findByIdAndUpdate(id, { lastLoginAt: now });
  } else {
    for (const user of memoryUsers.values()) {
      if (user.id === id || user._id === id) {
        user.lastLoginAt = now.toISOString();
        break;
      }
    }
  }
}

/**
 * Clear in-memory users (used primarily for test cleanup)
 */
export function resetMemoryUsers() {
  memoryUsers.clear();
}
