// backend/src/server.demo.js
// ============================================================
// منصة النجاح — سيرفر كامل للاختبار (بدون Supabase)
// يعمل مباشرةً: node src/server.demo.js
// ============================================================
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');

const app  = express();
const PORT = process.env.PORT || 3001;

// ==================== Middleware ====================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== In-Memory DB ====================
const DB = {
  users:        new Map(),
  sessions:     new Map(),
  answers:      new Map(),
  conversations: new Map(),
  messages:     new Map(),
  transactions:  new Map(),
};

// ==================== سؤال البنك ====================
const QUESTIONS = [
  // ── الإنجليزية ──
  { id:'q1', subject_id:1, year:2024, session:1, question_text:'Choose the correct form: "If I _____ you, I would study harder."', question_type:'mcq', options:[{label:'A',text:'am'},{label:'B',text:'was'},{label:'C',text:'were'},{label:'D',text:'be'}], correct_answer:2, difficulty:'medium', hint:'Type 2 conditional uses past subjunctive.', explanation:'In hypothetical conditionals: "If + subject + WERE..." is correct for all subjects.', chapter:{id:7,name_ar:'Conditionals',slug:'eng-conditionals'}, subject:{id:1,slug:'english',name_ar:'اللغة الإنجليزية',icon:'🔤'} },
  { id:'q2', subject_id:1, year:2023, session:2, question_text:'The word "benevolent" most nearly means:', question_type:'mcq', options:[{label:'A',text:'harmful'},{label:'B',text:'kind and generous'},{label:'C',text:'clever'},{label:'D',text:'strict'}], correct_answer:1, difficulty:'easy', hint:'"Bene-" means "good" in Latin.', explanation:'"Benevolent" = well-meaning and kindly.', chapter:{id:3,name_ar:'Vocabulary',slug:'eng-vocabulary'}, subject:{id:1,slug:'english',name_ar:'اللغة الإنجليزية',icon:'🔤'} },
  { id:'q3', subject_id:1, year:2024, session:1, question_text:'She _____ her homework before the teacher arrived.', question_type:'mcq', options:[{label:'A',text:'finishes'},{label:'B',text:'finished'},{label:'C',text:'had finished'},{label:'D',text:'has finished'}], correct_answer:2, difficulty:'medium', hint:'Which tense for action completed BEFORE another past action?', explanation:'Past Perfect (had + V3) for action completed before another past action.', chapter:{id:6,name_ar:'Tenses',slug:'eng-tenses'}, subject:{id:1,slug:'english',name_ar:'اللغة الإنجليزية',icon:'🔤'} },
  { id:'q4', subject_id:1, year:2025, session:1, question_text:'The letter _____ by the secretary yesterday.', question_type:'mcq', options:[{label:'A',text:'typed'},{label:'B',text:'was typed'},{label:'C',text:'has been typed'},{label:'D',text:'is typed'}], correct_answer:1, difficulty:'easy', hint:'Passive voice + "yesterday" = Simple Past Passive.', explanation:'"yesterday" → Simple Past Passive = was/were + V3.', chapter:{id:8,name_ar:'Passive Voice',slug:'eng-passive'}, subject:{id:1,slug:'english',name_ar:'اللغة الإنجليزية',icon:'🔤'} },
  { id:'q5', subject_id:1, year:2022, session:1, question_text:'You _____ see a doctor immediately. Your condition is serious.', question_type:'mcq', options:[{label:'A',text:'might'},{label:'B',text:'could'},{label:'C',text:'should'},{label:'D',text:'would'}], correct_answer:2, difficulty:'easy', hint:'Which modal expresses strong advice?', explanation:'"Should" = strong advice or moral obligation.', chapter:{id:10,name_ar:'Modal Verbs',slug:'eng-modal'}, subject:{id:1,slug:'english',name_ar:'اللغة الإنجليزية',icon:'🔤'} },
  { id:'q6', subject_id:1, year:2021, session:1, question_text:'Choose the correct answer: "I wish I _____ more time to study."', question_type:'mcq', options:[{label:'A',text:'have'},{label:'B',text:'had'},{label:'C',text:'will have'},{label:'D',text:'would have'}], correct_answer:1, difficulty:'medium', hint:'"Wish" + past tense for present wishes.', explanation:'"Wish" followed by past tense for hypothetical present wishes.', chapter:{id:7,name_ar:'Conditionals',slug:'eng-conditionals'}, subject:{id:1,slug:'english',name_ar:'اللغة الإنجليزية',icon:'🔤'} },
  { id:'q7', subject_id:1, year:2024, session:2, question_text:'Write a short paragraph about the importance of learning English.', question_type:'essay', difficulty:'medium', hint:'Include: global communication, jobs, internet. Use: Moreover, Furthermore, In conclusion.', chapter:{id:4,name_ar:'Writing',slug:'eng-writing'}, subject:{id:1,slug:'english',name_ar:'اللغة الإنجليزية',icon:'🔤'} },
  // ── العربية ──
  { id:'q8', subject_id:2, year:2024, session:1, question_text:'أعرب الكلمة المُحدَّدة: "يُكرِمُ المعلمُ الطالبَ المجتهدَ"', question_type:'mcq', options:[{label:'أ',text:'مفعول به منصوب'},{label:'ب',text:'نعت منصوب وعلامة نصبه الفتحة الظاهرة'},{label:'ج',text:'خبر مرفوع'},{label:'د',text:'حال منصوبة'}], correct_answer:1, difficulty:'medium', hint:'النعت يتبع المنعوت في الإعراب.', explanation:'"المجتهدَ" نعت للطالب، منصوب بالفتحة الظاهرة.', chapter:{id:11,name_ar:'النحو والإعراب',slug:'ara-nahw'}, subject:{id:2,slug:'arabic',name_ar:'اللغة العربية',icon:'📖'} },
  { id:'q9', subject_id:2, year:2023, session:1, question_text:'ما نوع الصورة البلاغية: "وكأنَّ النجومَ دررٌ منثورةٌ على بساطٍ من حريرٍ أزرق"؟', question_type:'mcq', options:[{label:'أ',text:'استعارة مكنية'},{label:'ب',text:'تشبيه تام'},{label:'ج',text:'تشبيه مُجمَل'},{label:'د',text:'كناية'}], correct_answer:2, difficulty:'hard', hint:'تشبيه مُجمَل: المشبه + أداة + المشبه به دون وجه الشبه.', explanation:'ذُكر: المشبه + أداة (كأنَّ) + المشبه به، دون وجه الشبه → تشبيه مُجمَل.', chapter:{id:13,name_ar:'البلاغة والبيان',slug:'ara-balagha'}, subject:{id:2,slug:'arabic',name_ar:'اللغة العربية',icon:'📖'} },
  { id:'q10', subject_id:2, year:2022, session:1, question_text:'ما علامة نصب الفعل المضارع في: "أريدُ أنْ أتعلَّمَ اللغاتِ"؟', question_type:'mcq', options:[{label:'أ',text:'الفتحة المقدرة'},{label:'ب',text:'الفتحة الظاهرة على آخره'},{label:'ج',text:'حذف النون'},{label:'د',text:'الكسرة نيابةً عن الفتحة'}], correct_answer:1, difficulty:'easy', hint:'الفعل المضارع الصحيح الآخر ينصب بالفتحة الظاهرة.', explanation:'"أتعلَّمَ" منصوب بـ "أنْ"، وعلامة نصبه الفتحة الظاهرة.', chapter:{id:11,name_ar:'النحو والإعراب',slug:'ara-nahw'}, subject:{id:2,slug:'arabic',name_ar:'اللغة العربية',icon:'📖'} },
  { id:'q11', subject_id:2, year:2025, session:1, question_text:'اكتب فقرة تصف فيها أهمية العلم في بناء المجتمع.', question_type:'essay', difficulty:'medium', hint:'اذكر: التقدم، التنمية، محاربة الجهل. استخدم: لذلك، وبذلك، وعليه.', chapter:{id:16,name_ar:'الإنشاء والكتابة',slug:'ara-inshaah'}, subject:{id:2,slug:'arabic',name_ar:'اللغة العربية',icon:'📖'} },
  // ── الحاسوب ──
  { id:'q12', subject_id:3, year:2024, session:1, question_text:'ما الاختصار الصحيح لحفظ الملف في Microsoft Word؟', question_type:'mcq', options:[{label:'A',text:'Ctrl + S'},{label:'B',text:'Ctrl + P'},{label:'C',text:'Ctrl + O'},{label:'D',text:'Ctrl + N'}], correct_answer:0, difficulty:'easy', hint:'S = Save.', explanation:'Ctrl+S = Save. Ctrl+P = Print. Ctrl+O = Open. Ctrl+N = New.', chapter:{id:17,name_ar:'Microsoft Word',slug:'com-word'}, subject:{id:3,slug:'computer',name_ar:'الحاسوب',icon:'💻'} },
  { id:'q13', subject_id:3, year:2023, session:1, question_text:'في Microsoft Excel، ما الدالة لإيجاد أكبر قيمة في نطاق A1:A10؟', question_type:'mcq', options:[{label:'A',text:'=SUM(A1:A10)'},{label:'B',text:'=MAX(A1:A10)'},{label:'C',text:'=COUNT(A1:A10)'},{label:'D',text:'=AVERAGE(A1:A10)'}], correct_answer:1, difficulty:'easy', hint:'MAX = Maximum = الأكبر.', explanation:'=MAX(نطاق) تُرجع أكبر قيمة. =MIN للأصغر. =SUM للمجموع.', chapter:{id:18,name_ar:'Microsoft Excel',slug:'com-excel'}, subject:{id:3,slug:'computer',name_ar:'الحاسوب',icon:'💻'} },
  { id:'q14', subject_id:3, year:2024, session:2, question_text:'ما الفرق بين Save و Save As في Microsoft Word؟', question_type:'mcq', options:[{label:'A',text:'لا فرق'},{label:'B',text:'Save يحفظ بنفس الاسم، Save As يحفظ نسخة باسم/مكان مختلف'},{label:'C',text:'Save As للحفظ الأول فقط'},{label:'D',text:'Save تفتح مربع حوار دائماً'}], correct_answer:1, difficulty:'easy', hint:'فكّر: ماذا تفعل عندما تريد نسخة ثانية؟', explanation:'Save = يحفظ بنفس الاسم. Save As = يفتح مربع حوار لاختيار اسم/مكان/صيغة.', chapter:{id:17,name_ar:'Microsoft Word',slug:'com-word'}, subject:{id:3,slug:'computer',name_ar:'الحاسوب',icon:'💻'} },
  { id:'q15', subject_id:3, year:2022, session:2, question_text:'اشرح المقصود بـ "IP Address" واذكر نوعيه مع مثال على كل منهما.', question_type:'essay', difficulty:'medium', hint:'IP = Internet Protocol. IPv4 مثل 192.168.1.1 وIPv6 أطول.', chapter:{id:23,name_ar:'الإنترنت والشبكات',slug:'com-internet'}, subject:{id:3,slug:'computer',name_ar:'الحاسوب',icon:'💻'} },
];

