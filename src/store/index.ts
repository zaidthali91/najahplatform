'use client'
import { create } from 'zustand'

export interface User {
  id: string; email: string; full_name: string
  role: 'student' | 'admin' | 'teacher'
  credits: number; xp_points: number; level: number
  streak_days: number; governorate: string; grade: string
  theme: 'dark' | 'light'; avatar_url?: string
}

interface AuthStore {
  user: User | null; token: string | null; isLoading: boolean
  setUser: (u: User | null) => void
  setToken: (t: string | null) => void
  setLoading: (v: boolean) => void
  updateCredits: (d: number) => void
  updateXP: (d: number) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null, token: null, isLoading: false,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (v) => set({ isLoading: v }),
  updateCredits: (d) => set(s => ({ user: s.user ? { ...s.user, credits: Math.max(0, s.user.credits + d) } : null })),
  updateXP: (d) => set(s => ({ user: s.user ? { ...s.user, xp_points: s.user.xp_points + d } : null })),
  logout: () => set({ user: null, token: null }),
}))

interface ThemeStore {
  theme: 'dark' | 'light'
  toggleTheme: () => void
  setTheme: (t: 'dark' | 'light') => void
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  theme: 'dark',
  toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setTheme: (theme) => set({ theme }),
}))

interface ExamStore {
  session: any; hintUsed: boolean; answered: boolean; timeElapsed: number
  startSession: (d: any) => void
  recordAnswer: (id: string, ans: any, correct: boolean, time: number) => void
  nextQuestion: () => void
  useHint: () => void
  skipQuestion: () => void
  completeSession: () => void
  resetSession: () => void
  tickTimer: () => void
}

export const useExamStore = create<ExamStore>()((set, get) => ({
  session: null, hintUsed: false, answered: false, timeElapsed: 0,
  startSession: (data) => set({ session: { ...data, currentIndex: 0, score: 0, answers: {}, startTime: Date.now(), isComplete: false }, hintUsed: false, answered: false, timeElapsed: 0 }),
  recordAnswer: (id, ans, correct, time) => set(s => s.session ? { answered: true, session: { ...s.session, score: s.session.score + (correct ? 10 : 0), answers: { ...s.session.answers, [id]: { answer: ans, correct, timeTaken: time } } } } : s),
  nextQuestion: () => set(s => s.session ? { hintUsed: false, answered: false, session: { ...s.session, currentIndex: s.session.currentIndex + 1 } } : s),
  useHint: () => set(s => ({ hintUsed: true, session: s.session ? { ...s.session, score: Math.max(0, s.session.score - 2) } : null })),
  skipQuestion: () => { const { session } = get(); if (session) { const q = session.questions[session.currentIndex]; if (q) get().recordAnswer(q.id, -1, false, 0); get().nextQuestion() } },
  completeSession: () => set(s => ({ session: s.session ? { ...s.session, isComplete: true } : null })),
  resetSession: () => set({ session: null, hintUsed: false, answered: false, timeElapsed: 0 }),
  tickTimer: () => set(s => ({ timeElapsed: s.timeElapsed + 1 })),
}))

export const useNotiStore = create<{ unreadCount: number; setUnread: (n: number) => void; decrement: () => void }>()((set) => ({
  unreadCount: 0,
  setUnread: (n) => set({ unreadCount: n }),
  decrement: () => set(s => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
}))