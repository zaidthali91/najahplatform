// frontend/src/components/layout/Navbar.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore, useThemeStore } from '@/store'
import { authService } from '@/lib/api'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { href: '/',             label: 'الرئيسية',    icon: '🏠' },
  { href: '/exam',         label: 'الامتحانات',  icon: '📝' },
  { href: '/pdf',          label: 'تحليل PDF',   icon: '📄' },
  { href: '/tutor',        label: 'المعلم الذكي', icon: '🤖' },
  { href: '/dashboard',    label: 'لوحتي',       icon: '📊' },
  { href: '/leaderboard',  label: 'المتصدرون',   icon: '🏆' },
  { href: '/pricing',      label: 'الاشتراك',    icon: '💳' },
]

export default function Navbar() {
  const { user, logout }  = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const pathname          = usePathname()
  const router            = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = async () => {
    try { await authService.logout() } catch {}
    logout()
    router.push('/auth')
    toast.success('تم تسجيل الخروج')
  }

  const avatarLetter = user?.full_name?.charAt(0)?.toUpperCase() || 'م'

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'var(--overlay)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none', flexShrink:0 }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:'linear-gradient(135deg,var(--primary),var(--accent))',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem'
          }}>🎓</div>
          <span style={{
            fontFamily:'var(--font-tajawal)', fontSize:'1.3rem', fontWeight:900,
            background:'linear-gradient(135deg,var(--primary-l),var(--accent))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>منصة النجاح</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hide-mobile" style={{
          display:'flex', gap:3, background:'var(--bg3)',
          borderRadius:12, padding:4, overflowX:'auto',
        }}>
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} style={{
              padding:'7px 14px', borderRadius:8, whiteSpace:'nowrap',
              background: pathname === link.href ? 'var(--primary)' : 'transparent',
              color: pathname === link.href ? '#fff' : 'var(--text2)',
              fontFamily:'var(--font-cairo)', fontSize:'0.85rem', fontWeight:600,
              textDecoration:'none', transition:'var(--transition)',
              display:'flex', alignItems:'center', gap:5,
            }}>
              <span>{link.icon}</span>{link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{
            width:36, height:36, borderRadius:10,
            background:'var(--bg3)', border:'1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', fontSize:'1.1rem', transition:'var(--transition)',
          }} title="تغيير المظهر">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          {/* Credits */}
          {user && (
            <Link href="/pricing" className="credits-pill">
              ⚡ {user.credits} رصيد
            </Link>
          )}

          {/* Avatar */}
          {user ? (
            <div style={{ position:'relative' }}>
              <button onClick={() => setProfileOpen(p => !p)} style={{
                width:38, height:38, borderRadius:'50%',
                background:'linear-gradient(135deg,var(--primary-l),var(--accent))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:'0.9rem', cursor:'pointer',
                border:'2px solid var(--accent)', color:'#fff',
                fontFamily:'var(--font-cairo)',
              }}>
                {avatarLetter}
              </button>
              {profileOpen && (
                <div style={{
                  position:'absolute', top:46, left:0, zIndex:300,
                  background:'var(--surface)', border:'1px solid var(--border2)',
                  borderRadius:16, padding:8, minWidth:200, boxShadow:'var(--shadow)',
                }}>
                  <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
                    <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{user.full_name}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text2)' }}>{user.email}</div>
                  </div>
                  {[
                    { label:'📊 لوحتي الشخصية', href:'/dashboard' },
                    { label:'💳 الرصيد والاشتراك', href:'/pricing' },
                  ].map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setProfileOpen(false)} style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'10px 14px', borderRadius:10, cursor:'pointer',
                      color:'var(--text2)', textDecoration:'none',
                      fontSize:'0.9rem', transition:'var(--transition)',
                    }}>{item.label}</Link>
                  ))}
                  <button onClick={handleLogout} style={{
                    display:'flex', alignItems:'center', gap:8, width:'100%',
                    padding:'10px 14px', borderRadius:10, cursor:'pointer',
                    color:'var(--accent2)', background:'none', border:'none',
                    fontFamily:'var(--font-cairo)', fontSize:'0.9rem',
                    marginTop:4, borderTop:'1px solid var(--border)',
                  }}>
                    🚪 تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="btn btn-primary btn-sm">دخول</Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="hide-desktop"
            onClick={() => setMenuOpen(p => !p)}
            style={{ background:'none', border:'none', color:'var(--text)', fontSize:'1.4rem', cursor:'pointer' }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position:'fixed', top:64, insetInline:0, zIndex:190,
          background:'var(--overlay)', backdropFilter:'blur(20px)',
          borderBottom:'1px solid var(--border)',
          padding:16, display:'flex', flexDirection:'column', gap:6,
        }}>
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding:'12px 16px', borderRadius:10,
                background: pathname === link.href ? 'var(--primary)' : 'var(--bg3)',
                color: pathname === link.href ? '#fff' : 'var(--text2)',
                textDecoration:'none', fontWeight:600, fontSize:'0.9rem',
                display:'flex', alignItems:'center', gap:8,
              }}>
              <span>{link.icon}</span>{link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
