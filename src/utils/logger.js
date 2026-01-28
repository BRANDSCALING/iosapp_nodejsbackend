/**
 * Logger Utility
 * Provides structured logging with different levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

const formatTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, message, meta = {}) => {
  const timestamp = formatTimestamp();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

const logger = {
  error: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', message, meta));
      if (meta.stack) {
        console.error(meta.stack);
      }
    }
  },

  warn: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, meta));
    }
  },

  info: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.log(formatMessage('INFO', message, meta));
    }
  },

  debug: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log(formatMessage('DEBUG', message, meta));
    }
  },

  // Log database queries with duration
  query: (text, duration, rows) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log(formatMessage('QUERY', 'Database query executed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows
      }));
    }
  },

  // Log HTTP requests
  request: (method, path, statusCode, duration) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.log(formatMessage('HTTP', `${method} ${path}`, {
        status: statusCode,
        duration: `${duration}ms`
      }));
    }
  }
};

module.exports = logger;




