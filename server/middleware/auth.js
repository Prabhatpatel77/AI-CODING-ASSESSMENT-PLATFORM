/**
 * Authentication and Role-Based Access Control (RBAC) Middleware
 */

import { verifyToken } from '../services/jwtService.js';
import { findUserById } from '../services/userRepository.js';

/**
 * Middleware to authenticate requests using JWT in Authorization header.
 * Attaches req.user upon successful verification.
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1].trim();
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'].trim();
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Authentication required. Please provide a valid Bearer token.',
      });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      const isExpired = jwtErr.name === 'TokenExpiredError';
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: isExpired ? 'Authentication token has expired. Please log in again.' : 'Invalid authentication token.',
      });
    }

    // Load active user from repository
    const user = await findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'User account associated with this token no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    // Attach safe user object to request
    req.user = typeof user.toSafeObject === 'function' ? user.toSafeObject() : user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware to restrict route access to specific user roles.
 * Must be used after authenticate middleware.
 *
 * @param {...string} allowedRoles - e.g. 'faculty', 'admin'
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Authentication required prior to role verification.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] roles. Your role is '${req.user.role}'.`,
      });
    }

    next();
  };
}
