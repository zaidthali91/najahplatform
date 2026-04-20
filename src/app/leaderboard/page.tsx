'use client'
// frontend/src/app/leaderboard/page.tsx
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { leaderboardService } from '@/lib/api'

type Filter = 'global' | 'weekly' | 'english' | 'arabic' | 'computer' | 'governorate'

interface Player {
  id:          string
  full_name:   string
  governorate: string
  xp_points:   number
  streak_days: number
  level:       number
  rank_global: number
  isMe?:       boolean
}

const MOCK: Player[] = [
  { id:'1', full_name:'أحمد محمد الحسيني', governorate:'بغداد',     xp_points:9820, streak_days:30, level:22, rank_global:1 },
  { id:'2', full_name:'فاطمة علي الكاظمي', governorate:'البصرة',    xp_points:8640, streak_days:25, level:20, rank_global:2 },
  { id:'3', full_name:'علي حسن الربيعي',  governorate:'النجف',      xp_points:7900, streak_days:18, level:18, rank_global:3 },
  { id:'4', full_name:'زينب كريم الزيدي', governorate:'كربلاء',    xp_points:7200, streak_days:22, level:17, rank_global:4 },
  { id:'5', full_name:'محمد جاسم العامري',governorate:'الموصل',    xp_points:6800, streak_days:15, level:16, rank_global:5 },
  { id:'6', full_name:'نور الهدى جعفر',   governorate:'أربيل',     xp_points:6100, streak_days:12, level:15, rank_global:6 },
  { id:'7', full_name:'حيدر عباس البغدادي',governorate:'كركوك',    xp_points:5700, streak_days:20, level:14, rank_global:7 },
  { id:'8', full_name:'سارة صالح الجبوري', governorate:'الديوانية',xp_points:5300, streak_days:9,  level:13, rank_global:8 },
  { id:'me',full_name:'أنت',               governorate:'كربلاء',   xp_points:1240, streak_days:8,  level:7,  rank_global:247, isMe:true },
]

const FILTERS: { id: Filter; label: string; icon: string }[] = [
  { id:'global',     label:'عام',          icon:'🌍' },
  { id:'weekly',     label:'هذا الأسبوع', icon:'📅' },
  { id:'english',    label:'إنجليزي',      icon:'🔤' },
  { id:'arabic',     label:'عربي',         icon:'📖' },
  { id:'computer',   label:'حاسوب',        icon:'💻' },
  { id:'governorate',label:'محافظتي',      icon:'🏙️' },
]

const MEDAL = ['🥇','🥈','🥉']
const MEDAL_COLOR = ['var(--gold)','var(--silver)','var(--bronze)']
const AVATAR_BG = [
  'rgba(37,99,176,0.25)','rgba(139,92,246,0.25)','rgba(16,185,129,0.25)',
  'rgba(245,158,11,0.25)','rgba(239,68,68,0.25)',
]

