/**
 * Authentication Endpoints Router
 * Handles user registration, login, logout, current user retrieval, and role verification.
 */

import express from 'express';
import {
  findUserByEmail,
  createUser,
  updateLastLogin,
} from '../services/userRepository.js';
import { generateToken } from '../services/jwtService.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * Public registration endpoint for students and faculty.
 * Explicitly forbids self-assigning the 'admin' role.
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Name is required and must be at least 2 characters.',
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Name cannot exceed 50 characters.',
      });
    }

    // Validate email
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Please provide a valid email address.',
      });
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Password must be at least 8 characters long.',
      });
    }

    // Ensure password contains both letters and digits for security
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    if (!hasLetters || !hasNumbers) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Password must contain both letters and numbers.',
      });
    }

    // CRITICAL SECURITY CONSTRAINT: Never allow public registration to assign admin role
    if (role === 'admin' || (typeof role === 'string' && role.toLowerCase() === 'admin')) {
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Public registration cannot assign the administrator role. Administrator accounts must be provisioned internally.',
      });
    }

    // Valid public roles: 'student' (default) or 'faculty'
    const assignedRole = role === 'faculty' ? 'faculty' : 'student';

    // Check if user already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: 'A user with this email address already exists.',
      });
    }

    // Create user with securely hashed password
    const user = await createUser({
      name: name.trim(),
      email: email.trim(),
      password,
      role: assignedRole,
    });

    const safeUser = typeof user.toSafeObject === 'function' ? user.toSafeObject() : user;
    const token = generateToken(safeUser);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully.',
      token,
      user: safeUser,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: 'A user with this email address already exists.',
      });
    }
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials and issues a signed JWT.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Please provide both email and password.',
      });
    }

    // Find user with password hash loaded
    const user = await findUserByEmail(email, { includePassword: true });
    if (!user) {
      // Use generic invalid credential message to prevent email enumeration
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Invalid email or password.',
      });
    }

    // Verify password hash with bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Invalid email or password.',
      });
    }

    // Verify account active state
    if (user.isActive === false) {
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Account is deactivated. Please contact an administrator.',
      });
    }

    const userId = user._id ? user._id.toString() : user.id;
    await updateLastLogin(userId);

    const safeUser = typeof user.toSafeObject === 'function' ? user.toSafeObject() : user;
    const token = generateToken(safeUser);

    res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      token,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Session termination endpoint for client state clearance.
 */
router.post('/logout', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully.',
  });
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile using Bearer token.
 */
router.get('/me', authenticate, (req, res) => {
  res.status(200).json({
    status: 'success',
    user: req.user,
  });
});

/**
 * Protected test endpoint for faculty and admin roles
 */
router.get('/faculty-check', authenticate, requireRole('faculty', 'admin'), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Authorized: Access granted to faculty workspace.',
    user: req.user,
  });
});

/**
 * Protected test endpoint for administrator role only
 */
router.get('/admin-check', authenticate, requireRole('admin'), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Authorized: Access granted to administrator controls.',
    user: req.user,
  });
});

export default router;
