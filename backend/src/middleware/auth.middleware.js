// src/middleware/auth.middleware.js
const jwt       = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// ===== التحقق من التوكن =====
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // جلب بيانات المستخدم
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, credits, xp_points, level, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'المستخدم غير موجود' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'الحساب معطّل. تواصل مع الدعم الفني' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة، سجل الدخول مجدداً', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ error: 'توكن غير صالح' });
  }
};

// ===== التحقق من الدور =====
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصادق' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'ليس لديك صلاحية لهذا الإجراء' });
  }
  next();
};

// ===== التحقق من الرصيد =====
const requireCredits = (amount) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصادق' });
  if (req.user.credits < amount) {
    return res.status(402).json({
      error: 'رصيدك غير كافٍ',
      required: amount,
      available: req.user.credits,
      code: 'INSUFFICIENT_CREDITS',
    });
  }
  next();
};

module.exports = { authenticate, requireRole, requireCredits };
