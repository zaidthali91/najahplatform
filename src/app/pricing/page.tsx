export const dynamic = 'force-dynamic'  
// frontend/src/app/pricing/page.tsx
'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store'
import { paymentService } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

const PACKAGES = [
  {
    id:'starter', icon:'⚡', name:'باقة 50 رصيد', credits:50, price:2500,
    desc:'مناسبة للمراجعة الأسبوعية',
    features:['50 رصيد','صالح 3 أشهر','25 تحليل PDF','50 محادثة مع المعلم'],
    popular: false, colorClass:'btn-primary',
  },
  {
    id:'standard', icon:'🚀', name:'باقة 150 رصيد', credits:150, price:5000,
    desc:'للمراجعة المكثفة قبل الامتحان',
    features:['150 رصيد','صالح 6 أشهر','PDF غير محدود','محادثات غير محدودة','خطة دراسية مخصصة'],
    popular: true, colorClass:'btn-accent',
  },
  {
    id:'premium', icon:'💎', name:'باقة 400 رصيد', credits:400, price:10000,
    desc:'للطالب الجاد — يغطي الفصل كاملاً',
    features:['400 رصيد','صالح سنة كاملة','جميع الميزات','شارة "طالب مميز" 🌟','دعم أولوية'],
    popular: false, colorClass:'btn-success',
  },
]

const PAYMENT_METHODS = [
  { id:'zaincash',    label:'ZainCash',   icon:'📱' },
  { id:'fib',         label:'FIB Bank',   icon:'💰' },
  { id:'visa',        label:'Visa/Master', icon:'💳' },
  { id:'asia_hawala', label:'أسيا حوالة', icon:'🏦' },
]

const USAGE_ITEMS = [
  { label:'5 أسئلة (تجريبي)', cost:'مجاني', icon:'🎁' },
  { label:'امتحان 10 أسئلة',  cost:'1 رصيد', icon:'📝' },
  { label:'امتحان 50 سؤال',   cost:'5 رصيد', icon:'📋' },
  { label:'رسالة للمعلم الذكي', cost:'1 رصيد', icon:'🤖' },
  { label:'تحليل PDF',         cost:'2 رصيد', icon:'📄' },
]

