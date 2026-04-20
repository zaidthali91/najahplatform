// backend/src/utils/logger.js
const logger = {
  info:  (...a) => console.log('\x1b[32mℹ️ \x1b[0m', ...a),
  error: (...a) => console.error('\x1b[31m❌\x1b[0m', ...a),
  warn:  (...a) => console.warn('\x1b[33m⚠️ \x1b[0m', ...a),
  debug: (...a) => process.env.NODE_ENV !== 'production' && console.log('\x1b[36m🔍\x1b[0m', ...a),
};
module.exports = logger;
