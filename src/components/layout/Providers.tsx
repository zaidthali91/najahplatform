// frontend/src/components/layout/Providers.tsx
'use client'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useThemeStore } from '@/store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  5 * 60 * 1000,
      cacheTime:  10 * 60 * 1000,
      retry:      1,
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

// ============================================================
// frontend/src/hooks/useAuth.ts
// ============================================================
/*
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'
import { authService } from '@/lib/api'

export function useAuth(required = false) {
  const { user, token, setUser, setLoading, logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      if (required) router.push('/auth')
      return
    }
    // Verify token and refresh user data
    authService.me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        logout()
        if (required) router.push('/auth')
      })
  }, [token])

  return { user, isAuthenticated: !!user }
}
*/

// ============================================================
// Dockerfile — Backend
// ============================================================
/*
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/

FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY package.json ./

RUN mkdir -p logs && chown -R appuser:appgroup /app
USER appuser

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
*/

// ============================================================
// .github/workflows/deploy.yml — CI/CD
// ============================================================
/*
name: Deploy منصة النجاح

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd backend && npm ci
      - run: cd backend && npm test

  deploy-backend:
    needs: test-backend
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: najah-backend

  deploy-frontend:
    needs: test-backend
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci && npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token:    ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id:   ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
*/
