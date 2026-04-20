// src/routes/tutor.routes.js
const express    = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth.middleware');
const router = express.Router();

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// System prompts لكل مادة
const SYSTEM_PROMPTS = {
  english: `أنت معلم متخصص في اللغة الإنجليزية للاختبار الوطني العراقي (الثالث المتوسط والسادس الإعدادي).
تعرف المنهج الوزاري العراقي جيداً: Grammar, Reading Comprehension, Vocabulary, Writing, Translation.
قدّم إجابات واضحة ومبسطة. استخدم أمثلة من المنهج. إذا سأل الطالب بالعربية أجب بالعربية، وإذا سأل بالإنجليزية أجب بالإنجليزية.
عند شرح Grammar استخدم قوانين مبسطة مع أمثلة تطبيقية. لا تُطوِّل غير الضروري.`,

  arabic: `أنت معلم متخصص في اللغة العربية للاختبار الوطني العراقي.
تعرف المنهج الوزاري جيداً: النحو والإعراب، الصرف، البلاغة والبيان، الأدب والنصوص، فهم المقروء، الإنشاء.
قدّم الإجابات بأسلوب علمي واضح مع تبسيط القواعد وإعطاء أمثلة من المنهج.
عند الإعراب: اذكر نوع الكلمة، موقعها الإعرابي، وعلامة الإعراب بدقة.`,

  computer: `أنت معلم متخصص في مادة الحاسوب للاختبار الوطني العراقي.
تعرف المنهج الوزاري جيداً: أساسيات الحاسوب، Windows، Microsoft Word، Excel، Access، PowerPoint، الإنترنت والشبكات.
قدّم الإجابات بوضوح مع الخطوات التفصيلية عند الحاجة. استخدم أمثلة عملية.`,

  general: `أنت معلم ذكي لمنصة النجاح العراقية. تساعد الطلاب في مواد الاختبار الوطني: اللغة الإنجليزية، اللغة العربية، والحاسوب.
قدّم إجابات دقيقة وواضحة مناسبة للمنهج الوزاري العراقي.`,
};

// ===== POST /api/tutor/chat =====
// إرسال رسالة للمعلم الذكي
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, subject_slug = 'general', conversation_id } = req.body;

    if (!message?.trim()) return res.status(400).json({ error: 'الرسالة فارغة' });
    if (req.user.credits < 1) {
      return res.status(402).json({ error: 'رصيدك نفد!', code: 'INSUFFICIENT_CREDITS' });
    }

    // إيجاد أو إنشاء المحادثة
    let convId = conversation_id;
    if (!convId) {
      const { data: subj } = await supabase.from('subjects').select('id').eq('slug', subject_slug).single();
      const { data: conv } = await supabase.from('tutor_conversations').insert({
        user_id:    req.user.id,
        subject_id: subj?.id || null,
        title:      message.slice(0, 100),
      }).select().single();
      convId = conv.id;
    }

    // جلب سجل المحادثة (آخر 10 رسائل)
    const { data: history } = await supabase
      .from('tutor_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(10);

    const messages = [
      ...(history || []).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    // استدعاء Claude API
    const systemPrompt = SYSTEM_PROMPTS[subject_slug] || SYSTEM_PROMPTS.general;

    const response = await ai.messages.create({
      model:      process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system:     systemPrompt,
      messages,
    });

    const reply     = response.content[0].text;
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    // حفظ الرسالتين في قاعدة البيانات
    await supabase.from('tutor_messages').insert([
      { conversation_id: convId, role: 'user',      content: message,  credits_used: 0 },
      { conversation_id: convId, role: 'assistant', content: reply,    credits_used: 1, tokens_used: tokensUsed },
    ]);

    // خصم رصيد
    await supabase.from('users')
      .update({ credits: req.user.credits - 1 })
      .eq('id', req.user.id);

    await supabase.from('transactions').insert({
      user_id:      req.user.id,
      type:         'usage',
      amount:       -1,
      description:  `رسالة المعلم الذكي — ${subject_slug}`,
      reference_id: convId,
      payment_status: 'completed',
    });

    res.json({
      reply,
      conversation_id: convId,
      credits_left:    req.user.credits - 1,
      tokens_used:     tokensUsed,
    });

  } catch (err) {
    if (err.status === 529) {
      return res.status(503).json({ error: 'المعلم الذكي مشغول حالياً، حاول بعد لحظة' });
    }
    res.status(500).json({ error: 'فشل الاتصال بالمعلم الذكي', detail: err.message });
  }
});

// ===== GET /api/tutor/conversations =====
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tutor_conversations')
      .select(`id, title, created_at, subject:subjects(name_ar, icon)`)
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ conversations: data });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب المحادثات' });
  }
});

// ===== GET /api/tutor/conversations/:id =====
router.get('/conversations/:id', authenticate, async (req, res) => {
  try {
    const { data: conv } = await supabase.from('tutor_conversations')
      .select('id, user_id').eq('id', req.params.id).single();

    if (!conv || conv.user_id !== req.user.id) return res.status(403).json({ error: 'غير مصرح' });

    const { data: messages } = await supabase.from('tutor_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', req.params.id)
      .order('created_at', { ascending: true });

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب الرسائل' });
  }
});

// ===== DELETE /api/tutor/conversations/:id =====
router.delete('/conversations/:id', authenticate, async (req, res) => {
  try {
    await supabase.from('tutor_conversations')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    res.json({ message: 'تم حذف المحادثة' });
  } catch (err) {
    res.status(500).json({ error: 'فشل حذف المحادثة' });
  }
});

module.exports = router;
