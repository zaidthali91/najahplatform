'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

const Navbar = dynamic(() => import('./Navbar'), { ssr: false })
const Toaster = dynamic(
  () => import('react-hot-toast').then(m => ({ default: m.Toaster })),
  { ssr: false }
)

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {mounted && <Navbar />}
      <main>{children}</main>
      {mounted && (
        <Toaster
          position="bottom-left"
          toastOptions={{ style: { fontFamily: 'var(--font-cairo)', direction: 'rtl' } }}
        />
      )}
    </>
  )
}