/**
 * JWT Authentication Token Utility
 * Signs and verifies JSON Web Tokens using JWT_SECRET from environment variables.
 */

import jwt from 'jsonwebtoken';

const DEFAULT_DEV_SECRET = 'devassess_insecure_development_jwt_secret_key_change_in_production_32char';

/**
 * Retrieves the JWT Secret from environment variables.
 * Emits a warning if using default development secret.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable must be set in production.');
    }
    return DEFAULT_DEV_SECRET;
  }
  return secret.trim();
}

/**
 * Generate a signed JWT token for an authenticated user
 *
 * @param {Object} payload - User identification and role
 * @param {string} payload.id - User ID
 * @param {string} payload.role - User role
 * @returns {string} Signed JWT
 */
export function generateToken(payload) {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: payload.id || payload._id,
      role: payload.role,
    },
    secret,
    { expiresIn }
  );
}

/**
 * Verifies and decodes a JWT token
 *
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyToken(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}