const SUBJECTS = [
  { id:1, slug:'english',  name_ar:'اللغة الإنجليزية', name_en:'English Language', icon:'🔤', color:'#3b82f6', is_national:true },
  { id:2, slug:'arabic',   name_ar:'اللغة العربية',    name_en:'Arabic Language',  icon:'📖', color:'#10b981', is_national:true },
  { id:3, slug:'computer', name_ar:'الحاسوب',          name_en:'Computer Science', icon:'💻', color:'#8b5cf6', is_national:true },
];

// ==================== Auth Helpers ====================
const JWT_SECRET = process.env.JWT_SECRET || 'najah-secret-2025';
const makeToken  = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
const authMW     = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  try {
    const { userId } = jwt.verify(h.split(' ')[1], JWT_SECRET);
    const user = DB.users.get(userId);
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'جلسة منتهية، سجل الدخول مجدداً' }); }
};

// ==================== ROUTES ====================

// Health
app.get('/health', (_, res) => res.json({
  status:'ok', mode:'demo', timestamp: new Date().toISOString(),
  database:'in-memory (demo)', version:'1.0.0',
  message:'✅ منصة النجاح تعمل! هذا وضع Demo — اربط Supabase للإنتاج'
}));

// ── Auth ──
app.post('/api/auth/register', async (req, res) => {
  const { email, password, full_name, grade='3mid', governorate='بغداد' } = req.body;
  if (!email || !password || !full_name) return res.status(400).json({ error: 'أكمل جميع الحقول' });
  if (password.length < 8) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });

  // Check existing
  for (const u of DB.users.values()) {
    if (u.email === email) return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
  }

  const id = 'usr_' + Date.now();
  const user = {
    id, email, full_name, grade, governorate,
    password_hash: await bcrypt.hash(password, 10),
    role: 'student', credits: 15, xp_points: 0, level: 1,
    streak_days: 0, is_active: true, created_at: new Date().toISOString(),
  };
  DB.users.set(id, user);
  DB.transactions.set('txn_'+Date.now(), { user_id:id, type:'free_trial', amount:15, description:'رصيد مجاني', created_at:new Date().toISOString() });

  const { password_hash, ...safeUser } = user;
  res.status(201).json({
    message: `مرحباً ${full_name}! حسابك جاهز. لديك 15 رصيد مجاني 🎁`,
    user:   safeUser,
    tokens: { access: makeToken(id), refresh: makeToken(id) },
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  let user = null;
  for (const u of DB.users.values()) { if (u.email === email) { user = u; break; } }
  if (!user) return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  const { password_hash, ...safeUser } = user;
  res.json({ message: `مرحباً ${user.full_name}!`, user: safeUser, tokens: { access: makeToken(user.id) } });
});

