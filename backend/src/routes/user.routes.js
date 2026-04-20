// src/routes/user.routes.js
const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth.middleware');
const router = express.Router();

router.get('/me/stats', authenticate, async (req, res) => {
  try {
    res.json({
      stats: {
        ...req.user,
        total_sessions: 0, total_answers: 0,
        correct_answers: 0, avg_score: 0, total_study_minutes: 0,
      },
      subject_performance: [
        { subject_name:'اللغة الإنجليزية', accuracy_pct:0, total_answers:0, correct_count:0 },
        { subject_name:'اللغة العربية',    accuracy_pct:0, total_answers:0, correct_count:0 },
        { subject_name:'الحاسوب',          accuracy_pct:0, total_answers:0, correct_count:0 },
      ],
      achievements: [],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/me', authenticate, async (req, res) => {
  try {
    const allowed = ['full_name','governorate','grade','theme','language'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const { data, error } = await supabase.from('users').update(updates).eq('id', req.user.id).select().single();
    if (error) throw error;
    res.json({ user: data, message: 'تم تحديث الملف الشخصي' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me/notifications', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('notifications')
      .select('*').eq('user_id', req.user.id)
      .order('created_at', { ascending: false }).limit(20);
    res.json({ notifications: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/me/notifications/:id/read', authenticate, async (req, res) => {
  await supabase.from('notifications')
    .update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.user.id);
  res.json({ success: true });
});

module.exports = router;
