-- ============================================================
-- منصة النجاح — قاعدة البيانات الكاملة
-- PostgreSQL / Supabase
-- الإصدار: 1.0.0
-- ============================================================

-- =================== تفعيل الإضافات ===================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- البحث النصي السريع
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- البحث بدون تشكيل

-- =================== جدول المستخدمين ===================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  governorate   VARCHAR(50) DEFAULT 'بغداد',
  grade         VARCHAR(20) CHECK (grade IN ('3mid','6prep')) DEFAULT '3mid',
  branch        VARCHAR(20) CHECK (branch IN ('sci','lit','general')) DEFAULT 'general',
  role          VARCHAR(20) CHECK (role IN ('student','admin','teacher')) DEFAULT 'student',

  -- رصيد ونقاط
  credits       INTEGER DEFAULT 15 CHECK (credits >= 0),
  xp_points     INTEGER DEFAULT 0,
  level         INTEGER DEFAULT 1,
  streak_days   INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,

  -- إعدادات
  theme         VARCHAR(10) DEFAULT 'dark',
  language      VARCHAR(5) DEFAULT 'ar',
  notifications_enabled BOOLEAN DEFAULT TRUE,

  -- حسابات مرتبطة
  google_id     VARCHAR(100) UNIQUE,
  is_verified   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,

  -- توقيتات
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

-- =================== جدول المواد الدراسية ===================
CREATE TABLE subjects (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(50) UNIQUE NOT NULL,  -- 'english', 'arabic', 'computer'
  name_ar       VARCHAR(100) NOT NULL,
  name_en       VARCHAR(100) NOT NULL,
  icon          VARCHAR(10),
  color         VARCHAR(20),
  grade_level   VARCHAR(20),  -- '3mid', '6prep', 'both'
  is_national   BOOLEAN DEFAULT TRUE,  -- مادة اختبار وطني
  display_order INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =================== جدول أبواب المنهج ===================
CREATE TABLE chapters (
  id            SERIAL PRIMARY KEY,
  subject_id    INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  slug          VARCHAR(80) UNIQUE NOT NULL,
  name_ar       VARCHAR(150) NOT NULL,
  name_en       VARCHAR(150),
  chapter_number INTEGER DEFAULT 1,
  description   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =================== جدول الأسئلة ===================
CREATE TABLE questions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id    INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  chapter_id    INTEGER REFERENCES chapters(id) ON DELETE SET NULL,

  -- محتوى السؤال
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) CHECK (question_type IN ('mcq','essay','true_false','fill','match')) DEFAULT 'mcq',
  options       JSONB,           -- [{label:"A",text:"..."}, ...]
  correct_answer INTEGER,        -- رقم الخيار الصحيح (للـ MCQ)
  model_answer  TEXT,            -- الإجابة النموذجية (للمقالي)
  hint          TEXT,
  explanation   TEXT,            -- الشرح التفصيلي

  -- تصنيف
  difficulty    VARCHAR(10) CHECK (difficulty IN ('easy','medium','hard')) DEFAULT 'medium',
  cognitive_level VARCHAR(20) CHECK (cognitive_level IN ('remember','understand','apply','analyze','evaluate','create')) DEFAULT 'understand',
  tags          TEXT[],

  -- مصدر السؤال
  year          INTEGER CHECK (year BETWEEN 1985 AND 2030),
  session       INTEGER CHECK (session IN (1,2)),
  governorate_exam VARCHAR(50),  -- إن كان امتحاناً محافظاتياً
  is_ministerial BOOLEAN DEFAULT TRUE,

  -- ميتاداتا
  times_answered INTEGER DEFAULT 0,
  times_correct  INTEGER DEFAULT 0,
  difficulty_score FLOAT DEFAULT 0.5,  -- يُحسب تلقائياً

  -- حالة
  is_active     BOOLEAN DEFAULT TRUE,
  is_reviewed   BOOLEAN DEFAULT FALSE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =================== جدول جلسات الامتحان ===================
CREATE TABLE exam_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id    INTEGER REFERENCES subjects(id),
  chapter_id    INTEGER REFERENCES chapters(id),

  -- إعدادات الجلسة
  mode          VARCHAR(30) CHECK (mode IN ('ministerial','practice','challenge','weak','national_sim','smart')) DEFAULT 'ministerial',
  question_count INTEGER NOT NULL,
  difficulty    VARCHAR(10) DEFAULT 'all',
  year_filter   VARCHAR(20),
  session_filter INTEGER,

  -- نتائج
  score         INTEGER DEFAULT 0,
  max_score     INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count   INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  percentage    FLOAT DEFAULT 0,

  -- توقيت
  duration_seconds INTEGER DEFAULT 0,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  is_completed  BOOLEAN DEFAULT FALSE,

  -- XP مكتسبة
  xp_earned     INTEGER DEFAULT 0,
  credits_used  INTEGER DEFAULT 0
);

