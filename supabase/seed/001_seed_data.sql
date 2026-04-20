-- ============================================================
-- منصة النجاح — بيانات أولية (Seed)
-- ============================================================

-- =================== المواد الدراسية ===================
INSERT INTO subjects (slug, name_ar, name_en, icon, color, grade_level, is_national, display_order) VALUES
  ('english',  'اللغة الإنجليزية', 'English Language', '🔤', '#3b82f6', 'both', TRUE, 1),
  ('arabic',   'اللغة العربية',    'Arabic Language',  '📖', '#10b981', 'both', TRUE, 2),
  ('computer', 'الحاسوب',          'Computer Science', '💻', '#8b5cf6', 'both', TRUE, 3);

-- =================== أبواب اللغة الإنجليزية ===================
INSERT INTO chapters (subject_id, slug, name_ar, name_en, chapter_number) VALUES
  (1, 'eng-grammar',     'Grammar — القواعد النحوية',        'Grammar',               1),
  (1, 'eng-reading',     'Reading Comprehension — فهم المقروء', 'Reading Comprehension', 2),
  (1, 'eng-vocabulary',  'Vocabulary — المفردات',             'Vocabulary',            3),
  (1, 'eng-writing',     'Writing — الكتابة',                 'Writing',               4),
  (1, 'eng-translation', 'Translation — الترجمة',             'Translation',           5),
  (1, 'eng-tenses',      'Tenses — الأزمنة',                  'Verb Tenses',           6),
  (1, 'eng-conditionals','Conditional Sentences — الجمل الشرطية', 'Conditionals',       7),
  (1, 'eng-passive',     'Passive Voice — المبني للمجهول',    'Passive Voice',         8),
  (1, 'eng-reported',    'Reported Speech — الكلام المنقول',  'Reported Speech',       9),
  (1, 'eng-modal',       'Modal Verbs — الأفعال المساعدة',    'Modal Verbs',           10);

-- =================== أبواب اللغة العربية ===================
INSERT INTO chapters (subject_id, slug, name_ar, name_en, chapter_number) VALUES
  (2, 'ara-nahw',     'النحو والإعراب',           'Syntax & Parsing',      1),
  (2, 'ara-sarf',     'الصرف والاشتقاق',          'Morphology',            2),
  (2, 'ara-balagha',  'البلاغة والبيان',           'Rhetoric',              3),
  (2, 'ara-adab',     'الأدب والنصوص',             'Literature & Texts',    4),
  (2, 'ara-qiraah',   'فهم المقروء',               'Reading Comprehension', 5),
  (2, 'ara-inshaah',  'الإنشاء والكتابة',          'Composition',           6),
  (2, 'ara-imlaa',    'الإملاء والخط',             'Spelling',              7);

-- =================== أبواب الحاسوب ===================
INSERT INTO chapters (subject_id, slug, name_ar, name_en, chapter_number) VALUES
  (3, 'com-basics',   'أساسيات الحاسوب',           'Computer Basics',       1),
  (3, 'com-windows',  'نظام التشغيل Windows',       'Windows OS',            2),
  (3, 'com-word',     'Microsoft Word',              'Microsoft Word',        3),
  (3, 'com-excel',    'Microsoft Excel',             'Microsoft Excel',       4),
  (3, 'com-access',   'Microsoft Access',            'Microsoft Access',      5),
  (3, 'com-powerpoint','Microsoft PowerPoint',       'Microsoft PowerPoint',  6),
  (3, 'com-internet', 'الإنترنت والشبكات',          'Internet & Networks',   7),
  (3, 'com-security', 'أمن المعلومات',              'Information Security',  8);

-- =================== نماذج أسئلة — اللغة الإنجليزية ===================
INSERT INTO questions (subject_id, chapter_id, question_text, question_type, options, correct_answer, hint, explanation, difficulty, year, session, is_ministerial) VALUES

