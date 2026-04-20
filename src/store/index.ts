// frontend/src/store/index.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ==================== Types ====================
export interface User {
  id:          string
  email:       string
  full_name:   string
  role:        'student' | 'admin' | 'teacher'
  credits:     number
  xp_points:   number
  level:       number
  streak_days: number
  governorate: string
  grade:       '3mid' | '6prep'
  theme:       'dark' | 'light'
  avatar_url?: string
}

export interface Question {
  id:            string
  question_text: string
  question_type: 'mcq' | 'essay' | 'true_false'
  options?:      Array<{ label: string; text: string }>
  correct_answer?: number
  hint?:         string
  explanation?:  string
  difficulty:    'easy' | 'medium' | 'hard'
  year?:         number
  session?:      number
  chapter?:      { id: number; name_ar: string; slug: string }
  subject?:      { id: number; slug: string; name_ar: string; icon: string }
}

export interface ExamSession {
  session_id:    string
  questions:     Question[]
  currentIndex:  number
  score:         number
  answers:       Record<string, { answer: number | string; correct: boolean; timeTaken: number }>
  startTime:     number
  mode:          string
  subject_slug:  string
  credits_used:  number
  isComplete:    boolean
}

// ==================== Auth Store ====================
interface AuthStore {
  user:         User | null
  token:        string | null
  isLoading:    boolean
  setUser:      (user: User | null) => void
  setToken:     (token: string | null) => void
  setLoading:   (v: boolean) => void
  updateCredits:(delta: number) => void
  updateXP:     (delta: number) => void
  logout:       () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user:      null,
      token:     null,
      isLoading: false,

      setUser:    (user)  => set({ user }),
      setToken:   (token) => set({ token }),
      setLoading: (v)     => set({ isLoading: v }),

      updateCredits: (delta) => set(state => ({
        user: state.user ? { ...state.user, credits: Math.max(0, state.user.credits + delta) } : null
      })),

      updateXP: (delta) => set(state => ({
        user: state.user ? { ...state.user, xp_points: state.user.xp_points + delta } : null
      })),

      logout: () => set({ user: null, token: null }),
    }),
    {
      name:    'najah-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)

// ==================== Theme Store ====================
interface ThemeStore {
  theme:       'dark' | 'light'
  toggleTheme: () => void
  setTheme:    (t: 'dark' | 'light') => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set(state => {
        const next = state.theme === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', next)
        return { theme: next }
      }),
      setTheme: (t) => {
        document.documentElement.setAttribute('data-theme', t)
        set({ theme: t })
      },
    }),
    { name: 'najah-theme' }
  )
)

// ==================== Exam Store ====================
interface ExamStore {
  session:      ExamSession | null
  hintUsed:     boolean
  answered:     boolean
  timeElapsed:  number

  startSession: (data: Omit<ExamSession, 'currentIndex' | 'score' | 'answers' | 'startTime' | 'isComplete'>) => void
  recordAnswer: (questionId: string, answer: number | string, correct: boolean, timeTaken: number) => void
  nextQuestion: () => void
  useHint:      () => void
  skipQuestion: () => void
  completeSession: () => void
  resetSession: () => void
  tickTimer:    () => void
}

export const useExamStore = create<ExamStore>()((set, get) => ({
  session:     null,
  hintUsed:    false,
  answered:    false,
  timeElapsed: 0,

  startSession: (data) => set({
    session: {
      ...data,
      currentIndex: 0,
      score:        0,
      answers:      {},
      startTime:    Date.now(),
      isComplete:   false,
    },
    hintUsed:    false,
    answered:    false,
    timeElapsed: 0,
  }),

  recordAnswer: (questionId, answer, correct, timeTaken) => set(state => {
    if (!state.session) return state
    const pointsEarned = correct ? 10 : 0
    return {
      answered: true,
      session: {
        ...state.session,
        score:   state.session.score + pointsEarned,
        answers: { ...state.session.answers, [questionId]: { answer, correct, timeTaken } },
      },
    }
  }),

  nextQuestion: () => set(state => {
    if (!state.session) return state
    const nextIdx = state.session.currentIndex + 1
    return {
      hintUsed: false,
      answered: false,
      session:  { ...state.session, currentIndex: nextIdx },
    }
  }),

  useHint: () => set(state => ({
    hintUsed: true,
    session:  state.session
      ? { ...state.session, score: Math.max(0, state.session.score - 2) }
      : null,
  })),

  skipQuestion: () => {
    const { session } = get()
    if (!session) return
    const q = session.questions[session.currentIndex]
    if (q) get().recordAnswer(q.id, -1, false, 0)
    get().nextQuestion()
  },

  completeSession: () => set(state => ({
    session: state.session ? { ...state.session, isComplete: true } : null,
  })),

  resetSession: () => set({ session: null, hintUsed: false, answered: false, timeElapsed: 0 }),

  tickTimer: () => set(state => ({ timeElapsed: state.timeElapsed + 1 })),
}))

// ==================== Notifications Store ====================
interface NotiStore {
  unreadCount: number
  setUnread:   (n: number) => void
  decrement:   () => void
}

export const useNotiStore = create<NotiStore>()((set) => ({
  unreadCount: 0,
  setUnread:   (n) => set({ unreadCount: n }),
  decrement:   ()  => set(state => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
}))