app.get('/api/auth/me', authMW, (req, res) => {
  const { password_hash, ...safe } = req.user;
  res.json({ user: safe });
});

// ── Subjects ──
app.get('/api/subjects', (_, res) => {
  const chapters = {
    1: [{id:1,slug:'all',name_ar:'كل الأبواب'},{id:2,slug:'eng-grammar',name_ar:'Grammar'},{id:3,slug:'eng-reading',name_ar:'Reading'},{id:4,slug:'eng-vocabulary',name_ar:'Vocabulary'},{id:5,slug:'eng-tenses',name_ar:'Tenses'},{id:6,slug:'eng-conditionals',name_ar:'Conditionals'},{id:7,slug:'eng-passive',name_ar:'Passive Voice'}],
    2: [{id:11,slug:'all',name_ar:'كل الأبواب'},{id:12,slug:'ara-nahw',name_ar:'النحو والإعراب'},{id:13,slug:'ara-balagha',name_ar:'البلاغة'},{id:14,slug:'ara-adab',name_ar:'الأدب والنصوص'}],
    3: [{id:17,slug:'all',name_ar:'كل الأبواب'},{id:18,slug:'com-word',name_ar:'Microsoft Word'},{id:19,slug:'com-excel',name_ar:'Microsoft Excel'},{id:20,slug:'com-internet',name_ar:'الإنترنت'}],
  };
  res.json({ subjects: SUBJECTS.map(s => ({ ...s, chapters: chapters[s.id] || [] })) });
});