-- Grammar - Conditionals
(1, 7,
 'Choose the correct form: "If I _____ you, I would study harder."',
 'mcq',
 '[{"label":"A","text":"am"},{"label":"B","text":"was"},{"label":"C","text":"were"},{"label":"D","text":"be"}]',
 2,
 'Type 2 conditional uses past subjunctive — "were" for all subjects.',
 'In hypothetical (Type 2) conditionals: "If + subject + WERE..." is the correct form regardless of the subject. "Was" is informal/spoken only.',
 'easy', 2024, 1, TRUE),

-- Grammar - Tenses
(1, 6,
 'She _____ her homework before the teacher arrived.',
 'mcq',
 '[{"label":"A","text":"finishes"},{"label":"B","text":"finished"},{"label":"C","text":"had finished"},{"label":"D","text":"has finished"}]',
 2,
 'Which tense describes an action completed BEFORE another past action?',
 'The Past Perfect (had + V3) is used for an action that was completed before another past action. "Before the teacher arrived" is the key clue.',
 'medium', 2023, 1, TRUE),

-- Grammar - Passive Voice
(1, 8,
 'The letter _____ by the secretary yesterday.',
 'mcq',
 '[{"label":"A","text":"typed"},{"label":"B","text":"was typed"},{"label":"C","text":"has been typed"},{"label":"D","text":"is typed"}]',
 1,
 'Passive voice = was/were + past participle. Look at the time clue: "yesterday".',
 '"Yesterday" indicates Simple Past. Passive Simple Past = was/were + V3. So: "was typed" ✓',
 'easy', 2022, 2, TRUE),

-- Vocabulary
(1, 3,
 'The word "benevolent" most nearly means:',
 'mcq',
 '[{"label":"A","text":"harmful"},{"label":"B","text":"kind and generous"},{"label":"C","text":"clever"},{"label":"D","text":"strict"}]',
 1,
 '"Bene-" in Latin means "good". Think of "benefit".',
 '"Benevolent" = well-meaning and kindly. From Latin: bene (good) + volent (wishing). A benevolent person wishes good for others.',
 'easy', 2024, 2, TRUE),

-- Reading Comprehension
(1, 2,
 'Read: "The industrial revolution fundamentally transformed society by moving production from homes to factories." What does "fundamentally" mean?',
 'mcq',
 '[{"label":"A","text":"slightly"},{"label":"B","text":"temporarily"},{"label":"C","text":"deeply and completely"},{"label":"D","text":"accidentally"}]',
 2,
 '"Fundamentally" relates to "fundamental" = basic/core. How deeply did the change go?',
 '"Fundamentally" means at the most basic level — completely and profoundly. The industrial revolution did not make a small or temporary change but a deep, complete transformation.',
 'medium', 2025, 1, TRUE),

-- Modal Verbs
(1, 10,
 'You _____ see a doctor immediately. Your condition is serious.',
 'mcq',
 '[{"label":"A","text":"might"},{"label":"B","text":"could"},{"label":"C","text":"should"},{"label":"D","text":"would"}]',
 2,
 'Which modal expresses strong advice or recommendation?',
 '"Should" expresses strong advice or moral obligation. "Might/Could" express possibility (weaker). "Would" is for hypothetical situations.',
 'easy', 2023, 2, TRUE),

-- Essay
(1, 4,
 'Write a short paragraph (5-7 sentences) about the importance of learning English in the modern world.',
 'essay',
 NULL, NULL,
 'Include: communication, jobs, internet, science, travel. Use linking words: Moreover, Furthermore, In conclusion.',
 'A good answer should mention: global communication, job opportunities, access to knowledge, internet content (70% in English), scientific research, and international travel.',
 'medium', 2024, 1, TRUE);

-- =================== نماذج أسئلة — اللغة العربية ===================
INSERT INTO questions (subject_id, chapter_id, question_text, question_type, options, correct_answer, hint, explanation, difficulty, year, session, is_ministerial) VALUES

