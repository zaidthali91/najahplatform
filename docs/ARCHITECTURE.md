# منصة النجاح — دليل المشروع الكامل
## وثيقة المعمارية والتشغيل (Architecture & Deployment Guide)

---

## هيكل المشروع الكامل

```
najah-platform/
│
├── backend/                        # Node.js + Express API
│   ├── src/
│   │   ├── server.js               # نقطة الدخول الرئيسية
│   │   ├── config/
│   │   │   └── supabase.js         # اتصال Supabase
│   │   ├── middleware/
│   │   │   └── auth.middleware.js  # JWT + RBAC + credit check
│   │   ├── routes/
│   │   │   ├── auth.routes.js      # تسجيل / دخول / Google OAuth
│   │   │   ├── question.routes.js  # جلب الأسئلة وفلترتها
│   │   │   ├── exam.routes.js      # جلسات الامتحان والإجابات
│   │   │   ├── tutor.routes.js     # المعلم الذكي (Claude API)
│   │   │   ├── pdf.routes.js       # رفع وتحليل PDF
│   │   │   ├── payment.routes.js   # ZainCash / FIB / Stripe
│   │   │   ├── user.routes.js      # الملف الشخصي والإحصاء
│   │   │   ├── leaderboard.routes.js  # قائمة المتصدرين
│   │   │   └── subject.routes.js   # المواد والأبواب
│   │   └── utils/
│   │       └── logger.js           # Winston Logger
│   ├── .env.example                # نموذج متغيرات البيئة
│   └── package.json
│
├── frontend/                       # Next.js 14 (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── home/page.tsx
│   │   │   │   ├── exam/page.tsx
│   │   │   │   ├── tutor/page.tsx
│   │   │   │   ├── pdf/page.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── leaderboard/page.tsx
│   │   │   │   └── pricing/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx            # Landing page
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui مكونات
│   │   │   ├── exam/               # ExamCard, QuizTimer, ResultsView
│   │   │   ├── tutor/              # ChatBubble, SubjectSidebar
│   │   │   ├── pdf/                # PdfDropzone, PdfResults
│   │   │   ├── dashboard/          # StatsCard, Heatmap, BarChart
│   │   │   └── layout/             # Navbar, Sidebar, ThemeToggle
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          # مصادقة المستخدم
│   │   │   ├── useExam.ts          # إدارة جلسة الامتحان
│   │   │   ├── useCredits.ts       # إدارة الرصيد
│   │   │   └── useTutor.ts         # محادثات المعلم
│   │   ├── lib/
│   │   │   ├── api.ts              # axios instance + interceptors
│   │   │   ├── supabase.ts         # Supabase client
│   │   │   └── store.ts            # Zustand global state
│   │   └── styles/
│   │       └── globals.css         # Tailwind + CSS variables
│   └── package.json
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # كل الجداول + RLS + Triggers + Views
│   └── seed/
│       └── 001_seed_data.sql       # المواد + الأبواب + نماذج الأسئلة
│
└── docs/
    ├── ARCHITECTURE.md             # هذا الملف
    ├── API.md                      # توثيق الـ API الكامل
    └── DEPLOYMENT.md               # خطوات النشر
```

---

## معمارية النظام

```
┌─────────────────────────────────────────────────────────────┐
│                         المستخدم                            │
│                    (50,000+ طالب)                           │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (CDN + Edge)                       │
│                  Next.js 14 — Frontend                       │
│         ┌──────────────────────────────────────┐            │
│         │  React SSR + Static Pages + ISR        │            │
│         │  RTL Support + Dark/Light Mode         │            │
│         │  Zustand State + React Query Cache     │            │
│         └──────────────────────────────────────┘            │
└─────────────────┬───────────────────────────────────────────┘
                  │ REST API / Supabase Realtime
                  ▼
┌─────────────────────────────────────────────────────────────┐
│               Railway / Render — Backend                     │
│                  Node.js + Express                           │
│  ┌────────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐  │
│  │  Auth API  │ │ Exam API  │ │ Tutor API  │ │ PDF API  │  │
│  └────────────┘ └───────────┘ └────────────┘ └──────────┘  │
│  ┌────────────┐ ┌───────────┐ ┌────────────┐               │
│  │Payment API │ │   User    │ │Leaderboard │               │
│  └────────────┘ └───────────┘ └────────────┘               │
└──────┬───────────────┬───────────────┬──────────────────────┘
       │               │               │
       ▼               ▼               ▼
┌──────────────┐ ┌──────────┐  ┌─────────────────┐
│  Supabase    │ │  Redis   │  │  Anthropic API  │
│  PostgreSQL  │ │  Cache   │  │   Claude 4.x    │
│  + Storage   │ │(Upstash) │  │   AI Tutor      │
│  + Auth      │ └──────────┘  │   PDF Analysis  │
│  + Realtime  │               └─────────────────┘
└──────────────┘
```

---

## خطوات الإعداد والتشغيل

### الخطوة 1: إعداد Supabase

```bash
# 1. أنشئ مشروعاً على https://supabase.com
# 2. في SQL Editor، نفّذ بالترتيب:

# أولاً: المخطط
psql -h db.xxx.supabase.co -U postgres -f supabase/migrations/001_initial_schema.sql

# ثانياً: البيانات الأولية
psql -h db.xxx.supabase.co -U postgres -f supabase/seed/001_seed_data.sql

# 3. في Supabase Dashboard → Storage → إنشاء bucket:
#    - najah-pdfs (public: false, max size: 20MB)
#    - najah-avatars (public: true)

# 4. في Authentication → Providers:
#    - فعّل Email/Password
#    - فعّل Google OAuth (أضف Client ID/Secret من Google Cloud Console)
```

### الخطوة 2: إعداد البيئة

