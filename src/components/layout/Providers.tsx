'use client'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useThemeStore } from '@/store'
import Navbar from './Navbar'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const { theme } = useThemeStore()

  useEffect(() => {
    setMounted(true)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  if (!mounted) return null

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Toaster position="bottom-left" toastOptions={{ style: { fontFamily: 'var(--font-cairo)', direction: 'rtl' } }} />
    </>
  )
}