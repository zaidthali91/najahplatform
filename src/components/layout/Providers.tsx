$content = @"
'use client'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useThemeStore } from '@/store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
"@
[System.IO.File]::WriteAllText("$PWD\src\components\layout\Providers.tsx", $content, [System.Text.UTF8Encoding]::new($false))