-- =================== جدول إجابات الطالب ===================
CREATE TABLE student_answers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id   UUID REFERENCES questions(id) ON DELETE CASCADE,

  -- الإجابة
  answer_index  INTEGER,         -- للـ MCQ
  essay_answer  TEXT,            -- للمقالي
  is_correct    BOOLEAN,
  is_skipped    BOOLEAN DEFAULT FALSE,
  time_taken_seconds INTEGER DEFAULT 0,
  hint_used     BOOLEAN DEFAULT FALSE,

  -- تقييم الذكاء الاصطناعي للمقالي
  ai_score      FLOAT,           -- 0-10
  ai_feedback   TEXT,
  ai_evaluated_at TIMESTAMPTZ,

  answered_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =================== جدول المحادثات مع المعلم الذكي ===================
CREATE TABLE tutor_conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id    INTEGER REFERENCES subjects(id),
  title         VARCHAR(200),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tutor_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES tutor_conversations(id) ON DELETE CASCADE,
  role          VARCHAR(20) CHECK (role IN ('user','assistant','system')) NOT NULL,
  content       TEXT NOT NULL,
  tokens_used   INTEGER DEFAULT 0,
  credits_used  INTEGER DEFAULT 1,
  has_pdf       BOOLEAN DEFAULT FALSE,
  pdf_file_url  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =================== جدول ملفات PDF ===================
CREATE TABLE pdf_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  file_url      TEXT NOT NULL,     -- Supabase Storage URL
  file_size     INTEGER,           -- bytes
  page_count    INTEGER,
  status        VARCHAR(20) CHECK (status IN ('uploaded','analyzing','done','error')) DEFAULT 'uploaded',

  -- نتائج التحليل
  summary       TEXT,
  key_concepts  TEXT[],
  generated_questions JSONB,       -- [{text,type,options,correct,explanation}, ...]
  credits_used  INTEGER DEFAULT 2,

  uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at   TIMESTAMPTZ
);

-- =================== جدول المعاملات المالية ===================
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(20) CHECK (type IN ('purchase','usage','refund','bonus','free_trial')) NOT NULL,
  amount        INTEGER NOT NULL,  -- عدد الرصيد (موجب = إضافة، سالب = خصم)
  description   TEXT,
  reference_id  UUID,              -- معرف الجلسة أو المحادثة

  -- معلومات الدفع
  payment_method VARCHAR(30) CHECK (payment_method IN ('zaincash','fib','visa','master','asia_hawala','free')),
  payment_amount DECIMAL(12,2),    -- المبلغ بالدينار العراقي
  payment_status VARCHAR(20) CHECK (payment_status IN ('pending','completed','failed','refunded')) DEFAULT 'pending',
  payment_ref   VARCHAR(100),      -- رقم مرجع من بوابة الدفع

  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =================== جدول إنجازات الطلاب ===================