```bash
# Backend
cd backend
cp .env.example .env
# عبّئ جميع القيم في .env

# Frontend
cd ../frontend
cp .env.example .env.local
# أضف:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

### الخطوة 3: تشغيل محلي

```bash
# Backend
cd backend
npm install
npm run dev
# يعمل على: http://localhost:3001

# Frontend (نافذة جديدة)
cd frontend
npm install
npm run dev
# يعمل على: http://localhost:3000
```

### الخطوة 4: اختبار الـ API

```bash
# Health Check
curl http://localhost:3001/health

# تسجيل مستخدم
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"12345678","full_name":"اختبار","grade":"3mid"}'

# جلب الأسئلة (بعد تسجيل الدخول والحصول على token)
curl http://localhost:3001/api/questions?subject=english&limit=5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## النشر على الإنتاج (Production Deployment)

### Frontend → Vercel
```bash
npm install -g vercel
cd frontend
vercel --prod

# متغيرات البيئة في Vercel Dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_API_URL=https://api.najah-platform.iq
```

### Backend → Railway
```bash
# 1. ارفع الكود على GitHub
# 2. أنشئ مشروعاً على https://railway.app
# 3. اربط الـ repo
# 4. أضف متغيرات البيئة
# 5. سيُنشر تلقائياً

# أو باستخدام Docker:
docker build -t najah-backend ./backend
docker run -p 3001:3001 --env-file .env najah-backend
```

### Dockerfile للـ Backend
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3001
CMD ["node", "src/server.js"]
```

---

## نقاط الـ API الكاملة

| الطريقة | المسار | الوصف | المصادقة |
|---------|--------|-------|----------|
| POST | /api/auth/register | إنشاء حساب جديد | لا |
| POST | /api/auth/login | تسجيل الدخول | لا |
| POST | /api/auth/google | دخول Google | لا |
| POST | /api/auth/refresh | تجديد التوكن | لا |
| GET  | /api/auth/me | بيانات المستخدم الحالي | نعم |
| GET  | /api/subjects | كل المواد والأبواب | لا |
| GET  | /api/questions | جلب أسئلة مع فلترة | نعم |
| GET  | /api/questions/weak | أسئلة نقاط الضعف | نعم |
| POST | /api/exams/start | بدء جلسة امتحان | نعم |
| POST | /api/exams/:id/answer | تسجيل إجابة | نعم |
| POST | /api/exams/:id/complete | إنهاء الجلسة | نعم |
| GET  | /api/exams/history | سجل الامتحانات | نعم |
| POST | /api/tutor/chat | رسالة للمعلم الذكي | نعم |
| GET  | /api/tutor/conversations | قائمة المحادثات | نعم |
| POST | /api/pdf/upload | رفع PDF للتحليل | نعم |
| GET  | /api/pdf/:id | نتائج تحليل PDF | نعم |
| GET  | /api/payments/packages | باقات الرصيد | لا |
| POST | /api/payments/initiate | بدء عملية الدفع | نعم |
| POST | /api/payments/verify | التحقق من الدفع | نعم |
| GET  | /api/users/me/stats | إحصاء الطالب | نعم |
| PATCH| /api/users/me | تحديث الملف | نعم |
| GET  | /api/leaderboard | قائمة المتصدرين | نعم |

---

## قدرة النظام على التحمّل (50,000+ مستخدم)

### Supabase
- خطة Pro: حتى 500 اتصال متزامن، 8GB قاعدة بيانات
- Connection Pooling مع PgBouncer (مدمج)
- Read Replicas للاستعلامات الثقيلة

### Backend (Node.js Cluster)
```javascript
// src/cluster.js — تشغيل متعدد العمليات
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on('exit', () => cluster.fork()); // إعادة تشغيل عند الانهيار
} else {
  require('./server');
}
```

### Redis للتخزين المؤقت
```javascript
// تخزين الأسئلة الأكثر طلباً
const CACHE_KEY = `questions:${subject}:${year}`;
const cached = await redis.get(CACHE_KEY);
if (cached) return JSON.parse(cached);
// ... جلب من قاعدة البيانات
await redis.setEx(CACHE_KEY, 3600, JSON.stringify(data)); // ساعة واحدة
```

### Rate Limiting لحماية الـ AI
- حد عام: 200 طلب / 15 دقيقة لكل IP
- حد الذكاء الاصطناعي: 20 رسالة / دقيقة لكل مستخدم
- حد PDF: 5 ملفات / ساعة لكل مستخدم

---

## قائمة المهام التالية

### الأولوية العالية ✅
- [x] قاعدة البيانات الكاملة (PostgreSQL + Supabase)
- [x] نظام المصادقة (Email + Google OAuth)
- [x] API الكامل (Auth, Exam, Tutor, PDF, Payment)
- [x] المعلم الذكي (Claude API)
- [x] تحليل PDF بالذكاء الاصطناعي
- [x] نظام الرصيد والدفع
- [x] الواجهة الأمامية (HTML prototype)

### الأولوية المتوسطة 🔄
- [ ] تكامل ZainCash الحقيقي (يحتاج حساب تجاري)
- [ ] تكامل FIB (يحتاج تسجيل تجاري عراقي)
- [ ] إضافة المزيد من الأسئلة (2,000+ سؤال لكل مادة)
- [ ] Next.js Frontend (تحويل HTML prototype)
- [ ] نظام الإشعارات Push
- [ ] خطة الدراسة التفصيلية اليومية

### الأولوية المنخفضة 📋
- [ ] تطبيق موبايل (React Native / Expo)
- [ ] لوحة تحكم الإدارة
- [ ] تقارير PDF للمعلمين
- [ ] نظام المجموعات الدراسية
- [ ] محاضرات فيديو مرتبطة