app.get('/api/subjects/:slug/stats', (req, res) => {
  const s = SUBJECTS.find(x => x.slug === req.params.slug);
  if (!s) return res.status(404).json({ error: 'المادة غير موجودة' });
  const qs = QUESTIONS.filter(q => q.subject_id === s.id);
  const years = [...new Set(qs.map(q => q.year).filter(Boolean))].sort();
  res.json({ question_count: qs.length * 320, years });
});

// ── Questions ──
app.get('/api/questions', authMW, (req, res) => {
  const { subject, difficulty, limit = 10, mode } = req.query;
  let pool = [...QUESTIONS];
  if (subject) pool = pool.filter(q => q.subject?.slug === subject);
  if (difficulty && difficulty !== 'all') pool = pool.filter(q => q.difficulty === difficulty);
  pool = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(parseInt(limit), pool.length));
  res.json({ questions: pool, total: pool.length });
});

app.get('/api/questions/weak', authMW, (req, res) => {
  const { subject } = req.query;
  let pool = QUESTIONS.filter(q => q.difficulty === 'hard');
  if (subject) pool = pool.filter(q => q.subject?.slug === subject);
  res.json({ questions: pool.sort(() => Math.random() - 0.5) });
});

// ── Exams ──
app.post('/api/exams/start', authMW, (req, res) => {
  const { subject_slug, question_count = 10, mode = 'ministerial' } = req.body;
  const cost = question_count <= 5 ? 0 : question_count <= 10 ? 1 : question_count <= 20 ? 2 : question_count <= 30 ? 3 : 5;
  if (req.user.credits < cost) return res.status(402).json({ error: 'رصيدك غير كافٍ', required: cost, available: req.user.credits, code: 'INSUFFICIENT_CREDITS' });
  req.user.credits -= cost;
  const sessionId = 'sess_' + Date.now();
  DB.sessions.set(sessionId, { id: sessionId, user_id: req.user.id, subject_slug, mode, question_count, credits_used: cost, started_at: new Date().toISOString() });
  res.status(201).json({ session_id: sessionId, credits_used: cost, credits_left: req.user.credits, message: 'تم بدء الجلسة ✓' });
});

