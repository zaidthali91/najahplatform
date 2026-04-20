// src/routes/question.routes.js
const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const router = express.Router();

// ===== GET /api/questions =====
// جلب أسئلة مع فلترة
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      subject,    // 'english' | 'arabic' | 'computer'
      chapter,
      year,
      session,
      difficulty,
      type,
      limit = 10,
      page = 1,
      mode,
    } = req.query;

    let query = supabase
      .from('questions')
      .select(`
        id, question_text, question_type, options, correct_answer,
        hint, explanation, difficulty, year, session,
        chapter:chapters(id, name_ar, slug),
        subject:subjects(id, slug, name_ar, icon)
      `, { count: 'exact' })
      .eq('is_active', true);

    if (subject) {
      const { data: subj } = await supabase.from('subjects').select('id').eq('slug', subject).single();
      if (subj) query = query.eq('subject_id', subj.id);
    }
    if (chapter) {
      const { data: chap } = await supabase.from('chapters').select('id').eq('slug', chapter).single();
      if (chap) query = query.eq('chapter_id', chap.id);
    }
    if (year && year !== 'all')      query = query.eq('year', parseInt(year));
    if (session && session !== 'all') query = query.eq('session', parseInt(session));
    if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty);
    if (type)                         query = query.eq('question_type', type);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    // وضع "ذكي تكيفي" — يعيد الأسئلة بترتيب عشوائي
    if (mode === 'national_sim' || mode === 'ministerial') {
      query = query.order('year', { ascending: false });
    } else {
      // ترتيب عشوائي باستخدام random()
      query = query.order('id', { ascending: Math.random() > 0.5 });
    }

    const { data, count, error } = await query;
    if (error) throw error;

    // خلط عشوائي على مستوى Node
    const shuffled = data.sort(() => Math.random() - 0.5);

    res.json({
      questions: shuffled,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب الأسئلة', detail: err.message });
  }
});

// ===== GET /api/questions/weak =====
// أسئلة نقاط الضعف للطالب
router.get('/weak', authenticate, async (req, res) => {
  try {
    const { subject, limit = 20 } = req.query;
    const userId = req.user.id;

    // جلب الأسئلة التي أخطأ فيها الطالب
    let query = supabase
      .from('student_answers')
      .select(`
        question_id,
        question:questions(id, question_text, question_type, options, correct_answer, hint, difficulty, subject_id, chapter_id)
      `)
      .eq('user_id', userId)
      .eq('is_correct', false)
      .is('is_skipped', false)
      .limit(parseInt(limit));

    if (subject) {
      // فلترة حسب المادة من خلال الانضمام
      const { data: subj } = await supabase.from('subjects').select('id').eq('slug', subject).single();
      if (subj) {
        // جلب معرفات الأسئلة من هذه المادة
        query = query.eq('question.subject_id', subj.id);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    // إزالة التكرار
    const unique = [...new Map(data.map(r => [r.question_id, r.question])).values()].filter(Boolean);
    res.json({ questions: unique.sort(() => Math.random() - 0.5) });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب أسئلة الضعف', detail: err.message });
  }
});

// ===== POST /api/questions (admin only) =====
router.post('/', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .insert({ ...req.body, created_by: req.user.id })
      .select().single();
    if (error) throw error;
    res.status(201).json({ question: data, message: 'تم إضافة السؤال بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل إضافة السؤال', detail: err.message });
  }
});

module.exports = router;

// ============================================================
// src/routes/exam.routes.js — جلسات الامتحان
// ============================================================
