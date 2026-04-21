import type { Metadata } from 'next'
import { Cairo, Tajawal } from 'next/font/google'
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
  title: 'منصة النجاح - الاختبار الوطني العراقي',
  description: 'منصة ذكية للاختبار الوطني العراقي',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} ${tajawal.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}