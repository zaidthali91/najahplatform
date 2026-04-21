// frontend/src/app/layout.tsx
import type { Metadata } from 'next'
import { Cairo, Tajawal } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/layout/Providers'
import './globals.css'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  weight: ['300','400','600','700','900'],
  display: 'swap',
})

const tajawal = Tajawal({
  subsets: ['arabic'],
  variable: '--font-tajawal',
  weight: ['300','400','500','700','800','900'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'منصة النجاح — الاختبار الوطني العراقي',
  description: 'منصة ذكية لتحضير طلاب الاختبار الوطني العراقي في اللغة الإنجليزية والعربية والحاسوب',
  keywords: ['اختبار وطني', 'منهج عراقي', 'امتحانات', 'انكليزي', 'عربي', 'حاسوب'],
  authors: [{ name: 'منصة النجاح' }],
  metadataBase: new URL('https://najah-platform.iq'),
  openGraph: {
    title: 'منصة النجاح',
    description: 'حضّر للاختبار الوطني العراقي بالذكاء الاصطناعي',
    locale: 'ar_IQ',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} ${tajawal.variable} font-cairo`}>
        <Providers>
          {children}
          <Toaster
            position="bottom-left"
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: 'var(--font-cairo)',
                direction: 'rtl',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