export default function PricingPage() {
  const { user, updateCredits } = useAuthStore()
  const [selectedPkg,    setSelectedPkg]    = useState<string|null>(null)
  const [selectedMethod, setSelectedMethod] = useState('zaincash')
  const [modalOpen,      setModalOpen]      = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [history,        setHistory]        = useState<any[]>([])
  const [showHistory,    setShowHistory]    = useState(false)

  const openModal = (pkgId: string) => { setSelectedPkg(pkgId); setModalOpen(true) }

  const handlePurchase = async () => {
    if (!selectedPkg) return
    setLoading(true)
    try {
      const res = await paymentService.initiate({ package_id: selectedPkg, payment_method: selectedMethod })
      // في الإنتاج: افتح رابط الدفع
      // window.open(res.payment_url, '_blank')
      toast.success(`سيتم تحويلك لبوابة ${selectedMethod} للدفع`)
      setModalOpen(false)

      // محاكاة التحقق من الدفع (في الإنتاج يكون عبر webhook)
      setTimeout(async () => {
        try {
          const verify = await paymentService.verify(res.transaction_id)
          updateCredits(verify.new_credits - (user?.credits ?? 0))
          toast.success(`تم إضافة ${PACKAGES.find(p=>p.id===selectedPkg)?.credits} رصيد! 🎉`, { duration: 5000 })
        } catch {}
      }, 2000)
    } catch { toast.error('فشل بدء عملية الدفع') }
    finally { setLoading(false) }
  }

  const loadHistory = async () => {
    setHistoryLoading(true); setShowHistory(true)
    try { const { transactions } = await paymentService.getHistory(); setHistory(transactions) }
    catch { setHistory([]) }
    finally { setHistoryLoading(false) }
  }

  const selectedPackage = PACKAGES.find(p => p.id === selectedPkg)

  return (
    <div className="page-container">
      <h1 className="section-title">💳 الاشتراك والرصيد</h1>

      {/* Current credits */}
      <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14, marginBottom:28 }}>
        <div>
          <div style={{ fontSize:'0.82rem', color:'var(--text2)', marginBottom:4 }}>رصيدك الحالي</div>
          <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'3rem', fontWeight:900, color:'var(--accent)', lineHeight:1 }}>
            {user?.credits ?? 0}
          </div>
          <div style={{ fontSize:'0.82rem', color:'var(--text3)', marginTop:4 }}>رصيد متبقٍ</div>
        </div>
        <div>
          <div style={{ fontSize:'0.82rem', color:'var(--text2)', marginBottom:10, fontWeight:600 }}>تكلفة كل خدمة</div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {USAGE_ITEMS.map(item => (
              <div key={item.label} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'9px 14px', background:'var(--bg3)', borderRadius:10, gap:24, fontSize:'0.85rem',
              }}>
                <span>{item.icon} {item.label}</span>
                <span style={{ fontWeight:700, color:'var(--accent)', fontFamily:'var(--font-tajawal)' }}>{item.cost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Free trial notice */}
      {(user?.credits ?? 0) <= 5 && (
        <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:12, padding:'12px 16px', marginBottom:22, fontSize:'0.88rem', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:'1.4rem' }}>⚠️</span>
          <span>رصيدك يقترب من النفاد. اشحن الآن لمواصلة التدريب!</span>
        </div>
      )}

      {/* Packages */}
      <h2 className="section-title">اختر باقة الرصيد</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16, marginBottom:28 }}>
        {PACKAGES.map(pkg => (
          <div key={pkg.id} className="card" style={{
            textAlign:'center', position:'relative',
            border: pkg.popular ? '2px solid var(--accent)' : '1px solid var(--border)',
            transition:'transform 0.2s, box-shadow 0.2s',
          }} onMouseEnter={e => (e.currentTarget.style.transform='translateY(-4px)')}
             onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}>
            {pkg.popular && (
              <div style={{
                position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)',
                background:'var(--accent)', color:'#fff', fontSize:'0.75rem', fontWeight:700,
                padding:'4px 14px', borderRadius:20, whiteSpace:'nowrap',
              }}>⭐ الأكثر شيوعاً</div>
            )}
            <div style={{ fontSize:'2.4rem', marginBottom:12 }}>{pkg.icon}</div>
            <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'1.2rem', fontWeight:800, marginBottom:6 }}>{pkg.name}</div>
            <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'2.2rem', fontWeight:900, color:'var(--accent)' }}>
              {pkg.price.toLocaleString()}<span style={{ fontSize:'0.9rem', color:'var(--text2)', fontWeight:400 }}> دينار</span>
            </div>
            <div style={{ fontSize:'0.82rem', color:'var(--text2)', margin:'10px 0 16px', lineHeight:1.6 }}>{pkg.desc}</div>
            <div style={{ textAlign:'right', marginBottom:20, display:'flex', flexDirection:'column', gap:7 }}>
              {pkg.features.map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.82rem', color:'var(--text2)' }}>
                  <span style={{ color:'var(--success)' }}>✓</span>{f}
                </div>
              ))}
            </div>
            <button className={`btn ${pkg.colorClass} btn-full`} onClick={() => openModal(pkg.id)}>
              شراء الباقة
            </button>
          </div>
        ))}
      </div>

      {/* Payment methods */}
      <div className="card" style={{ marginBottom:22 }}>
        <h3 style={{ marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>💳 طرق الدفع المتاحة في العراق</h3>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {PAYMENT_METHODS.map(m => (
            <div key={m.id} style={{
              background:'var(--bg3)', border:'1px solid var(--border2)',
              borderRadius:10, padding:'12px 18px',
              display:'flex', alignItems:'center', gap:8, fontSize:'0.88rem',
            }}>
              <span style={{ fontSize:'1.4rem' }}>{m.icon}</span>{m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <h3>📋 سجل المعاملات</h3>
          {!showHistory && <button className="btn btn-outline btn-sm" onClick={loadHistory}>عرض السجل</button>}
        </div>
        {showHistory && (
          historyLoading ? <div className="skeleton" style={{ height:80, borderRadius:10 }} /> :
          history.length === 0 ? <div style={{ textAlign:'center', color:'var(--text2)', padding:20 }}>لا توجد معاملات بعد</div> :
          history.map(t => (
            <div key={t.id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'11px 14px', background:'var(--bg3)', borderRadius:10, marginBottom:8, fontSize:'0.85rem',
            }}>
              <div>
                <div style={{ fontWeight:600 }}>{t.description}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text3)' }}>{new Date(t.created_at).toLocaleDateString('ar-IQ')}</div>
              </div>
              <div style={{
                fontWeight:700, fontFamily:'var(--font-tajawal)', fontSize:'1rem',
                color: t.amount > 0 ? 'var(--success)' : 'var(--accent2)',
              }}>
                {t.amount > 0 ? '+' : ''}{t.amount} رصيد
              </div>
            </div>
          ))
        )}
      </div>

      {/* Purchase modal */}
      {modalOpen && selectedPackage && (
        <div style={{
          position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:20,
        }} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="card animate-slide-up" style={{ maxWidth:480, width:'100%', borderRadius:24, padding:32 }}>
            <h2 style={{ marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
              💳 إتمام عملية الشراء
            </h2>
            <div style={{ background:'var(--bg3)', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:'0.9rem' }}>
                <span style={{ color:'var(--text2)' }}>الباقة</span>
                <span style={{ fontWeight:700 }}>{selectedPackage.credits} رصيد</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.9rem' }}>
                <span style={{ color:'var(--text2)' }}>المبلغ</span>
                <span style={{ fontWeight:700, color:'var(--accent)' }}>{selectedPackage.price.toLocaleString()} دينار عراقي</span>
              </div>
            </div>

            <label style={{ display:'block', fontSize:'0.82rem', color:'var(--text2)', marginBottom:8, fontWeight:600 }}>طريقة الدفع</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} onClick={() => setSelectedMethod(m.id)} style={{
                  padding:'12px', borderRadius:10,
                  border: `2px solid ${selectedMethod===m.id ? 'var(--primary-l)' : 'var(--border2)'}`,
                  background: selectedMethod===m.id ? 'rgba(37,99,176,0.1)' : 'var(--bg3)',
                  cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:'0.88rem',
                  color:'var(--text)', fontFamily:'var(--font-cairo)',
                }}>
                  <span>{m.icon}</span>{m.label}
                </button>
              ))}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-outline" style={{ flex:1 }} onClick={() => setModalOpen(false)}>إلغاء</button>
              <button className="btn btn-accent" style={{ flex:2 }} onClick={handlePurchase} disabled={loading}>
                {loading ? <span className="spinner" /> : `تأكيد الدفع ✓`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
