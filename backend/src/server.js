// ============================================================
// منصة النجاح — الخادم الرئيسي
// src/server.js
// ============================================================
require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');

const logger     = require('./utils/logger');
const { supabase } = require('./config/supabase');

// ===== Routes =====
const authRoutes      = require('./routes/auth.routes');
const examRoutes      = require('./routes/exam.routes');
const questionRoutes  = require('./routes/question.routes');
const tutorRoutes     = require('./routes/tutor.routes');
const pdfRoutes       = require('./routes/pdf.routes');
const paymentRoutes   = require('./routes/payment.routes');
const userRoutes      = require('./routes/user.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const subjectRoutes   = require('./routes/subject.routes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ===== الأمان =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.anthropic.com', 'https://*.supabase.co'],
    },
  },
}));

// ===== CORS =====
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error(`CORS مرفوض للمصدر: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-api-key'],
}));

// ===== Middleware =====
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Rate Limiting =====
const globalLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً، حاول بعد قليل' },
});
app.use('/api/', globalLimit);

// حد خاص لواجهة الذكاء الاصطناعي
const aiLimit = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_PER_MIN) || 20,
  message: { error: 'تجاوزت الحد المسموح لطلبات الذكاء الاصطناعي' },
});
app.use('/api/tutor', aiLimit);
app.use('/api/pdf/analyze', aiLimit);

// ===== Health Check =====
app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('system_settings').select('key').limit(1);
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: error ? 'error' : 'connected',
      version: '1.0.0',
    });
  } catch (e) {
    res.status(503).json({ status: 'error', message: e.message });
  }
});

// ===== API Routes =====
app.use('/api/auth',        authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/subjects',    subjectRoutes);
app.use('/api/questions',   questionRoutes);
app.use('/api/exams',       examRoutes);
app.use('/api/tutor',       tutorRoutes);
app.use('/api/pdf',         pdfRoutes);
app.use('/api/payments',    paymentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود', path: req.originalUrl });
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  logger.error(`${err.message} | ${req.method} ${req.originalUrl}`, { stack: err.stack });
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'حدث خطأ في الخادم' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ===== بدء السيرفر =====
app.listen(PORT, () => {
  logger.info(`🚀 منصة النجاح — الخادم يعمل على المنفذ ${PORT}`);
  logger.info(`🌍 البيئة: ${process.env.NODE_ENV}`);
  logger.info(`📦 قاعدة البيانات: Supabase (PostgreSQL)`);
});

module.exports = app;
