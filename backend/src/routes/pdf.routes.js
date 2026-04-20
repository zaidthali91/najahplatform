// src/routes/pdf.routes.js
const express   = require('express');
const multer    = require('multer');
const pdfParse  = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth.middleware');
const router = express.Router();

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// إعداد multer للرفع في الذاكرة
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: (parseInt(process.env.MAX_PDF_SIZE_MB) || 20) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('يُقبل فقط ملفات PDF'));
  },
});

// ===== POST /api/pdf/upload =====
router.post('/upload', authenticate, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يُرفق أي ملف' });

    // التحقق من الرصيد (أول PDF مجاني)
    const { data: user } = await supabase.from('users').select('credits').eq('id', req.user.id).single();
    const { data: prevPdfs } = await supabase.from('pdf_files').select('id').eq('user_id', req.user.id).limit(1);

    const isFirstPdf = !prevPdfs || prevPdfs.length === 0;
    const creditCost = isFirstPdf ? 0 : 2;

    if (!isFirstPdf && user.credits < 2) {
      return res.status(402).json({ error: 'تحتاج 2 رصيد لتحليل PDF', code: 'INSUFFICIENT_CREDITS' });
    }

    // رفع الملف إلى Supabase Storage
    const fileName = `${req.user.id}/${Date.now()}_${req.file.originalname.replace(/\s/g,'_')}`;
    const { data: uploaded, error: uploadErr } = await supabase.storage
      .from(process.env.STORAGE_BUCKET_PDF || 'najah-pdfs')
      .upload(fileName, req.file.buffer, { contentType: 'application/pdf' });
    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage
      .from(process.env.STORAGE_BUCKET_PDF || 'najah-pdfs')
      .getPublicUrl(fileName);

    // إنشاء سجل في قاعدة البيانات
    const { data: pdfRecord, error: pdfErr } = await supabase.from('pdf_files').insert({
      user_id:       req.user.id,
      original_name: req.file.originalname,
      file_url:      publicUrl,
      file_size:     req.file.size,
      status:        'analyzing',
      credits_used:  creditCost,
    }).select().single();
    if (pdfErr) throw pdfErr;

    // خصم الرصيد
    if (creditCost > 0) {
      await supabase.from('users').update({ credits: user.credits - creditCost }).eq('id', req.user.id);
      await supabase.from('transactions').insert({
        user_id: req.user.id, type: 'usage', amount: -creditCost,
        description: `تحليل PDF: ${req.file.originalname}`,
        reference_id: pdfRecord.id, payment_status: 'completed',
      });
    }

    // تحليل PDF بشكل غير متزامن
    analyzePdfAsync(pdfRecord.id, req.file.buffer, req.user.id);

    res.status(202).json({
      pdf_id:       pdfRecord.id,
      status:       'analyzing',
      credits_used: creditCost,
      message:      isFirstPdf ? 'تحليل مجاني! جارٍ التحليل...' : 'جارٍ التحليل...',
    });

  } catch (err) {
    res.status(500).json({ error: 'فشل رفع الملف', detail: err.message });
  }
});

// ===== تحليل PDF بالذكاء الاصطناعي (غير متزامن) =====
async function analyzePdfAsync(pdfId, buffer, userId) {
  try {
    // استخراج النص من PDF
    const parsed  = await pdfParse(buffer);
    const text    = parsed.text.slice(0, 8000); // أول 8000 حرف
    const pages   = parsed.numpages;

    // إرسال النص لـ Claude للتحليل
    const response = await ai.messages.create({
      model:      process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `أنت معلم متخصص في المناهج العراقية للاختبار الوطني. حلّل هذا النص الدراسي وأرجع JSON فقط بهذا الشكل:
{
  "summary": "ملخص من 3-5 جمل للمحتوى الرئيسي",
  "key_concepts": ["مفهوم 1", "مفهوم 2", "مفهوم 3"],
  "questions": [
    {"text":"سؤال 1","type":"mcq","options":["أ)","ب)","ج)","د)"],"correct":0,"explanation":"..."},
    {"text":"سؤال 2","type":"mcq","options":["أ)","ب)","ج)","د)"],"correct":1,"explanation":"..."},
    {"text":"سؤال 3","type":"essay","hint":"تلميح للإجابة"},
    {"text":"سؤال 4","type":"mcq","options":["أ)","ب)","ج)","د)"],"correct":2,"explanation":"..."},
    {"text":"سؤال 5","type":"mcq","options":["أ)","ب)","ج)","د)"],"correct":3,"explanation":"..."}
  ]
}

النص:
${text}`,
      }],
    });

    const raw    = response.content[0].text;
    const parsed2 = JSON.parse(raw.replace(/```json|```/g, '').trim());

    // تحديث السجل
    await supabase.from('pdf_files').update({
      status:              'done',
      page_count:          pages,
      summary:             parsed2.summary,
      key_concepts:        parsed2.key_concepts,
      generated_questions: parsed2.questions,
      analyzed_at:         new Date().toISOString(),
    }).eq('id', pdfId);

    // إشعار المستخدم
    await supabase.from('notifications').insert({
      user_id: userId,
      title:   'تم تحليل ملف PDF بنجاح! 📄',
      message: `تم توليد ${parsed2.questions?.length || 0} سؤال من ملفك`,
      type:    'achievement',
      icon:    '📄',
    });

  } catch (err) {
    await supabase.from('pdf_files').update({ status: 'error' }).eq('id', pdfId);
    console.error('خطأ في تحليل PDF:', err.message);
  }
}

// ===== GET /api/pdf/:id =====
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('pdf_files')
      .select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (error || !data) return res.status(404).json({ error: 'الملف غير موجود' });
    res.json({ pdf: data });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب بيانات الملف' });
  }
});

// ===== GET /api/pdf =====
// جلب كل ملفات المستخدم
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('pdf_files')
      .select('id, original_name, file_size, status, page_count, summary, analyzed_at, uploaded_at')
      .eq('user_id', req.user.id)
      .order('uploaded_at', { ascending: false })
      .limit(20);
    res.json({ files: data });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب الملفات' });
  }
});

module.exports = router;
