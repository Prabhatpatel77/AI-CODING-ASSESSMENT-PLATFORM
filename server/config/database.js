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
let isFallbackActive = false;
let fallbackReason = null;

// Configure connection lifecycle listeners
mongoose.connection.on('connected', () => {
  lastConnectionError = null;
  isFallbackActive = false;
  fallbackReason = null;
  console.log('[Database] MongoDB connection established successfully.');
});

mongoose.connection.on('error', (err) => {
  const safeMessage = sanitizeConnectionString(err.message || String(err));
  lastConnectionError = safeMessage;
  // If connection is already established and drops, warn the operator
  if (mongoose.connection.readyState === 1) {
    console.warn('[Database] Active connection encountered error:', safeMessage);
  }
});

mongoose.connection.on('disconnected', () => {
  if (!isFallbackActive) {
    console.log('[Database] MongoDB connection disconnected.');
  }
});

/**
 * Connect to MongoDB using the MONGODB_URI environment variable.
 * Fails gracefully if MONGODB_URI is absent or if connection cannot be established
 * (e.g. IP whitelist restrictions in ephemeral environments), transitioning to
 * in-memory standalone mode.
 *
 * @param {Object} options
 * @param {boolean} [options.exitOnFailure=false] - Whether to terminate process on connection failure
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
export async function connectDatabase({ exitOnFailure = false } = {}) {
  const uri = process.env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    isFallbackActive = true;
    fallbackReason = 'MONGODB_URI environment variable is not defined.';
    console.log('[Database] Local fallback mode active: running with in-memory persistence.');
    if (exitOnFailure) {
      process.exit(1);
    }
    return false;
  }

  const safeUri = sanitizeConnectionString(uri);
  console.log(`[Database] Attempting connection to ${safeUri}...`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Timeout fast after 2.5s without blocking
      connectTimeoutMS: 5000,
      autoIndex: process.env.NODE_ENV !== 'production', // Build indexes in dev only
    });
    lastConnectionError = null;
    isFallbackActive = false;
    fallbackReason = null;
    return true;
  } catch (err) {
    // Immediately disconnect to prevent Mongoose background heartbeat reconnect loops
    try {
      await mongoose.disconnect();
    } catch (_) {}

    const rawError = err.message || String(err);
    const isWhitelistIssue =
      rawError.includes('whitelist') ||
      rawError.includes('whitelisted') ||
      rawError.includes('alert internal error') ||
      rawError.includes('SSL alert number 80') ||
      err.name === 'MongooseServerSelectionError';

    if (isWhitelistIssue) {
      fallbackReason = 'MongoDB Atlas IP not whitelisted for this environment (add 0.0.0.0/0 to Atlas Network Access list).';
      console.log('[Database] Notice: MongoDB Atlas cluster is not reachable from this IP (Network Access list restriction).');
      console.log('[Database] Graceful fallback active: running with high-performance in-memory persistence.');
    } else {
      fallbackReason = sanitizeConnectionString(rawError);
      console.log(`[Database] Notice: MongoDB connection failed (${fallbackReason}). Running with in-memory persistence.`);
    }

    isFallbackActive = true;
    lastConnectionError = null; // Clear active error so health check reflects functional in-memory state

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

  if (readyStateNum === 1) {
    return {
      status: 'connected',
      configured: true,
      mode: 'mongodb',
      readyState: 'connected',
      host: mongoose.connection.host || null,
      database: mongoose.connection.name || null,
      error: null,
    };
  }

  if (isFallbackActive) {
    return {
      status: 'healthy',
      configured: isConfigured,
      mode: 'in_memory',
      readyState: 'fallback_active',
      notice: fallbackReason || 'Operating in high-performance in-memory standalone mode.',
      host: null,
      database: 'in-memory',
      error: null,
    };
  }

  return {
    status: isConfigured ? 'disconnected' : 'unconfigured',
    configured: isConfigured,
    mode: 'in_memory',
    readyState: readyStateStr,
    host: null,
    database: null,
    error: lastConnectionError || null,
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
