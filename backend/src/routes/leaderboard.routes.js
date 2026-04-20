// src/routes/leaderboard.routes.js
const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth.middleware');
const router = express.Router();

// ===== GET /api/leaderboard =====
router.get('/', authenticate, async (req, res) => {
  try {
    const { filter = 'global', subject, limit = 20 } = req.query;

    let query = supabase
      .from('v_leaderboard')
      .select('id, full_name, governorate, xp_points, streak_days, level, rank_global')
      .limit(parseInt(limit));

    if (filter === 'governorate') {
      const { data: me } = await supabase.from('users').select('governorate').eq('id', req.user.id).single();
      if (me?.governorate) query = query.eq('governorate', me.governorate).order('rank_governorate');
    } else {
      query = query.order('rank_global');
    }

    if (filter === 'weekly') {
      // الأسبوع الأخير — يحتاج تاريخ
      const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
      // سيُحسب من جلسات هذا الأسبوع
    }

    const { data, error } = await query;
    if (error) throw error;

    // إيجاد ترتيب المستخدم الحالي
    const myRank = data.findIndex(u => u.id === req.user.id);

    res.json({
      leaderboard: data,
      my_rank:     myRank >= 0 ? myRank + 1 : null,
      filter,
    });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب المتصدرين', detail: err.message });
  }
});

module.exports = router;

// ============================================================
// src/routes/user.routes.js
// ============================================================
const express2 = require('express');
const { supabase: sb } = require('../config/supabase');
const { authenticate: auth } = require('../middleware/auth.middleware');
const router2 = express2.Router();

// GET /api/users/me/stats
router2.get('/me/stats', auth, async (req, res) => {
  try {
    const { data } = await sb.from('v_user_stats').select('*').eq('id', req.user.id).single();
    const { data: subPerf } = await sb.from('v_subject_performance').select('*').eq('user_id', req.user.id);
    const { data: achievements } = await sb
      .from('user_achievements')
      .select('achievement:achievements(slug, name_ar, icon, xp_reward), earned_at')
      .eq('user_id', req.user.id);

    res.json({ stats: data, subject_performance: subPerf, achievements });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب الإحصاء' });
  }
});

// PATCH /api/users/me
router2.patch('/me', auth, async (req, res) => {
  try {
    const allowed = ['full_name','governorate','grade','branch','theme','language','notifications_enabled'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const { data, error } = await sb.from('users').update(updates).eq('id', req.user.id).select().single();
    if (error) throw error;
    res.json({ user: data, message: 'تم تحديث الملف الشخصي' });
  } catch (err) {
    res.status(500).json({ error: 'فشل تحديث الملف الشخصي' });
  }
});

// GET /api/users/me/notifications
router2.get('/me/notifications', auth, async (req, res) => {
  try {
    const { data } = await sb.from('notifications')
      .select('*').eq('user_id', req.user.id)
      .order('created_at', { ascending: false }).limit(20);
    res.json({ notifications: data });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب الإشعارات' });
  }
});

// PATCH /api/users/me/notifications/:id/read
router2.patch('/me/notifications/:id/read', auth, async (req, res) => {
  await sb.from('notifications').update({ is_read: true })
    .eq('id', req.params.id).eq('user_id', req.user.id);
  res.json({ success: true });
});

module.exports = { leaderboardRouter: router, userRouter: router2 };

// ============================================================
// src/routes/subject.routes.js
// ============================================================
const express3  = require('express');
const { supabase: sb3 } = require('../config/supabase');
const router3 = express3.Router();

// GET /api/subjects
router3.get('/', async (req, res) => {
  try {
    const { data: subjects } = await sb3.from('subjects')
      .select('id, slug, name_ar, name_en, icon, color, grade_level')
      .eq('is_active', true).order('display_order');

    const { data: chapters } = await sb3.from('chapters')
      .select('id, subject_id, slug, name_ar, chapter_number')
      .eq('is_active', true).order('chapter_number');

    const result = (subjects || []).map(s => ({
      ...s,
      chapters: (chapters || []).filter(c => c.subject_id === s.id),
    }));

    res.json({ subjects: result });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب المواد' });
  }
});

// GET /api/subjects/:slug/stats
router3.get('/:slug/stats', async (req, res) => {
  try {
    const { data: subj } = await sb3.from('subjects').select('id').eq('slug', req.params.slug).single();
    if (!subj) return res.status(404).json({ error: 'المادة غير موجودة' });

    const { count: questionCount } = await sb3.from('questions')
      .select('id', { count: 'exact' }).eq('subject_id', subj.id).eq('is_active', true);

    const years = await sb3.from('questions')
      .select('year').eq('subject_id', subj.id).not('year', 'is', null);
    const uniqueYears = [...new Set((years.data || []).map(q => q.year))].sort();

    res.json({ question_count: questionCount, years: uniqueYears });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب إحصاء المادة' });
  }
});

module.exports = router3;
