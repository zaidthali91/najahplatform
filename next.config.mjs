// frontend/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol:'https', hostname:'*.supabase.co' },
      { protocol:'https', hostname:'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options',        value: 'DENY'    },
        { key: 'X-XSS-Protection',       value: '1; mode=block' },
        { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
      ],
    }]
  },
  async redirects() {
    return [
      { source:'/home', destination:'/', permanent:true },
    ]
  },
}
export default nextConfig

// ============================================================
// frontend/tailwind.config.ts
// ============================================================
/*
import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: ['class','[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        cairo:   ['var(--font-cairo)',   'sans-serif'],
        tajawal: ['var(--font-tajawal)', 'sans-serif'],
      },
      colors: {
        primary:  'var(--primary)',
        accent:   'var(--accent)',
        success:  'var(--success)',
        surface:  'var(--surface)',
        bg:       'var(--bg)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm:      'var(--radius-sm)',
        lg:      'var(--radius-lg)',
      },
    },
  },
  plugins: [],
}
export default config
*/

// ============================================================
// frontend/tsconfig.json
// ============================================================
/*
{
  "compilerOptions": {
    "target":           "ES2017",
    "lib":              ["dom","dom.iterable","esnext"],
    "allowJs":          true,
    "skipLibCheck":     true,
    "strict":           true,
    "noEmit":           true,
    "esModuleInterop":  true,
    "module":           "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule":true,
    "isolatedModules":  true,
    "jsx":              "preserve",
    "incremental":      true,
    "plugins":          [{ "name": "next" }],
    "paths":            { "@/*": ["./src/*"] }
  },
  "include":  ["next-env.d.ts","**/*.ts","**/*.tsx",".next/types/**/*.ts"],
  "exclude":  ["node_modules"]
}
*/
