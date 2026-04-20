// src/routes/exam.routes.js
const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, requireCredits } = require('../middleware/auth.middleware');
const Anthropic = require('@anthropic-ai/sdk');
const router = express.Router();

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// حساب الرصيد المطلوب
const calcCreditCost = (questionCount) => {
  if (questionCount <= 5)  return 0;
  if (questionCount <= 10) return 1;
  if (questionCount <= 20) return 2;
  if (questionCount <= 30) return 3;
  return 5;
};

// ===== POST /api/exams/start =====
router.post('/start', authenticate, async (req, res) => {
  try {
    const {
      subject_slug,
      chapter_slug,
      mode = 'ministerial',
      question_count = 10,
      difficulty = 'all',
      year_filter,
      session_filter,
    } = req.body;

    const creditCost = calcCreditCost(question_count);

    // التحقق من الرصيد
    if (req.user.credits < creditCost) {
      return res.status(402).json({
        error: 'رصيدك غير كافٍ لهذا الامتحان',
        required: creditCost,
        available: req.user.credits,
        code: 'INSUFFICIENT_CREDITS',
      });
    }

    // جلب معرف المادة
    const { data: subject } = await supabase.from('subjects').select('id').eq('slug', subject_slug).single();
    if (!subject) return res.status(404).json({ error: 'المادة غير موجودة' });

    // إنشاء جلسة الامتحان
    const { data: session, error: sessErr } = await supabase
      .from('exam_sessions')
      .insert({
        user_id:       req.user.id,
        subject_id:    subject.id,
        mode,
        question_count,
        difficulty,
        year_filter,
        session_filter: session_filter ? parseInt(session_filter) : null,
        credits_used:  creditCost,
      })
      .select().single();
    if (sessErr) throw sessErr;

    // خصم الرصيد
    if (creditCost > 0) {
      await supabase.from('users')
        .update({ credits: supabase.rpc('decrement', { x: creditCost }) })
        .eq('id', req.user.id);

      await supabase.from('transactions').insert({
        user_id:     req.user.id,
        type:        'usage',
        amount:      -creditCost,
        description: `امتحان ${question_count} سؤال — ${mode}`,
        reference_id: session.id,
        payment_status: 'completed',
      });
    }

    res.status(201).json({
      session_id:   session.id,
      credits_used: creditCost,
      credits_left: req.user.credits - creditCost,
      message:      'تم بدء الجلسة بنجاح',
    });

  } catch (err) {
    res.status(500).json({ error: 'فشل بدء الامتحان', detail: err.message });
  }
});

// ===== POST /api/exams/:sessionId/answer =====
router.post('/:sessionId/answer', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { question_id, answer_index, essay_answer, time_taken_seconds, hint_used } = req.body;

    // التحقق من ملكية الجلسة
    const { data: session } = await supabase.from('exam_sessions')
      .select('id, user_id').eq('id', sessionId).single();
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لهذه الجلسة' });
    }

    // جلب السؤال
    const { data: question } = await supabase.from('questions')
      .select('id, question_type, correct_answer, model_answer, explanation, times_answered, times_correct')
      .eq('id', question_id).single();
    if (!question) return res.status(404).json({ error: 'السؤال غير موجود' });

    let is_correct = false;
    let ai_score = null;
    let ai_feedback = null;

    if (question.question_type === 'mcq') {
      is_correct = answer_index === question.correct_answer;
    } else if (question.question_type === 'essay' && essay_answer) {
      // تقييم الإجابة المقالية بالذكاء الاصطناعي
      try {
        const response = await ai.messages.create({
          model: process.env.ANTHROPIC_MODEL,
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `أنت معلم خبير في تصحيح إجابات الاختبار الوطني العراقي.
قيِّم الإجابة التالية من 10 درجات وأعط ملاحظات مختصرة باللغة العربية.

الإجابة النموذجية: ${question.model_answer || 'غير محددة'}

إجابة الطالب: ${essay_answer}

أجب فقط بصيغة JSON: {"score": رقم_من_0_إلى_10, "feedback": "ملاحظات مختصرة"}`,
          }],
        });

        const parsed = JSON.parse(response.content[0].text);
        ai_score    = parsed.score;
        ai_feedback = parsed.feedback;
        is_correct  = ai_score >= 6;
      } catch (aiErr) {
        ai_score    = 5;
        ai_feedback = 'تعذّر التقييم التلقائي. راجع الإجابة النموذجية.';
        is_correct  = false;
      }
    }

    // تسجيل الإجابة
    const { data: answer } = await supabase.from('student_answers').insert({
      session_id:         sessionId,
      user_id:            req.user.id,
      question_id,
      answer_index,
      essay_answer,
      is_correct,
      time_taken_seconds: time_taken_seconds || 0,
      hint_used:          hint_used || false,
      ai_score,
      ai_feedback,
      ai_evaluated_at:    question.question_type === 'essay' ? new Date().toISOString() : null,
    }).select().single();

    // تحديث إحصاء السؤال
    await supabase.from('questions').update({
      times_answered: question.times_answered + 1,
      times_correct:  question.times_correct + (is_correct ? 1 : 0),
    }).eq('id', question_id);

    res.json({
      is_correct,
      correct_answer: question.question_type === 'mcq' ? question.correct_answer : null,
      explanation:    question.explanation,
      ai_score,
      ai_feedback,
    });

  } catch (err) {
    res.status(500).json({ error: 'فشل تسجيل الإجابة', detail: err.message });
  }
});