(2, 11,
 'أعرب الكلمة المُحدَّدة: "يُكرِمُ المعلمُ الطالبَ **المجتهدَ**"',
 'mcq',
 '[{"label":"أ","text":"مفعول به منصوب وعلامة نصبه الفتحة"},{"label":"ب","text":"نعت منصوب وعلامة نصبه الفتحة الظاهرة"},{"label":"ج","text":"خبر مرفوع بالضمة"},{"label":"د","text":"حال منصوبة وعلامة نصبها الفتحة"}]',
 1,
 'النعت يتبع المنعوت في إعرابه — والمنعوت هنا "الطالبَ" منصوب.',
 '"المجتهدَ" نعت (صفة) للطالب، والنعت يتبع المنعوت في الإعراب. "الطالبَ" مفعول به منصوب، لذا "المجتهدَ" نعت منصوب وعلامة نصبه الفتحة الظاهرة على آخره.',
 'medium', 2024, 1, TRUE),

(2, 13,
 'ما نوع الصورة البلاغية في قول الشاعر: "وكأنَّ النجومَ دررٌ منثورةٌ على بساطٍ من حريرٍ أزرق"؟',
 'mcq',
 '[{"label":"أ","text":"استعارة مكنية"},{"label":"ب","text":"تشبيه تام (مُفصَّل)"},{"label":"ج","text":"تشبيه مُجمَل"},{"label":"د","text":"كناية"}]',
 2,
 'التشبيه المُجمَل: ذُكر فيه المشبه والمشبه به وأداة التشبيه دون وجه الشبه.',
 'البيت يحتوي على: المشبه (النجوم) + أداة التشبيه (كأنَّ) + المشبه به (درر منثورة) — لكن وجه الشبه (اللمعان والانتشار) محذوف. هذا هو التشبيه المُجمَل.',
 'hard', 2023, 1, TRUE),

(2, 11,
 'في الجملة "أريدُ أنْ أتعلَّمَ اللغاتِ" — ما علامة نصب "أتعلَّمَ"؟',
 'mcq',
 '[{"label":"أ","text":"الفتحة المقدرة"},{"label":"ب","text":"الفتحة الظاهرة على آخره"},{"label":"ج","text":"حذف النون"},{"label":"د","text":"الكسرة نيابةً عن الفتحة"}]',
 1,
 'الفعل المضارع الصحيح الآخر يُنصب بالفتحة الظاهرة.',
 '"أتعلَّمَ" فعل مضارع منصوب بـ "أنْ" وعلامة نصبه الفتحة الظاهرة على آخره لأنه فعل صحيح الآخر (ليس معتل الآخر).',
 'easy', 2022, 1, TRUE);

-- =================== نماذج أسئلة — الحاسوب ===================
INSERT INTO questions (subject_id, chapter_id, question_text, question_type, options, correct_answer, hint, explanation, difficulty, year, session, is_ministerial) VALUES

(3, 17,
 'ما الاختصار الصحيح لحفظ الملف في Microsoft Word؟',
 'mcq',
 '[{"label":"A","text":"Ctrl + S"},{"label":"B","text":"Ctrl + P"},{"label":"C","text":"Ctrl + O"},{"label":"D","text":"Ctrl + N"}]',
 0,
 'S = Save (حفظ)',
 'Ctrl+S = Save (حفظ). Ctrl+P = Print (طباعة). Ctrl+O = Open (فتح). Ctrl+N = New (جديد). هذه الاختصارات تعمل في جميع برامج Microsoft Office.',
 'easy', 2024, 1, TRUE),

(3, 18,
 'في Microsoft Excel، ما الدالة المستخدمة لإيجاد أكبر قيمة في نطاق من الخلايا A1:A10؟',
 'mcq',
 '[{"label":"A","text":"=SUM(A1:A10)"},{"label":"B","text":"=MAX(A1:A10)"},{"label":"C","text":"=COUNT(A1:A10)"},{"label":"D","text":"=AVERAGE(A1:A10)"}]',
 1,
 'MAX = Maximum = أكبر قيمة',
 '=MAX(نطاق) تُرجع أكبر قيمة في النطاق المحدد. =MIN للأصغر. =SUM للمجموع. =AVERAGE للمتوسط. =COUNT لعدد الخلايا.',
 'easy', 2023, 1, TRUE),