export default function LeaderboardPage() {
  const { user }  = useAuthStore()
  const [filter,  setFilter]  = useState<Filter>('global')
  const [players, setPlayers] = useState<Player[]>(MOCK)
  const [loading, setLoading] = useState(false)
  const [myRank,  setMyRank]  = useState<number | null>(247)

  useEffect(() => {
    setLoading(true)
    leaderboardService.get(filter)
      .then(res => {
        setPlayers(res.leaderboard?.length > 0 ? res.leaderboard : MOCK)
        setMyRank(res.my_rank)
      })
      .catch(() => setPlayers(MOCK))
      .finally(() => setLoading(false))
  }, [filter])

  const top3   = players.slice(0, 3)
  const rest   = players.slice(3)
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean)

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('') || '؟'

  return (
    <div className="page-container" style={{ maxWidth:800 }}>
      <h1 className="section-title">🏆 قائمة المتصدرين — الاختبار الوطني</h1>

      {/* My rank banner */}
      {myRank && (
        <div style={{
          background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)',
          borderRadius:14, padding:'14px 18px', marginBottom:22,
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:44, height:44, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,var(--primary-l),var(--accent))',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:700, color:'#fff', fontSize:'1rem',
            }}>{initials(user?.full_name || 'أنت')}</div>
            <div>
              <div style={{ fontWeight:700 }}>{user?.full_name || 'أنت'}</div>
              <div style={{ fontSize:'0.78rem', color:'var(--text2)' }}>
                {user?.governorate} • مستوى {user?.level ?? 7}
              </div>
            </div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'2rem', fontWeight:900, color:'var(--accent)', lineHeight:1 }}>
              #{myRank}
            </div>
            <div style={{ fontSize:'0.75rem', color:'var(--text2)' }}>ترتيبك العالمي</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'1.4rem', fontWeight:800, color:'var(--primary-l)' }}>
              {user?.xp_points?.toLocaleString() ?? '1,240'}
            </div>
            <div style={{ fontSize:'0.75rem', color:'var(--text2)' }}>نقطة XP</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'1.4rem', fontWeight:800, color:'var(--success)' }}>
              🔥 {user?.streak_days ?? 8}
            </div>
            <div style={{ fontSize:'0.75rem', color:'var(--text2)' }}>يوم متواصل</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:7, marginBottom:22, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding:'7px 16px', borderRadius:20,
            border:`1px solid ${filter===f.id ? 'var(--primary-l)' : 'var(--border)'}`,
            background: filter===f.id ? 'var(--primary)' : 'transparent',
            color: filter===f.id ? '#fff' : 'var(--text2)',
            fontFamily:'var(--font-cairo)', fontSize:'0.82rem',
            cursor:'pointer', transition:'all 0.2s',
            display:'flex', alignItems:'center', gap:5,
          }}>
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{ height:60, borderRadius:12 }} />)}
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {top3.length >= 3 && (
            <div style={{
              display:'flex', justifyContent:'center', alignItems:'flex-end',
              gap:16, marginBottom:28, padding:'30px 20px 0',
            }}>
              {podium.map((p, pIdx) => {
                const rank  = pIdx === 0 ? 2 : pIdx === 1 ? 1 : 3
                const orig  = top3[rank-1]
                const scale = rank===1 ? 1.1 : 1
                const height = rank===1 ? 90 : rank===2 ? 70 : 55

                return (
                  <div key={orig.id} style={{
                    textAlign:'center', transform:`scale(${scale})`,
                    transformOrigin:'bottom center',
                  }}>
                    <div style={{ fontSize:'1.6rem', marginBottom:4 }}>{MEDAL[rank-1]}</div>
                    <div style={{
                      width:64, height:64, borderRadius:'50%',
                      border:`3px solid ${MEDAL_COLOR[rank-1]}`,
                      background: `${MEDAL_COLOR[rank-1]}22`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:'var(--font-tajawal)', fontSize:'1.5rem', fontWeight:800,
                      margin:'0 auto 8px', color:'var(--text)',
                    }}>{initials(orig.full_name)}</div>
                    <div style={{ fontWeight:700, fontSize:'0.85rem', marginBottom:2 }}>
                      {orig.full_name.split(' ')[0]}
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text2)', marginBottom:6 }}>
                      {orig.xp_points.toLocaleString()} XP
                    </div>
                    {/* Podium stand */}
                    <div style={{
                      width:80, height:height, borderRadius:'8px 8px 0 0',
                      background:`linear-gradient(180deg,${MEDAL_COLOR[rank-1]}55,${MEDAL_COLOR[rank-1]}22)`,
                      border:`1px solid ${MEDAL_COLOR[rank-1]}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:'var(--font-tajawal)', fontWeight:900, fontSize:'1.4rem',
                      color: MEDAL_COLOR[rank-1],
                    }}>{rank}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ranked list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[...top3, ...rest].map((p, i) => (
              <div key={p.id} style={{
                background: p.isMe ? 'rgba(245,158,11,0.05)' : 'var(--surface)',
                border: `1px solid ${p.isMe ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius:12, padding:'12px 16px',
                display:'flex', alignItems:'center', gap:12,
                transition:'all 0.2s',
              }}>
                {/* Rank */}
                <div style={{
                  width:32, textAlign:'center', fontWeight:700,
                  color: i < 3 ? MEDAL_COLOR[i] : 'var(--text3)',
                  fontFamily:'var(--font-tajawal)', fontSize: i < 3 ? '1.1rem' : '0.95rem', flexShrink:0,
                }}>
                  {i < 3 ? MEDAL[i] : p.rank_global || i+1}
                </div>

                {/* Avatar */}
                <div style={{
                  width:38, height:38, borderRadius:'50%', flexShrink:0,
                  background: p.isMe ? 'linear-gradient(135deg,var(--primary-l),var(--accent))' : AVATAR_BG[i % AVATAR_BG.length],
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, fontSize:'0.88rem', color: p.isMe ? '#fff' : 'var(--text)',
                }}>
                  {initials(p.full_name)}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:'0.9rem', display:'flex', alignItems:'center', gap:6 }}>
                    {p.full_name}
                    {p.isMe && (
                      <span style={{
                        background:'rgba(245,158,11,0.15)', color:'var(--accent)',
                        fontSize:'0.7rem', fontWeight:700, padding:'2px 8px', borderRadius:20,
                      }}>أنت</span>
                    )}
                    {i < 3 && !p.isMe && (
                      <span style={{
                        background:'rgba(37,99,176,0.15)', color:'#60a5fa',
                        fontSize:'0.7rem', fontWeight:700, padding:'2px 8px', borderRadius:20,
                      }}>مستوى {p.level}</span>
                    )}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text2)', display:'flex', gap:10 }}>
                    <span>🏙️ {p.governorate}</span>
                    <span>🔥 {p.streak_days} يوم</span>
                    <span>⭐ مستوى {p.level}</span>
                  </div>
                </div>

                {/* XP */}
                <div style={{
                  fontFamily:'var(--font-tajawal)', fontWeight:700,
                  color: p.isMe ? 'var(--accent)' : 'var(--text)',
                  fontSize:'0.95rem', flexShrink:0,
                }}>
                  {p.xp_points.toLocaleString('ar-IQ')}
                  <div style={{ fontSize:'0.65rem', color:'var(--text3)', fontWeight:400, textAlign:'center' }}>XP</div>
                </div>
              </div>
            ))}
          </div>

          {/* Motivation CTA */}
          <div style={{
            background:'rgba(37,99,176,0.08)', border:'1px solid rgba(37,99,176,0.2)',
            borderRadius:14, padding:'18px 22px', marginTop:22, textAlign:'center',
          }}>
            <div style={{ fontSize:'1.3rem', marginBottom:8 }}>🚀</div>
            <div style={{ fontWeight:700, marginBottom:6 }}>تريد الوصول للقمة؟</div>
            <div style={{ fontSize:'0.85rem', color:'var(--text2)', marginBottom:14 }}>
              تدرّب يومياً وحافظ على سلسلة دراستك للصعود في القائمة!
            </div>
            <a href="/exam" className="btn btn-primary btn-sm">
              📝 ابدأ تدريب الآن
            </a>
          </div>
        </>
      )}
    </div>
  )
}
