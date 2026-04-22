export const dynamic = 'force-dynamic'  
// frontend/src/app/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store'
import { userService } from '@/lib/api'

interface Stats {
  total_sessions:     number
  total_answers:      number
  correct_answers:    number
  avg_score:          number
  total_study_minutes: number
  streak_days:        number
  xp_points:          number
  level:              number
  credits:            number
}

interface SubjectPerf {
  subject_name: string
  total_answers: number
  correct_count: number
  accuracy_pct:  number
}

const ACHIEVEMENTS_STATIC = [
  {icon:'⭐',name:'أول خطوة',   unlocked:true },
  {icon:'🔥',name:'7 أيام',    unlocked:true },
  {icon:'💯',name:'100 سؤال',  unlocked:true },
  {icon:'🎯',name:'صواب كامل', unlocked:true },
  {icon:'🚀',name:'سرعة البرق',unlocked:false},
  {icon:'🏆',name:'المتصدر',   unlocked:false},
  {icon:'📚',name:'حافظ',      unlocked:true },
  {icon:'🌟',name:'مستوى 10',  unlocked:false},
  {icon:'⚡',name:'1000 XP',   unlocked:false},
  {icon:'🎓',name:'كل المواد', unlocked:false},
  {icon:'🇮🇶',name:'فخر العراق',unlocked:false},
  {icon:'💎',name:'الماسة',    unlocked:false},
]

const DAYS = ['س','ح','ن','ث','ر','خ','ج']

