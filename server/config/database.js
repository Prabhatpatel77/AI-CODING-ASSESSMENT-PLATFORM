/**
 * Dedicated MongoDB Connection Module (Mongoose)
 * Handles connection lifecycle, credential sanitization, fail-fast configuration checks,
 * and safe diagnostics reporting.
 */

import mongoose from 'mongoose';

/**
 * Sanitizes connection strings and error messages to ensure credentials are never leaked.
 * Replaces credentials (e.g., mongodb+srv://user:pass@host) with (mongodb+srv://user:***@host).
 *
 * @param {string} str - Raw string or error message
 * @returns {string} Sanitized string safe for logging and reporting
 */
export function sanitizeConnectionString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)(.*)(@[^/?#]+)/gi, '$1***$3');
}

/**
 * Human-readable mapping for Mongoose connection ready states
 */
const READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// Internal connection state tracking
let lastConnectionError = null;

// Configure connection lifecycle listeners
mongoose.connection.on('connected', () => {
  lastConnectionError = null;
  console.log('[Database] MongoDB connection established successfully.');
});

mongoose.connection.on('error', (err) => {
  const safeMessage = sanitizeConnectionString(err.message || String(err));
  lastConnectionError = safeMessage;
  console.error('[Database] Connection error occurred:', safeMessage);
});

mongoose.connection.on('disconnected', () => {
  console.log('[Database] MongoDB connection disconnected.');
});

/**
 * Connect to MongoDB using the MONGODB_URI environment variable.
 * Fails clearly if MONGODB_URI is absent or if connection cannot be established.
 *
 * @param {Object} options
 * @param {boolean} [options.exitOnFailure=false] - Whether to terminate process on connection failure
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
export async function connectDatabase({ exitOnFailure = false } = {}) {
  const uri = process.env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    const errorMsg = 'MongoDB configuration missing: MONGODB_URI environment variable is not defined.';
    lastConnectionError = errorMsg;
    console.warn(`[Database] WARNING: ${errorMsg}`);
    console.warn('[Database] Local fallback / stateless mode is active. See .env.example for database setup instructions.');
    if (exitOnFailure) {
      process.exit(1);
    }
    return false;
  }

  const safeUri = sanitizeConnectionString(uri);
  console.log(`[Database] Attempting connection to ${safeUri}...`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000, // Timeout fast after 3 seconds instead of hanging
      connectTimeoutMS: 8000,
      autoIndex: process.env.NODE_ENV !== 'production', // Build indexes in dev only
    });
    lastConnectionError = null;
    return true;
  } catch (err) {
    let safeError = sanitizeConnectionString(err.message || String(err));
    if (safeError.includes('whitelist') || safeError.includes('whitelisted')) {
      safeError = 'MongoDB Atlas IP not whitelisted: Please add 0.0.0.0/0 to your Atlas cluster Network Access list (https://www.mongodb.com/docs/atlas/security-whitelist/)';
    }
    lastConnectionError = safeError;
    console.error(`[Database] Failed to connect to MongoDB: ${safeError}`);

    if (exitOnFailure) {
      console.error('[Database] Exiting process due to database connection failure.');
      process.exit(1);
    }
    return false;
  }
}

/**
 * Returns a sanitized database health status object safe for public consumption.
 * Never exposes credentials, passwords, or connection strings.
 *
 * @returns {Object} Safe database status metadata
 */
export function getDatabaseStatus() {
  const isConfigured = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim());
  const readyStateNum = mongoose.connection.readyState;
  const readyStateStr = READY_STATES[readyStateNum] || 'unknown';

  let status = 'disconnected';
  if (!isConfigured) {
    status = 'unconfigured';
  } else if (readyStateNum === 1) {
    status = 'connected';
  } else if (readyStateNum === 2) {
    status = 'connecting';
  } else if (lastConnectionError) {
    status = 'error';
  }

  return {
    status,
    configured: isConfigured,
    readyState: readyStateStr,
    host: mongoose.connection.host ? mongoose.connection.host : null,
    database: mongoose.connection.name ? mongoose.connection.name : null,
    error: lastConnectionError ? lastConnectionError : null,
  };
}

/**
 * Disconnect cleanly from MongoDB during application shutdown.
 */
export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      console.log('[Database] Cleanly closed MongoDB connection.');
    } catch (err) {
      console.error('[Database] Error closing MongoDB connection:', err.message);
    }
  }
}