CREATE TABLE achievements (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(80) UNIQUE NOT NULL,
  name_ar       VARCHAR(100) NOT NULL,
  name_en       VARCHAR(100),
  description   TEXT,
  icon          VARCHAR(20),
  xp_reward     INTEGER DEFAULT 50,
  condition_type VARCHAR(50),  -- 'questions_count','streak','score','pdf_count',...
  condition_value INTEGER,
  is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_achievements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- =================== جدول خطة الدراسة ===================
CREATE TABLE study_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  exam_date     DATE,
  daily_hours   INTEGER DEFAULT 2,
  weak_subjects INTEGER[],   -- مصفوفة معرفات المواد الضعيفة
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE study_plan_days (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id       UUID REFERENCES study_plans(id) ON DELETE CASCADE,
  day_date      DATE NOT NULL,
  subject_id    INTEGER REFERENCES subjects(id),
  chapter_id    INTEGER REFERENCES chapters(id),
  target_minutes INTEGER DEFAULT 60,
  target_questions INTEGER DEFAULT 20,
  is_completed  BOOLEAN DEFAULT FALSE,
  actual_minutes INTEGER DEFAULT 0,
  completed_at  TIMESTAMPTZ
);

-- =================== جدول الإشعارات ===================
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  message       TEXT,
  type          VARCHAR(30) CHECK (type IN ('achievement','streak','reminder','promo','system')),
  icon          VARCHAR(20),
  is_read       BOOLEAN DEFAULT FALSE,
  action_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =================== جدول إعدادات النظام ===================
CREATE TABLE system_settings (
  key           VARCHAR(100) PRIMARY KEY,
  value         TEXT,
  description   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =================== إنشاء الفهارس (Indexes) ===================
-- فهارس الأسئلة
CREATE INDEX idx_questions_subject     ON questions(subject_id);
CREATE INDEX idx_questions_chapter     ON questions(chapter_id);
CREATE INDEX idx_questions_year        ON questions(year);
CREATE INDEX idx_questions_difficulty  ON questions(difficulty);
CREATE INDEX idx_questions_type        ON questions(question_type);
CREATE INDEX idx_questions_active      ON questions(is_active) WHERE is_active = TRUE;

-- فهرس البحث النصي في الأسئلة
CREATE INDEX idx_questions_text_search ON questions USING GIN(to_tsvector('arabic', question_text));

-- فهارس الجلسات
CREATE INDEX idx_sessions_user         ON exam_sessions(user_id);
CREATE INDEX idx_sessions_subject      ON exam_sessions(subject_id);
CREATE INDEX idx_sessions_created      ON exam_sessions(started_at DESC);

-- فهارس الإجابات
CREATE INDEX idx_answers_session       ON student_answers(session_id);
CREATE INDEX idx_answers_user          ON student_answers(user_id);
CREATE INDEX idx_answers_question      ON student_answers(question_id);

-- فهارس المعاملات
CREATE INDEX idx_transactions_user     ON transactions(user_id);
CREATE INDEX idx_transactions_created  ON transactions(created_at DESC);

-- فهارس المحادثات
CREATE INDEX idx_conversations_user    ON tutor_conversations(user_id);
CREATE INDEX idx_messages_conversation ON tutor_messages(conversation_id);

-- =================== Triggers التلقائية ===================

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_questions_updated_at  BEFORE UPDATE ON questions  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- حساب صعوبة السؤال تلقائياً (نسبة الخطأ)
CREATE OR REPLACE FUNCTION calc_question_difficulty()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.times_answered > 0 THEN
    NEW.difficulty_score = 1.0 - (NEW.times_correct::FLOAT / NEW.times_answered::FLOAT);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_question_difficulty
  BEFORE UPDATE OF times_answered, times_correct ON questions
  FOR EACH ROW EXECUTE FUNCTION calc_question_difficulty();

-- تحديث streak الطالب عند إكمال جلسة
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_study_date INTO v_last_date FROM users WHERE id = p_user_id;
  IF v_last_date = v_today - INTERVAL '1 day' THEN
    UPDATE users SET
      streak_days = streak_days + 1,
      longest_streak = GREATEST(longest_streak, streak_days + 1),
      last_study_date = v_today
    WHERE id = p_user_id;
  ELSIF v_last_date != v_today THEN
    UPDATE users SET streak_days = 1, last_study_date = v_today WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =================== Row Level Security (RLS) ===================
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_files          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;

-- كل مستخدم يرى فقط بياناته
CREATE POLICY "users_own_data"          ON users              FOR ALL USING (auth.uid() = id);
CREATE POLICY "sessions_own_data"       ON exam_sessions      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "answers_own_data"        ON student_answers    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "conversations_own_data"  ON tutor_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "messages_own_data"       ON tutor_messages     FOR ALL USING (
  auth.uid() = (SELECT user_id FROM tutor_conversations WHERE id = conversation_id)
);
CREATE POLICY "pdfs_own_data"           ON pdf_files          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "transactions_own_data"   ON transactions       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "plans_own_data"          ON study_plans        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notifications_own_data"  ON notifications      FOR ALL USING (auth.uid() = user_id);

-- الأسئلة والمواد متاحة للقراءة للجميع
CREATE POLICY "questions_public_read"   ON questions   FOR SELECT USING (is_active = TRUE);
CREATE POLICY "subjects_public_read"    ON subjects    FOR SELECT USING (is_active = TRUE);
CREATE POLICY "chapters_public_read"    ON chapters    FOR SELECT USING (is_active = TRUE);
CREATE POLICY "achievements_public"     ON achievements FOR SELECT USING (is_active = TRUE);

-- =================== Views مفيدة ===================

-- إحصاء الطالب الشامل
CREATE VIEW v_user_stats AS
SELECT
  u.id,
  u.full_name,
  u.governorate,
  u.xp_points,
  u.level,
  u.streak_days,
  u.credits,
  COUNT(DISTINCT es.id) AS total_sessions,
  COUNT(DISTINCT sa.id) AS total_answers,
  SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END) AS correct_answers,
  ROUND(AVG(es.percentage)::NUMERIC, 1) AS avg_score,
  SUM(es.duration_seconds) / 60 AS total_study_minutes
FROM users u
LEFT JOIN exam_sessions es ON es.user_id = u.id AND es.is_completed = TRUE
LEFT JOIN student_answers sa ON sa.user_id = u.id
GROUP BY u.id, u.full_name, u.governorate, u.xp_points, u.level, u.streak_days, u.credits;

-- قائمة المتصدرين
CREATE VIEW v_leaderboard AS
SELECT
  u.id,
  u.full_name,
  u.governorate,
  u.xp_points,
  u.streak_days,
  u.level,
  RANK() OVER (ORDER BY u.xp_points DESC) AS rank_global,
  RANK() OVER (PARTITION BY u.governorate ORDER BY u.xp_points DESC) AS rank_governorate
FROM users u
WHERE u.is_active = TRUE AND u.role = 'student'
ORDER BY u.xp_points DESC;

-- أداء المستخدم لكل مادة
CREATE VIEW v_subject_performance AS
SELECT
  sa.user_id,
  q.subject_id,
  s.name_ar AS subject_name,
  COUNT(sa.id) AS total_answers,
  SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END) AS correct_count,
  ROUND(
    (SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(sa.id), 0) * 100)::NUMERIC,
    1
  ) AS accuracy_pct
FROM student_answers sa
JOIN questions q ON q.id = sa.question_id
JOIN subjects s ON s.id = q.subject_id
GROUP BY sa.user_id, q.subject_id, s.name_ar;
