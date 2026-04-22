export const dynamic = 'force-dynamic'  
// frontend/src/app/auth/page.tsx
'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'
import { authService } from '@/lib/api'
import toast from 'react-hot-toast'

const GOVERNORATES = ['بغداد','كربلاء','النجف','البصرة','الموصل','أربيل','كركوك','الحلة','الديوانية','الناصرية','العمارة','الرمادي','السليمانية','دهوك']

export default function AuthPage() {
  const router       = useRouter()
  const { setUser, setToken } = useAuthStore()
  const [tab, setTab]         = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)

  // Login form state
  const [loginData, setLoginData] = useState({ email: '', password: '' })

  // Register form state
  const [regData, setRegData] = useState({
    email: '', password: '', full_name: '',
    governorate: 'بغداد', grade: '3mid' as '3mid' | '6prep',
  })

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!loginData.email || !loginData.password) return toast.error('أدخل البريد وكلمة المرور')
    setLoading(true)
    try {
      const { user, tokens } = await authService.login(loginData.email, loginData.password)
      setUser(user)
      setToken(tokens.access)
      toast.success(`مرحباً ${user.full_name}! 👋`)
      router.push('/')
    } catch { /* handled by interceptor */ }
    finally { setLoading(false) }
  }

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    if (!regData.email || !regData.password || !regData.full_name) return toast.error('أكمل جميع الحقول')
    if (regData.password.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    setLoading(true)
    try {
      const { user, tokens } = await authService.register(regData)
      setUser(user)
      setToken(tokens.access)
      toast.success('تم إنشاء حسابك! لديك 15 رصيد مجاني 🎁')
      router.push('/')
    } catch {}
    finally { setLoading(false) }
  }

  const inputStyle = {
    width:'100%', padding:'13px 16px',
    background:'var(--input-bg)', border:'1px solid var(--border2)',
    borderRadius:12, color:'var(--text)',
    fontFamily:'var(--font-cairo)', fontSize:'0.95rem',
    outline:'none', marginBottom:14, display:'block',
  }
  const labelStyle = {
    display:'block', fontSize:'0.82rem',
    color:'var(--text2)', marginBottom:7, fontWeight:600,
  }

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}>
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border2)',
        borderRadius:24, padding:40, width:'100%', maxWidth:440,
        boxShadow:'0 24px 80px rgba(0,0,0,0.5)',
        animation:'slideUp 0.4s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{
            width:72, height:72, borderRadius:20,
            background:'linear-gradient(135deg,var(--primary),var(--accent))',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'2rem', margin:'0 auto 14px',
            boxShadow:'0 8px 30px rgba(26,79,138,0.5)',
          }}>🎓</div>
          <h1 style={{
            fontFamily:'var(--font-tajawal)', fontSize:'1.8rem', fontWeight:900,
            background:'linear-gradient(135deg,var(--primary-l),var(--accent))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>منصة النجاح</h1>
          <p style={{ fontSize:'0.88rem', color:'var(--text2)', marginTop:4 }}>
            الاختبار الوطني العراقي — إنجليزي | عربي | حاسوب
          </p>
        </div>

        {/* Free trial badge */}
        <div style={{
          background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)',
          borderRadius:10, padding:'11px 14px', marginBottom:22,
          display:'flex', alignItems:'center', gap:10, fontSize:'0.85rem',
        }}>
          <span>🎁</span>
          <span><strong style={{color:'var(--success)'}}>تجربة مجانية:</strong> 15 رصيد + تحليل PDF واحد بدون بطاقة ائتمان</span>
        </div>

        {/* Tabs */}
        <div style={{
          display:'flex', background:'var(--bg3)',
          borderRadius:12, padding:4, marginBottom:28,
        }}>
          {(['login','register'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:'10px', border:'none', borderRadius:9,
              background: tab === t ? 'var(--primary)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text2)',
              fontFamily:'var(--font-cairo)', fontSize:'0.95rem', fontWeight:700,
              cursor:'pointer', transition:'all 0.2s',
              boxShadow: tab === t ? '0 4px 12px rgba(26,79,138,0.4)' : 'none',
            }}>
              {t === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </button>
          ))}
        </div>

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <label style={labelStyle}>البريد الإلكتروني</label>
            <input type="email" style={inputStyle} placeholder="example@gmail.com"
              value={loginData.email}
              onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))}
            />
            <label style={labelStyle}>كلمة المرور</label>
            <input type="password" style={inputStyle} placeholder="••••••••"
              value={loginData.password}
              onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))}
            />
            <button type="submit" className="btn btn-primary btn-full btn-lg"
              disabled={loading} style={{ marginBottom:14 }}>
              {loading ? <span className="spinner" /> : 'دخول إلى المنصة ←'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:0 }}>
              <div>
                <label style={labelStyle}>الاسم الكامل</label>
                <input type="text" style={{...inputStyle}} placeholder="محمد علي"
                  value={regData.full_name}
                  onChange={e => setRegData(p => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>المحافظة</label>
                <select style={{...inputStyle, appearance:'none'}}
                  value={regData.governorate}
                  onChange={e => setRegData(p => ({ ...p, governorate: e.target.value }))}>
                  {GOVERNORATES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <label style={labelStyle}>البريد الإلكتروني</label>
            <input type="email" style={inputStyle} placeholder="example@gmail.com"
              value={regData.email}
              onChange={e => setRegData(p => ({ ...p, email: e.target.value }))}
            />
            <label style={labelStyle}>كلمة المرور</label>
            <input type="password" style={inputStyle} placeholder="8 أحرف على الأقل"
              value={regData.password}
              onChange={e => setRegData(p => ({ ...p, password: e.target.value }))}
            />
            <label style={labelStyle}>المرحلة الدراسية</label>
            <select style={{...inputStyle, appearance:'none'}}
              value={regData.grade}
              onChange={e => setRegData(p => ({ ...p, grade: e.target.value as any }))}>
              <option value="3mid">الثالث المتوسط (الاختبار الوطني)</option>
              <option value="6prep">السادس الإعدادي (الاختبار الوطني)</option>
            </select>
            <button type="submit" className="btn btn-accent btn-full btn-lg"
              disabled={loading} style={{ marginBottom:14 }}>
              {loading ? <span className="spinner" /> : 'إنشاء الحساب مجاناً 🎁'}
            </button>
            <p style={{ fontSize:'0.75rem', color:'var(--text3)', textAlign:'center' }}>
              بالتسجيل توافق على شروط الخدمة وسياسة الخصوصية
            </p>
          </form>
        )}

        {/* Divider */}
        <div style={{
          textAlign:'center', color:'var(--text3)', fontSize:'0.82rem',
          margin:'18px 0', position:'relative',
        }}>
          <span style={{ background:'var(--surface)', padding:'0 12px', position:'relative', zIndex:1 }}>أو</span>
          <div style={{ position:'absolute', top:'50%', insetInline:0, height:1, background:'var(--border)' }} />
        </div>

        {/* Google button */}
        <button style={{
          width:'100%', padding:13, border:'1px solid var(--border2)',
          borderRadius:12, background:'var(--surface2)', color:'var(--text)',
          fontFamily:'var(--font-cairo)', fontSize:'0.95rem', fontWeight:600,
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          transition:'var(--transition)',
        }} onClick={() => toast('الدخول عبر Google سيُفعَّل قريباً!', { icon: 'ℹ️' })}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {tab === 'login' ? 'الدخول بحساب Google' : 'التسجيل بحساب Google'}
        </button>
      </div>
    </div>
  )
}
