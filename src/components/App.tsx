'use client'
import { Toaster } from 'react-hot-toast'
import Navbar from './layout/Navbar'
import { useThemeStore } from '@/store'
import { useEffect } from 'react'
import Link from 'next/link'

export default function App() {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <>
      <Navbar />
      <main style={{ padding: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, marginBottom: 20 }}>🎓 منصة النجاح</h1>
        <p style={{ marginBottom: 30, color: 'var(--text2)' }}>الاختبار الوطني العراقي</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth" style={{ padding: '12px 24px', background: 'var(--primary)', color: '#fff', borderRadius: 12, textDecoration: 'none' }}>دخول / تسجيل</Link>
          <Link href="/exam" style={{ padding: '12px 24px', background: 'var(--accent)', color: '#fff', borderRadius: 12, textDecoration: 'none' }}>ابدأ الامتحان</Link>
          <Link href="/tutor" style={{ padding: '12px 24px', background: 'var(--success)', color: '#fff', borderRadius: 12, textDecoration: 'none' }}>المعلم الذكي</Link>
        </div>
      </main>
      <Toaster position="bottom-left" />
    </>
  )
}