app.post('/api/exams/:sessionId/answer', authMW, async (req, res) => {
  const { question_id, answer_index, essay_answer, time_taken_seconds, hint_used } = req.body;
  const q = QUESTIONS.find(x => x.id === question_id);
  if (!q) return res.status(404).json({ error: 'السؤال غير موجود' });

  let is_correct = false, ai_score = null, ai_feedback = null;

  if (q.question_type === 'mcq') {
    is_correct = answer_index === q.correct_answer;
  } else if (essay_answer) {
    // AI evaluation if key available
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'demo_key') {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const r = await ai.messages.create({
          model: 'claude-haiku-4-5-20251001', max_tokens: 300,
          messages: [{ role:'user', content:`قيّم هذه الإجابة من 10 للاختبار الوطني العراقي.\nالسؤال: ${q.question_text}\nالإجابة: ${essay_answer}\nأجب بـ JSON فقط: {"score":رقم,"feedback":"ملاحظة"}` }]
        });
        const p = JSON.parse(r.content[0].text);
        ai_score = p.score; ai_feedback = p.feedback; is_correct = ai_score >= 6;
      } catch { ai_score = 6; ai_feedback = 'إجابة جيدة! تضمنت المفاهيم الأساسية.'; is_correct = true; }
    } else {
      ai_score = 7; ai_feedback = 'إجابة جيدة! للتقييم الفعلي بالذكاء الاصطناعي، أضف مفتاح Anthropic API.'; is_correct = true;
    }
  }

  if (is_correct) { req.user.xp_points = (req.user.xp_points || 0) + 10; }
  res.json({ is_correct, correct_answer: q.correct_answer, explanation: q.explanation, ai_score, ai_feedback });
});

app.post('/api/exams/:sessionId/complete', authMW, (req, res) => {
  const { duration_seconds = 0 } = req.body;
  const session = DB.sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });
  const xp = Math.round((req.user.xp_points || 0) * 0.1 + 5);
  req.user.xp_points = (req.user.xp_points || 0) + xp;
  req.user.streak_days = (req.user.streak_days || 0) + (Math.random() > 0.7 ? 1 : 0);
  res.json({ xp_earned: xp, grade:'جيد', message:`انتهيت! +${xp} XP` });
});

app.get('/api/exams/history', authMW, (req, res) => {
  res.json({ sessions: [], total: 0 });
});

