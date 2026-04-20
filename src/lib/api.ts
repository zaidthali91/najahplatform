// frontend/src/lib/api.ts
import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// ==================== Axios Instance ====================
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ===== Request interceptor: إضافة التوكن =====
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('najah-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
    }
  }
  return config
})

// ===== Response interceptor: معالجة الأخطاء =====
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ error?: string; code?: string }>) => {
    const msg    = error.response?.data?.error
    const code   = error.response?.data?.code
    const status = error.response?.status

    if (status === 401 && code === 'TOKEN_EXPIRED') {
      // محاولة تجديد التوكن
      try {
        const stored = localStorage.getItem('najah-auth')
        if (stored) {
          const { state } = JSON.parse(stored)
          const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refresh_token: state.refreshToken })
          // تحديث التوكن وإعادة الطلب
          localStorage.setItem('najah-auth', JSON.stringify({ state: { ...state, token: res.data.access } }))
          error.config!.headers!.Authorization = `Bearer ${res.data.access}`
          return api.request(error.config!)
        }
      } catch {
        if (typeof window !== 'undefined') window.location.href = '/auth'
      }
    }

    if (status === 402) {
      toast.error('رصيدك غير كافٍ 💳', { icon: '⚠️' })
    } else if (status === 429) {
      toast.error('طلبات كثيرة جداً، انتظر لحظة')
    } else if (status === 500) {
      toast.error('خطأ في الخادم، حاول لاحقاً')
    } else if (msg) {
      toast.error(msg)
    }

    return Promise.reject(error)
  }
)

// ==================== Auth Services ====================
export const authService = {
  register: (data: { email: string; password: string; full_name: string; grade?: string; governorate?: string }) =>
    api.post('/api/auth/register', data).then(r => r.data),

  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }).then(r => r.data),

  loginWithGoogle: (id_token: string) =>
    api.post('/api/auth/google', { id_token }).then(r => r.data),

  me: () => api.get('/api/auth/me').then(r => r.data),

  logout: () => api.post('/api/auth/logout').then(r => r.data),

  refresh: (refresh_token: string) =>
    api.post('/api/auth/refresh', { refresh_token }).then(r => r.data),
}

// ==================== Subject Services ====================
export const subjectService = {
  getAll:  () => api.get('/api/subjects').then(r => r.data),
  getStats: (slug: string) => api.get(`/api/subjects/${slug}/stats`).then(r => r.data),
}

// ==================== Question Services ====================
export const questionService = {
  getQuestions: (params: {
    subject?: string; chapter?: string; year?: string | number;
    session?: string | number; difficulty?: string; limit?: number; mode?: string;
  }) => api.get('/api/questions', { params }).then(r => r.data),

  getWeakQuestions: (params: { subject?: string; limit?: number }) =>
    api.get('/api/questions/weak', { params }).then(r => r.data),
}

// ==================== Exam Services ====================
export const examService = {
  startSession: (data: {
    subject_slug: string; chapter_slug?: string; mode?: string;
    question_count?: number; difficulty?: string; year_filter?: string; session_filter?: number;
  }) => api.post('/api/exams/start', data).then(r => r.data),

  submitAnswer: (sessionId: string, data: {
    question_id: string; answer_index?: number; essay_answer?: string;
    time_taken_seconds?: number; hint_used?: boolean;
  }) => api.post(`/api/exams/${sessionId}/answer`, data).then(r => r.data),

  completeSession: (sessionId: string, duration_seconds: number) =>
    api.post(`/api/exams/${sessionId}/complete`, { duration_seconds }).then(r => r.data),

  getHistory: (page = 1, limit = 10) =>
    api.get('/api/exams/history', { params: { page, limit } }).then(r => r.data),
}

// ==================== Tutor Services ====================
export const tutorService = {
  sendMessage: (data: { message: string; subject_slug?: string; conversation_id?: string }) =>
    api.post('/api/tutor/chat', data).then(r => r.data),

  getConversations: () => api.get('/api/tutor/conversations').then(r => r.data),

  getMessages: (id: string) => api.get(`/api/tutor/conversations/${id}`).then(r => r.data),

  deleteConversation: (id: string) =>
    api.delete(`/api/tutor/conversations/${id}`).then(r => r.data),
}

// ==================== PDF Services ====================
export const pdfService = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('pdf', file)
    return api.post('/api/pdf/upload', form, {
      headers:        { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        const pct = Math.round((e.loaded / (e.total || 1)) * 100)
        console.log(`رفع: ${pct}%`)
      },
    }).then(r => r.data)
  },

  getStatus: (id: string) => api.get(`/api/pdf/${id}`).then(r => r.data),
  getAll:    ()           => api.get('/api/pdf').then(r => r.data),
}

// ==================== Payment Services ====================
export const paymentService = {
  getPackages:    () => api.get('/api/payments/packages').then(r => r.data),
  initiate: (data: { package_id: string; payment_method: string }) =>
    api.post('/api/payments/initiate', data).then(r => r.data),
  verify: (transaction_id: string, payment_ref?: string) =>
    api.post('/api/payments/verify', { transaction_id, payment_ref }).then(r => r.data),
  getHistory: () => api.get('/api/payments/history').then(r => r.data),
}

// ==================== User Services ====================
export const userService = {
  getStats:    () => api.get('/api/users/me/stats').then(r => r.data),
  updateMe:    (data: Partial<{ full_name: string; theme: string; governorate: string }>) =>
    api.patch('/api/users/me', data).then(r => r.data),
  getNotifications: () => api.get('/api/users/me/notifications').then(r => r.data),
  markRead:    (id: string) => api.patch(`/api/users/me/notifications/${id}/read`).then(r => r.data),
}

// ==================== Leaderboard Services ====================
export const leaderboardService = {
  get: (filter = 'global', subject?: string, limit = 20) =>
    api.get('/api/leaderboard', { params: { filter, subject, limit } }).then(r => r.data),
}

// ==================== Helpers ====================
export const creditCost = (questionCount: number): number => {
  if (questionCount <= 5)  return 0
  if (questionCount <= 10) return 1
  if (questionCount <= 20) return 2
  if (questionCount <= 30) return 3
  return 5
}
