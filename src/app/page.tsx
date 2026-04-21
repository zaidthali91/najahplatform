export const dynamic = 'force-dynamic'
'use client'
// frontend/src/app/page.tsx
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store'

const STATS = [
  { id:'q', target:13600, label:'سؤال وزاري',       suffix:'+' },
  { id:'s', target:52000, label:'طالب نشط',          suffix:'+' },
  { id:'y', target:38,    label:'سنة وزارية',        suffix:'' },
  { id:'a', target:94,    label:'نسبة نجاح طلابنا', suffix:'%' },
]

const FEATURES = [
  { icon:'🎯', title:'أسئلة وزارية حقيقية',      desc:'من 1985 حتى 2025 مصنّفة بدقة حسب المنهج العراقي مع شرح تفصيلي لكل سؤال' },
  { icon:'📄', title:'تحليل PDF بالذكاء الاصطناعي', desc:'ارفع كتابك أو ملزمتك وسيولّد الذكاء الاصطناعي أسئلة وملخصاً منها فوراً' },
  { icon:'🤖', title:'معلم ذكي 24/7',             desc:'اسأل بالعربي أو الإنجليزي واحصل على شرح فوري مخصص للاختبار الوطني العراقي' },
  { icon:'💳', title:'ادفع حسب الاستخدام',        desc:'لا اشتراك إجباري — اشحن رصيداً واستخدمه متى تريد. أول 15 رصيد مجاناً!' },
  { icon:'🏆', title:'قائمة المتصدرين',            desc:'تنافس مع طلاب من جميع المحافظات العراقية وتصدّر القائمة الوطنية' },
  { icon:'📊', title:'تحليل أداء متقدم',          desc:'تقارير مفصلة لكل باب تُظهر نقاط قوتك وضعفك مع خطة تحسين مخصصة' },
  { icon:'🔁', title:'مراجعة ذكية',               desc:'تقنية Spaced Repetition تُعيد لك الأسئلة التي أخطأت فيها في الوقت الأمثل' },
  { icon:'📅', title:'خطة دراسية ذكية',           desc:'جدول دراسي أسبوعي مخصص يُبنى تلقائياً بناءً على موعد امتحانك ومستواك' },
]

function useCounter(id: string, target: number, suffix: string) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const dur = 1800
    const step = target / (dur / 16)
    let cur = 0
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target)
      el.textContent = Math.floor(cur).toLocaleString('ar-EG') + suffix
      if (cur >= target) clearInterval(iv)
    }, 16)
    return () => clearInterval(iv)
  }, [target, suffix])
  return ref
}

