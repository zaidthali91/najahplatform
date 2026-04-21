'use client'
import { useEffect, useState } from 'react'
import { useThemeStore } from '@/store'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const { theme } = useThemeStore()

  useEffect(() => {
    setMounted(true)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  if (!mounted) return <>{children}</>

  return <>{children}</>
}