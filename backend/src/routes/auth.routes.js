// src/routes/auth.routes.js
const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// ===== توليد التوكن =====
const generateTokens = (userId) => {
  const access  = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refresh = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '30d' });
  return { access, refresh };
};

// ===== POST /api/auth/register =====
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح'),
  body('password').isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  body('full_name').trim().isLength({ min: 2, max: 100 }).withMessage('الاسم مطلوب'),
  body('grade').optional().isIn(['3mid','6prep']),
  body('governorate').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password, full_name, grade, governorate } = req.body;

    // التحقق من عدم وجود البريد
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
    if (existing) return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });

    const hashedPw = await bcrypt.hash(password, 12);

    // إنشاء المستخدم في Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authErr) throw authErr;

    // إنشاء سجل في جدول users
    const { data: user, error: userErr } = await supabase.from('users').insert({
      id:          authData.user.id,
      email,
      full_name,
      grade:       grade || '3mid',
      governorate: governorate || 'بغداد',
      credits:     15,   // رصيد مجاني
    }).select().single();
    if (userErr) throw userErr;

    // تسجيل معاملة الرصيد المجاني
    await supabase.from('transactions').insert({
      user_id:        user.id,
      type:           'free_trial',
      amount:         15,
      description:    'رصيد مجاني عند التسجيل',
      payment_method: 'free',
      payment_status: 'completed',
    });

    const tokens = generateTokens(user.id);
    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح! لديك 15 رصيد مجاني 🎁',
      user: { id: user.id, email: user.email, full_name: user.full_name, credits: 15 },
      tokens,
    });

  } catch (err) {
    res.status(500).json({ error: 'فشل إنشاء الحساب', detail: err.message });
  }
});

// ===== POST /api/auth/login =====
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;

    // تسجيل الدخول عبر Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email, full_name, role, credits, xp_points, level, streak_days, governorate, grade, theme')
      .eq('id', data.user.id)
      .single();
    if (userErr || !user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    // تحديث آخر تسجيل دخول
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    const tokens = generateTokens(user.id);
    res.json({ message: `مرحباً ${user.full_name}!`, user, tokens });

  } catch (err) {
    res.status(500).json({ error: 'فشل تسجيل الدخول' });
  }
});

// ===== POST /api/auth/google =====
router.post('/google', async (req, res) => {
  try {
    const { id_token } = req.body;
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: id_token });
    if (error) return res.status(400).json({ error: 'فشل الدخول عبر Google' });

    let { data: user } = await supabase.from('users').select('*').eq('id', data.user.id).single();

    if (!user) {
      const { data: newUser } = await supabase.from('users').insert({
        id:         data.user.id,
        email:      data.user.email,
        full_name:  data.user.user_metadata?.full_name || 'طالب',
        avatar_url: data.user.user_metadata?.avatar_url,
        google_id:  data.user.id,
        credits:    15,
        is_verified: true,
      }).select().single();
      user = newUser;

      await supabase.from('transactions').insert({
        user_id: user.id, type: 'free_trial', amount: 15,
        description: 'رصيد مجاني — دخول Google', payment_method: 'free', payment_status: 'completed',
      });
    }

    const tokens = generateTokens(user.id);
    res.json({ user, tokens });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الدخول عبر Google' });
  }
});

// ===== GET /api/auth/me =====
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ===== POST /api/auth/refresh =====
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'توكن غير صالح' });
    const tokens = generateTokens(decoded.userId);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'انتهت الجلسة، سجل الدخول مجدداً' });
  }
});

// ===== POST /api/auth/logout =====
router.post('/logout', authenticate, async (req, res) => {
  await supabase.auth.signOut();
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

module.exports = router;