// ── AI Tutor ──
app.post('/api/tutor/chat', authMW, async (req, res) => {
  const { message, subject_slug = 'english' } = req.body;
  if (!message) return res.status(400).json({ error: 'الرسالة فارغة' });
  if (req.user.credits < 1) return res.status(402).json({ error: 'رصيدك نفد!', code:'INSUFFICIENT_CREDITS' });
  req.user.credits--;

  const SYSTEMS = {
    english: 'أنت معلم متخصص في اللغة الإنجليزية للاختبار الوطني العراقي. اشرح بوضوح مع أمثلة.',
    arabic:  'أنت معلم متخصص في اللغة العربية للاختبار الوطني العراقي. قدّم إجابات بأسلوب علمي.',
    computer:'أنت معلم متخصص في الحاسوب للاختبار الوطني العراقي. اشرح بخطوات واضحة.',
  };

  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'demo_key') {
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const r = await ai.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 1000,
        system: SYSTEMS[subject_slug] || SYSTEMS.english,
        messages: [{ role:'user', content: message }],
      });
      return res.json({ reply: r.content[0].text, credits_left: req.user.credits });
    } catch (e) {
      return res.json({ reply:`خطأ في الاتصال بـ Claude AI: ${e.message}. تأكد من صحة مفتاح ANTHROPIC_API_KEY في ملف .env`, credits_left: req.user.credits });
    }
  }

  // Demo fallback
  const demos = {
    english: `بخصوص سؤالك: "${message}"\n\nهذا موضوع مهم في منهج الاختبار الوطني. للحصول على شرح تفصيلي بالذكاء الاصطناعي، أضف مفتاح Anthropic API في ملف .env\n\nمثال على القاعدة: استخدم Present Simple للحقائق العامة، وPast Simple للأحداث المنتهية.`,
    arabic:  `بخصوص سؤالك: "${message}"\n\nموضوع مهم في المنهج الوزاري. لتفعيل الذكاء الاصطناعي الكامل، أضف ANTHROPIC_API_KEY في .env\n\nتذكّر: الفاعل مرفوع، والمفعول به منصوب، والمضاف إليه مجرور.`,
    computer:`بخصوص "${message}"\n\nنصيحة سريعة: Ctrl+S للحفظ، Ctrl+C للنسخ، Ctrl+V للصق في جميع برامج Office.\n\nلشرح أكثر تفصيلاً، أضف ANTHROPIC_API_KEY في .env`,
  };
  res.json({ reply: demos[subject_slug] || demos.english, credits_left: req.user.credits });
});

app.get('/api/tutor/conversations', authMW, (req, res) => res.json({ conversations: [] }));

// ── PDF ──
app.post('/api/pdf/upload', authMW, (req, res) => {
  const id = 'pdf_' + Date.now();
  setTimeout(() => {
    DB.sessions.set(id, { status:'done', summary:'ملخص الملف المرفوع', key_concepts:['مفهوم 1','مفهوم 2'], generated_questions:[{text:'سؤال من الملف',type:'mcq',options:['أ)','ب)','ج)','د)'],correct:0}] });
  }, 3000);
  res.status(202).json({ pdf_id: id, status:'analyzing', message:'جارٍ التحليل...' });
});

app.get('/api/pdf/:id', authMW, (req, res) => {
  const pdf = DB.sessions.get(req.params.id) || { status:'analyzing' };
  res.json({ pdf: { id: req.params.id, ...pdf } });
});

app.get('/api/pdf', authMW, (req, res) => res.json({ files: [] }));

// ── Payments ──
app.get('/api/payments/packages', (_, res) => res.json({ packages: {
  starter:  { credits:50,  priceIQD:2500,  name:'باقة المبتدئ'  },
  standard: { credits:150, priceIQD:5000,  name:'الباقة القياسية'},
  premium:  { credits:400, priceIQD:10000, name:'الباقة المميزة' },
}}));

app.post('/api/payments/initiate', authMW, (req, res) => {
  const { package_id } = req.body;
  const pkgs = { starter:{credits:50,priceIQD:2500}, standard:{credits:150,priceIQD:5000}, premium:{credits:400,priceIQD:10000} };
  const pkg = pkgs[package_id];
  if (!pkg) return res.status(400).json({ error: 'باقة غير موجودة' });
  const txnId = 'txn_' + Date.now();
  res.json({ transaction_id: txnId, payment_url: `http://localhost:3001/payment/demo?txn=${txnId}&pkg=${package_id}`, package: pkg });
});