function AnimatedCounter({ id, target, suffix, label }: typeof STATS[0]) {
  const ref = useCounter(id, target, suffix)
  return (
    <div className="card card-hover" style={{ textAlign:'center' }}>
      <div ref={ref} style={{
        fontFamily:'var(--font-tajawal)', fontSize:'2rem', fontWeight:900, color:'var(--accent)',
      }}>0</div>
      <div style={{ fontSize:'0.82rem', color:'var(--text2)', marginTop:4 }}>{label}</div>
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuthStore()

  return (
    <main>
      {/* ── HERO ── */}
      <section style={{ textAlign:'center', padding:'60px 20px 44px', position:'relative' }}>
        {/* Ambient glow */}
        <div style={{
          position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
          width:700, height:350, pointerEvents:'none',
          background:'radial-gradient(ellipse,rgba(26,79,138,0.15) 0%,transparent 70%)',
        }} />

        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.3)',
          borderRadius:30, padding:'7px 18px', marginBottom:22,
          fontSize:'0.82rem', color:'var(--accent)', fontWeight:700, position:'relative',
        }}>
          🇮🇶 مخصصة للمناهج العراقية — الاختبار الوطني
        </div>

        <h1 style={{
          fontFamily:'var(--font-tajawal)',
          fontSize:'clamp(2rem,5vw,3.2rem)', fontWeight:900, lineHeight:1.2,
          marginBottom:16, position:'relative',
        }}>
          احصل على{' '}
          <span style={{
            background:'linear-gradient(135deg,var(--primary-l),var(--accent))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>أعلى الدرجات</span>
          <br />في الاختبار الوطني
        </h1>

        <p style={{
          fontSize:'1rem', color:'var(--text2)', maxWidth:560,
          margin:'0 auto 32px', lineHeight:1.8, position:'relative',
        }}>
          منصة ذكية مخصصة لطلاب الاختبار الوطني العراقي في{' '}
          <strong style={{ color:'#3b82f6' }}>اللغة الإنجليزية</strong> و
          <strong style={{ color:'#10b981' }}> العربية</strong> و
          <strong style={{ color:'#8b5cf6' }}> الحاسوب</strong> — بأسئلة وزارية وذكاء اصطناعي متقدم
        </p>

        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href={user ? '/exam' : '/auth'} className="btn btn-accent btn-lg">
            🎯 ابدأ الامتحان الآن
          </Link>
          <Link href="/tutor" className="btn btn-primary btn-lg">
            🤖 المعلم الذكي
          </Link>
          <Link href="/pdf" className="btn btn-outline btn-lg">
            📄 تحليل PDF مجاناً
          </Link>
        </div>

        {/* Social proof */}
        <div style={{ marginTop:28, display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:'0.82rem', color:'var(--text3)' }}>
          <div style={{ display:'flex' }}>
            {['أ','م','ع','ف','ز'].map((l,i) => (
              <div key={i} style={{
                width:28, height:28, borderRadius:'50%', border:'2px solid var(--bg)',
                background:`hsl(${200+i*30},60%,50%)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.72rem', fontWeight:700, color:'#fff',
                marginLeft: i>0 ? -8 : 0,
              }}>{l}</div>
            ))}
          </div>
          <span>+52,000 طالب يثقون بالمنصة</span>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding:'0 20px 40px', maxWidth:900, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:14 }}>
          {STATS.map(s => <AnimatedCounter key={s.id} {...s} />)}
        </div>
      </section>

      {/* ── NATIONAL SUBJECTS ── */}
      <section style={{ padding:'0 20px 48px', maxWidth:1100, margin:'0 auto' }}>
        <h2 className="section-title">📚 مواد الاختبار الوطني</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:18 }}>
          {[
            {
              slug:'english', icon:'🔤', label:'اللغة الإنجليزية',
              sub:'المنهج الوزاري العراقي', color:'#3b82f6',
              q:'4,800', years:38, prog:72,
              tags:['Grammar','Reading','Vocabulary'],
            },
            {
              slug:'arabic', icon:'📖', label:'اللغة العربية',
              sub:'المنهج الوزاري العراقي', color:'#10b981',
              q:'5,200', years:38, prog:58,
              tags:['النحو','البلاغة','الأدب'],
            },
            {
              slug:'computer', icon:'💻', label:'الحاسوب',
              sub:'المنهج الوزاري العراقي', color:'#8b5cf6',
              q:'3,600', years:20, prog:45,
              tags:['Word','Excel','الإنترنت'],
            },
          ].map(s => (
            <Link key={s.slug} href={`/exam?subject=${s.slug}`} style={{ textDecoration:'none' }}>
              <div className="card card-hover" style={{ borderTop:`3px solid ${s.color}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                  <div style={{
                    width:52, height:52, borderRadius:14,
                    background:`${s.color}18`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', flexShrink:0,
                  }}>{s.icon}</div>
                  <div>
                    <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'1.1rem', fontWeight:800 }}>{s.label}</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text2)', marginTop:2 }}>{s.sub}</div>
                  </div>
                </div>

                <div style={{ display:'flex', gap:18, marginBottom:12 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'1.1rem', fontWeight:800, color:'var(--accent)' }}>{s.q}</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text3)' }}>سؤال</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'1.1rem', fontWeight:800, color:'var(--accent)' }}>{s.years}</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text3)' }}>سنة وزارية</div>
                  </div>
                  <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
                    {s.tags.map(t => (
                      <span key={t} style={{
                        background:`${s.color}18`, color:s.color,
                        fontSize:'0.68rem', fontWeight:700,
                        padding:'2px 8px', borderRadius:10,
                      }}>{t}</span>
                    ))}
                  </div>
                </div>

                <div className="progress-bar">
                  <div style={{ height:'100%', width:`${s.prog}%`, background:s.color, borderRadius:3, transition:'width 1.2s ease' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', color:'var(--text3)', marginTop:5 }}>
                  <span>{s.prog}% تقدمك</span>
                  <span style={{ color:s.color, fontWeight:600 }}>ابدأ الآن ←</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding:'0 20px 60px', maxWidth:1100, margin:'0 auto' }}>
        <h2 className="section-title">✨ لماذا منصة النجاح؟</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card card-hover">
              <div style={{ fontSize:'1.8rem', marginBottom:10 }}>{f.icon}</div>
              <div style={{ fontWeight:700, fontSize:'0.95rem', marginBottom:6 }}>{f.title}</div>
              <div style={{ fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding:'0 20px 60px', maxWidth:800, margin:'0 auto' }}>
        <div style={{
          background:'linear-gradient(135deg,var(--primary-d),var(--primary))',
          borderRadius:24, padding:'40px 32px', textAlign:'center',
          boxShadow:'0 12px 40px rgba(26,79,138,0.4)',
        }}>
          <div style={{ fontSize:'2rem', marginBottom:12 }}>🎓</div>
          <h2 style={{ fontFamily:'var(--font-tajawal)', fontSize:'1.8rem', color:'#fff', marginBottom:10 }}>
            ابدأ رحلتك نحو النجاح اليوم
          </h2>
          <p style={{ color:'rgba(255,255,255,0.8)', marginBottom:24, lineHeight:1.7 }}>
            سجّل حساباً مجانياً واحصل على 15 رصيد لتبدأ التدريب فوراً — بدون بطاقة ائتمان
          </p>
          <Link href="/auth" className="btn btn-accent btn-lg">
            🚀 سجّل مجاناً الآن
          </Link>
        </div>
      </section>
    </main>
  )
}