function StatCard({ value, label, color }: { value: string|number; label: string; color?: string }) {
  return (
    <div style={{ textAlign:'center', background:'var(--bg3)', borderRadius:10, padding:12 }}>
      <div style={{ fontSize:'1.7rem', fontWeight:800, fontFamily:'var(--font-tajawal)', color: color||'var(--accent)' }}>{value}</div>
      <div style={{ fontSize:'0.7rem', color:'var(--text2)', marginTop:3 }}>{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats,   setStats]   = useState<Stats|null>(null)
  const [subPerf, setSubPerf] = useState<SubjectPerf[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    userService.getStats().then(data => {
      setStats(data.stats)
      setSubPerf(data.subject_performance || [])
    }).catch(() => {
      // fallback mock data
      setStats({ total_sessions:24, total_answers:312, correct_answers:248,
        avg_score:79.5, total_study_minutes:840, streak_days: user?.streak_days||8,
        xp_points: user?.xp_points||1240, level: user?.level||7, credits: user?.credits||15 })
      setSubPerf([
        {subject_name:'اللغة الإنجليزية',total_answers:140,correct_count:106,accuracy_pct:75.7},
        {subject_name:'اللغة العربية',   total_answers:98, correct_count:61, accuracy_pct:62.2},
        {subject_name:'الحاسوب',         total_answers:74, correct_count:51, accuracy_pct:68.9},
      ])
    }).finally(() => setLoading(false))
  }, [])

  const weekPerf = [65,82,45,90,72,88,60]
  const maxPerf  = Math.max(...weekPerf)

  return (
    <div className="page-container">
      <h1 className="section-title">📊 لوحة الأداء الشخصية</h1>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:18 }}>
          {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height:160, borderRadius:16 }} />)}
        </div>
      ) : (
        <>
          {/* Top row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:18, marginBottom:20 }}>

            {/* Level & XP */}
            <div className="card">
              <div style={{ fontSize:'0.82rem', color:'var(--text2)', fontWeight:600, marginBottom:10 }}>🌟 المستوى والنقاط</div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{
                  width:48, height:48, borderRadius:'50%',
                  background:'linear-gradient(135deg,var(--gold),#d97706)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:900, fontSize:'1.2rem', color:'#fff', flexShrink:0,
                  boxShadow:'0 4px 12px rgba(245,200,66,0.4)',
                }}>{stats?.level ?? user?.level ?? 7}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', color:'var(--text2)', marginBottom:5 }}>
                    <span>مستوى {stats?.level ?? 7}</span>
                    <span>{stats?.xp_points ?? 0} / {(stats?.level??7)*2000} XP</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${Math.min(100,((stats?.xp_points??0) % 2000)/20)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Streak */}
            <div className="card">
              <div style={{ fontSize:'0.82rem', color:'var(--text2)', fontWeight:600, marginBottom:10 }}>🔥 سلسلة الدراسة</div>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div>
                  <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'2.8rem', fontWeight:900, color:'var(--accent)', lineHeight:1 }}>
                    {stats?.streak_days ?? user?.streak_days ?? 8}
                  </div>
                  <div style={{ fontSize:'0.8rem', color:'var(--text2)' }}>يوم متواصل</div>
                </div>
                <div style={{ fontSize:'1.4rem' }}>🔥🔥</div>
              </div>
            </div>

            {/* Today stats */}
            <div className="card">
              <div style={{ fontSize:'0.82rem', color:'var(--text2)', fontWeight:600, marginBottom:10 }}>📅 إحصاء اليوم</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <StatCard value={18}  label="سؤال حُل"    color="var(--accent)" />
                <StatCard value="78%" label="نسبة الصح"   color="var(--success)" />
                <StatCard value={35}  label="دقيقة دراسة" color="#60a5fa" />
                <StatCard value="+85" label="XP اليوم"    color="var(--gold)" />
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:18, marginBottom:20 }}>
            {/* Weekly bar chart */}
            <div className="card">
              <div style={{ fontSize:'0.82rem', color:'var(--text2)', fontWeight:600, marginBottom:12 }}>📈 الأداء خلال الأسبوع</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80 }}>
                {weekPerf.map((v,i) => (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, height:'100%' }}>
                    <div style={{
                      width:'100%', borderRadius:'4px 4px 0 0',
                      background:`linear-gradient(180deg,var(--primary-l),var(--primary))`,
                      height:`${(v/maxPerf)*100}%`, minHeight:4, transition:'height 1s ease',
                    }} />
                    <span style={{ fontSize:'0.62rem', color:'var(--text3)' }}>{DAYS[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap */}
            <div className="card">
              <div style={{ fontSize:'0.82rem', color:'var(--text2)', fontWeight:600, marginBottom:10 }}>🗓️ نشاط 3 أشهر</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                {[...Array(84)].map((_,i) => {
                  const r = Math.random()
                  const cls = r>0.8?'l4':r>0.6?'l3':r>0.4?'l2':r>0.2?'l1':''
                  return <div key={i} className={`heatmap-cell ${cls}`} />
                })}
              </div>
              <div style={{ display:'flex', gap:6, marginTop:8, alignItems:'center', fontSize:'0.7rem', color:'var(--text3)' }}>
                <span>أقل</span>
                {['','l1','l2','l3','l4'].map(c => <div key={c} className={`heatmap-cell ${c}`} />)}
                <span>أكثر</span>
              </div>
            </div>
          </div>

          {/* Subject performance */}
          <div className="card" style={{ marginBottom:20 }}>
            <div style={{ fontSize:'0.82rem', color:'var(--text2)', fontWeight:600, marginBottom:14 }}>📚 أداء مواد الاختبار الوطني</div>
            {(subPerf.length > 0 ? subPerf : [
              {subject_name:'اللغة الإنجليزية',accuracy_pct:72,total_answers:140,correct_count:101},
              {subject_name:'اللغة العربية',   accuracy_pct:58,total_answers:98, correct_count:57 },
              {subject_name:'الحاسوب',         accuracy_pct:45,total_answers:74, correct_count:33 },
            ]).map((s,i) => {
              const colors = ['#3b82f6','#10b981','#8b5cf6']
              return (
                <div key={i} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontSize:'0.88rem' }}>
                      {['🔤','📖','💻'][i]} {s.subject_name}
                    </span>
                    <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                      <span style={{ fontSize:'0.78rem', color:'var(--text2)' }}>{s.correct_count}/{s.total_answers} صحيح</span>
                      <span style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--accent)' }}>{Number(s.accuracy_pct).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div style={{ height:'100%', width:`${s.accuracy_pct}%`, background:colors[i], borderRadius:3, transition:'width 1.2s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Global stats */}
          <div className="card" style={{ marginBottom:20 }}>
            <div style={{ fontSize:'0.82rem', color:'var(--text2)', fontWeight:600, marginBottom:14 }}>📊 إحصاء إجمالي</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12 }}>
              <StatCard value={stats?.total_sessions??24}      label="جلسة امتحان"     color="var(--primary-l)" />
              <StatCard value={stats?.total_answers??312}      label="سؤال أُجيب"      color="var(--accent)" />
              <StatCard value={stats?.correct_answers??248}    label="إجابة صحيحة"     color="var(--success)" />
              <StatCard value={`${stats?.avg_score??79}%`}     label="متوسط الدرجة"    color="var(--accent)" />
              <StatCard value={`${Math.floor((stats?.total_study_minutes??840)/60)}س`} label="إجمالي الدراسة" color="#60a5fa" />
              <StatCard value={stats?.credits??user?.credits??15} label="رصيد متبقٍ"  color="var(--gold)" />
            </div>
          </div>

          {/* Achievements */}
          <div className="card">
            <div style={{ fontSize:'0.82rem', color:'var(--text2)', fontWeight:600, marginBottom:14 }}>🏅 الإنجازات</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(75px,1fr))', gap:9 }}>
              {ACHIEVEMENTS_STATIC.map((a, i) => (
                <div key={i} title={a.name} style={{
                  background:'var(--bg3)', borderRadius:10, padding:'11px 7px',
                  textAlign:'center', opacity: a.unlocked ? 1 : 0.35,
                  filter: a.unlocked ? 'none' : 'grayscale(1)',
                  cursor: 'help', transition:'transform 0.2s',
                }}>
                  <div style={{ fontSize:'1.7rem' }}>{a.icon}</div>
                  <div style={{ fontSize:'0.62rem', color:'var(--text2)', marginTop:3 }}>{a.name}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