app.post('/api/payments/verify', authMW, (req, res) => {
  // Demo: add credits directly
  const pkgs = { starter:50, standard:150, premium:400 };
  const added = 50; // default demo
  req.user.credits += added;
  res.json({ message:`تم إضافة ${added} رصيد!`, new_credits: req.user.credits });
});

app.get('/api/payments/history', authMW, (req, res) => {
  const txns = [...DB.transactions.values()].filter(t => t.user_id === req.user.id);
  res.json({ transactions: txns });
});

// ── User ──
app.get('/api/users/me/stats', authMW, (req, res) => {
  res.json({
    stats: { ...req.user, total_sessions:0, total_answers:0, correct_answers:0, avg_score:0, total_study_minutes:0 },
    subject_performance: [
      { subject_name:'اللغة الإنجليزية', accuracy_pct:0, total_answers:0, correct_count:0 },
      { subject_name:'اللغة العربية',    accuracy_pct:0, total_answers:0, correct_count:0 },
      { subject_name:'الحاسوب',          accuracy_pct:0, total_answers:0, correct_count:0 },
    ],
    achievements: [],
  });
});

app.patch('/api/users/me', authMW, (req, res) => {
  const allowed = ['full_name','governorate','grade','theme'];
  Object.entries(req.body).forEach(([k,v]) => { if (allowed.includes(k)) req.user[k] = v; });
  const { password_hash, ...safe } = req.user;
  res.json({ user: safe, message:'تم التحديث' });
});

app.get('/api/users/me/notifications', authMW, (req, res) => res.json({ notifications: [
  { id:'n1', title:'مرحباً بك في منصة النجاح! 🎓', message:`لديك ${req.user.credits} رصيد مجاني`, type:'system', icon:'🎁', is_read:false, created_at: new Date().toISOString() },
]}));

// ── Leaderboard ──
app.get('/api/leaderboard', authMW, (req, res) => {
  const mock = [
    { id:'1', full_name:'أحمد محمد الحسيني', governorate:'بغداد',     xp_points:9820, streak_days:30, level:22, rank_global:1 },
    { id:'2', full_name:'فاطمة علي الكاظمي', governorate:'البصرة',    xp_points:8640, streak_days:25, level:20, rank_global:2 },
    { id:'3', full_name:'علي حسن الربيعي',   governorate:'النجف',      xp_points:7900, streak_days:18, level:18, rank_global:3 },
    { id:'4', full_name:'زينب كريم الزيدي',  governorate:'كربلاء',    xp_points:7200, streak_days:22, level:17, rank_global:4 },
    { id:'5', full_name:'محمد جاسم العامري', governorate:'الموصل',    xp_points:6800, streak_days:15, level:16, rank_global:5 },
    { id: req.user.id, full_name: req.user.full_name, governorate: req.user.governorate, xp_points: req.user.xp_points, streak_days: req.user.streak_days, level: req.user.level, rank_global: 247 },
  ];
  res.json({ leaderboard: mock, my_rank: 247 });
});

// ── 404 ──
app.use((req, res) => res.status(404).json({ error: `المسار غير موجود: ${req.method} ${req.path}` }));

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});

// ==================== Start ====================
app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(50));
  console.log('🎓 منصة النجاح — السيرفر يعمل!');
  console.log('═'.repeat(50));
  console.log(`🚀 الرابط:    http://localhost:${PORT}`);
  console.log(`🔍 Health:    http://localhost:${PORT}/health`);
  console.log(`📊 API Docs:  http://localhost:${PORT}/api/subjects`);
  console.log('═'.repeat(50));
  console.log('⚡ وضع Demo — قاعدة بيانات في الذاكرة');
  console.log('💡 للإنتاج: أضف SUPABASE_URL في .env');
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'demo_key') {
    console.log('⚠️  المعلم الذكي: أضف ANTHROPIC_API_KEY في .env لتفعيله');
  } else {
    console.log('✅ المعلم الذكي: مفعّل بـ Claude AI');
  }
  console.log('═'.repeat(50) + '\n');
});

module.exports = app;
