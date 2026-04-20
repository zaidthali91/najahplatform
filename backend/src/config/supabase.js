// ============================================================
// src/config/supabase.js
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    db:   { schema: 'public' },
  }
);

module.exports = { supabase };

// ============================================================
// src/utils/logger.js
// ============================================================
// const winston = require('winston');
// module.exports = winston.createLogger({
//   level: process.env.LOG_LEVEL || 'info',
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.colorize(),
//     winston.format.printf(({ level, message, timestamp }) =>
//       `${timestamp} [${level}]: ${message}`)
//   ),
//   transports: [
//     new winston.transports.Console(),
//     new winston.transports.File({ filename: process.env.LOG_FILE || 'logs/app.log' }),
//   ],
// });

// بديل بسيط للتطوير
const logger = {
  info:  (...args) => console.log('ℹ️ ', ...args),
  error: (...args) => console.error('❌', ...args),
  warn:  (...args) => console.warn('⚠️ ', ...args),
  debug: (...args) => process.env.NODE_ENV !== 'production' && console.debug('🔍', ...args),
};
module.exports = logger;