// ===== POST /api/exams/:sessionId/complete =====
router.post('/:sessionId/complete', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { duration_seconds } = req.body;

    // حساب الإحصاء النهائي
    const { data: answers } = await supabase.from('student_answers')
      .select('is_correct, is_skipped').eq('session_id', sessionId);

    const total   = answers.length;
    const correct = answers.filter(a => a.is_correct).length;
    const skipped = answers.filter(a => a.is_skipped).length;
    const wrong   = total - correct - skipped;
    const maxScore = total * 10;
    const score    = correct * 10;
    const pct      = total > 0 ? Math.round((correct / total) * 100) : 0;

    // حساب XP المكتسبة
    const xpBase    = correct * 10;
    const xpBonus   = pct >= 90 ? 50 : pct >= 75 ? 25 : 0;
    const xpEarned  = xpBase + xpBonus;

    // تحديث الجلسة
    await supabase.from('exam_sessions').update({
      score, max_score: maxScore, correct_count: correct,
      wrong_count: wrong, skipped_count: skipped,
      percentage: pct, duration_seconds: duration_seconds || 0,
      completed_at: new Date().toISOString(), is_completed: true,
      xp_earned: xpEarned,
    }).eq('id', sessionId);

    // تحديث XP الطالب
    await supabase.from('users').update({
      xp_points: supabase.rpc('increment', { x: xpEarned }),
    }).eq('id', req.user.id);

    // تحديث streak
    await supabase.rpc('update_user_streak', { p_user_id: req.user.id });

    // التحقق من الإنجازات
    await checkAchievements(req.user.id, { correct, total, pct });

    res.json({
      score, max_score: maxScore, correct, wrong, skipped,
      percentage: pct, xp_earned: xpEarned,
      grade: pct >= 90 ? 'ممتاز' : pct >= 75 ? 'جيد جداً' : pct >= 60 ? 'جيد' : 'يحتاج مراجعة',
      message: `أنهيت الامتحان! حصلت على ${xpEarned} XP 🌟`,
    });

  } catch (err) {
    res.status(500).json({ error: 'فشل إنهاء الجلسة', detail: err.message });
  }
});

// ===== GET /api/exams/history =====
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const offset = (parseInt(page)-1) * parseInt(limit);

    const { data, count, error } = await supabase
      .from('exam_sessions')
      .select(`
        id, mode, question_count, score, max_score, percentage,
        correct_count, wrong_count, duration_seconds, xp_earned,
        started_at, completed_at,
        subject:subjects(name_ar, icon, slug)
      `, { count: 'exact' })
      .eq('user_id', req.user.id)
      .eq('is_completed', true)
      .order('started_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;
    res.json({ sessions: data, total: count });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب السجل', detail: err.message });
  }
});

// ===== دالة مساعدة: التحقق من الإنجازات =====
async function checkAchievements(userId, { correct, total, pct }) {
  // جلب إحصاء الطالب
  const { data: stats } = await supabase
    .from('student_answers')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);

  const totalAnswers = stats?.length || 0;

  const conditions = [
    { slug: 'first_question',  met: totalAnswers >= 1 },
    { slug: 'ten_questions',   met: totalAnswers >= 10 },
    { slug: 'hundred_q',       met: totalAnswers >= 100 },
    { slug: 'perfect_score',   met: pct === 100 },
  ];

  for (const cond of conditions) {
    if (!cond.met) continue;
    const { data: ach } = await supabase.from('achievements').select('id').eq('slug', cond.slug).single();
    if (!ach) continue;
    // إضافة الإنجاز إن لم يكن موجوداً
    await supabase.from('user_achievements')
      .upsert({ user_id: userId, achievement_id: ach.id }, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true });
  }
}

module.exports = router;