(3, 23,
 'ما المقصود بـ "IP Address"؟ وما نوعاه مع مثال على كل منهما؟',
 'essay',
 NULL, NULL,
 'IP = Internet Protocol. فكر في: IPv4 (مثال: 192.168.1.1) و IPv6.',
 'IP Address: عنوان رقمي فريد يُحدِّد كل جهاز على الشبكة. النوع 1: IPv4 (32 بت) مثل 192.168.1.1. النوع 2: IPv6 (128 بت) مثل 2001:0db8:85a3::8a2e:0370:7334 — طُوِّر بسبب نفاد عناوين IPv4.',
 'medium', 2022, 2, TRUE),

(3, 17,
 'في Microsoft Word، ما الفرق بين "Save" و"Save As"؟',
 'mcq',
 '[{"label":"A","text":"لا فرق بينهما"},{"label":"B","text":"Save يحفظ الملف الحالي، Save As يحفظ نسخة باسم أو مكان مختلف"},{"label":"C","text":"Save As للحفظ الأول فقط"},{"label":"D","text":"Save تفتح مربع حوار دائماً"}]',
 1,
 'فكر: ماذا تفعل عندما تريد حفظ نسخة ثانية من ملفك؟',
 'Save: يحفظ التغييرات على الملف الحالي بنفس الاسم والمكان. Save As: يفتح مربع حوار يتيح لك اختيار اسم جديد أو مجلد مختلف أو صيغة مختلفة (مثل PDF).',
 'easy', 2024, 2, TRUE);

-- =================== الإنجازات ===================
INSERT INTO achievements (slug, name_ar, icon, xp_reward, condition_type, condition_value) VALUES
  ('first_question',  'أول خطوة',           '⭐', 10,  'questions_count', 1),
  ('ten_questions',   '10 أسئلة',            '📚', 20,  'questions_count', 10),
  ('hundred_q',       '100 سؤال',            '💯', 100, 'questions_count', 100),
  ('perfect_score',   'علامة كاملة',         '🎯', 150, 'score',           100),
  ('streak_3',        '3 أيام متواصلة',      '🔥', 30,  'streak',          3),
  ('streak_7',        '7 أيام متواصلة',      '🔥', 75,  'streak',          7),
  ('streak_30',       '30 يوم متواصل',       '🔥', 300, 'streak',          30),
  ('speed_demon',     'سرعة البرق',          '⚡', 50,  'avg_time_per_q',  15),
  ('top_1pct',        'ضمن أفضل 1%',         '🏆', 500, 'rank_percentile', 1),
  ('all_subjects',    'أتقن المواد الثلاث',  '🎓', 200, 'subjects_mastered',3),
  ('pdf_analyzer',    'محلل الوثائق',        '📄', 50,  'pdf_count',       5),
  ('national_champ',  'بطل الاختبار الوطني', '🇮🇶', 1000,'national_score',  95);

-- =================== إعدادات النظام ===================
INSERT INTO system_settings (key, value, description) VALUES
  ('free_trial_credits',     '15',      'عدد الرصيد المجاني عند التسجيل'),
  ('free_pdf_analyses',      '1',       'عدد تحليلات PDF المجانية'),
  ('credits_per_10q_exam',   '1',       'رصيد لكل امتحان 10 أسئلة'),
  ('credits_per_50q_exam',   '5',       'رصيد لكل امتحان 50 سؤال'),
  ('credits_per_tutor_msg',  '1',       'رصيد لكل رسالة للمعلم الذكي'),
  ('credits_per_pdf',        '2',       'رصيد لكل تحليل PDF'),
  ('xp_per_correct',         '10',      'XP لكل إجابة صحيحة'),
  ('xp_per_session',         '5',       'XP إضافية عند إكمال جلسة'),
  ('max_upload_mb',          '20',      'الحد الأقصى لحجم ملف PDF بالميجابايت'),
  ('platform_name',          'منصة النجاح', 'اسم المنصة'),
  ('support_email',          'support@najah-platform.iq', 'البريد الإلكتروني للدعم'),
  ('maintenance_mode',       'false',   'وضع الصيانة');
