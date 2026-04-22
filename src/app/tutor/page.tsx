export const dynamic = 'force-dynamic'  
'use client'
// frontend/src/app/tutor/page.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store'
import { tutorService } from '@/lib/api'
import toast from 'react-hot-toast'

/* ─────────────────── types ─────────────────── */
interface Msg {
  id:      string
  role:    'user' | 'ai' | 'typing'
  content: string
  pdf?:    string
}

interface Subject {
  key:    string
  slug:   string
  label:  string
  icon:   string
  color:  string
  chips:  string[]
  subsections: { key: string; label: string; icon: string }[]
}

/* ─────────────────── data ─────────────────── */
const SUBJECTS: Subject[] = [
  {
    key:'english', slug:'english', label:'اللغة الإنجليزية', icon:'🔤', color:'#3b82f6',
    chips:['أهم قواعد Grammar','Reading Comprehension','Vocabulary strategy','Passive Voice شرح','نصيحة للامتحان'],
    subsections:[
      {key:'grammar',     label:'Grammar',     icon:'📐'},
      {key:'reading',     label:'Reading',     icon:'📑'},
      {key:'vocabulary',  label:'Vocabulary',  icon:'🔑'},
      {key:'writing',     label:'Writing',     icon:'✍️'},
      {key:'tenses',      label:'Tenses',      icon:'⏰'},
      {key:'conditionals',label:'Conditionals',icon:'🔀'},
    ],
  },
  {
    key:'arabic', slug:'arabic', label:'اللغة العربية', icon:'📖', color:'#10b981',
    chips:['قواعد الإعراب','البلاغة والبيان','النحو والصرف','تحليل نص أدبي','أسئلة متوقعة'],
    subsections:[
      {key:'nahw',    label:'النحو والإعراب',  icon:'✍️'},
      {key:'sarf',    label:'الصرف',           icon:'📌'},
      {key:'balagha', label:'البلاغة',         icon:'🎭'},
      {key:'adab',    label:'الأدب والنصوص',  icon:'📜'},
      {key:'qiraah',  label:'فهم المقروء',    icon:'👁️'},
    ],
  },
  {
    key:'computer', slug:'computer', label:'الحاسوب', icon:'💻', color:'#8b5cf6',
    chips:['اختصارات Word','دوال Excel','مفاهيم الإنترنت','IP Address شرح','أساسيات الشبكات'],
    subsections:[
      {key:'word',    label:'Microsoft Word',   icon:'📝'},
      {key:'excel',   label:'Microsoft Excel',  icon:'📊'},
      {key:'access',  label:'Microsoft Access', icon:'🗄️'},
      {key:'ppt',     label:'PowerPoint',       icon:'🎞️'},
      {key:'net',     label:'الإنترنت',         icon:'🌐'},
      {key:'basics',  label:'أساسيات',          icon:'🖥️'},
    ],
  },
]

/* ─────────────────── helpers ─────────────────── */
const uid = () => Math.random().toString(36).slice(2)
const fmtTime = (d: Date) =>
  d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })

/* ─────────────────── component ─────────────────── */
export default function TutorPage() {
  const { user, updateCredits } = useAuthStore()

  const [activeSub,  setActiveSub]  = useState(SUBJECTS[0])
  const [activeKey,  setActiveKey]  = useState('english')
  const [convId,     setConvId]     = useState<string | null>(null)
  const [msgs,       setMsgs]       = useState<Msg[]>([{
    id: uid(), role:'ai',
    content:'مرحباً! أنا معلمك الذكي للغة الإنجليزية 🔤\n\nأنا مخصص للاختبار الوطني العراقي ومتمكن من المنهج الوزاري بالكامل.\n\nيمكنني مساعدتك في: **Grammar • Reading • Vocabulary • Writing**\n\nما الذي تريد تعلمه اليوم؟'
  }])
  const [input,      setInput]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [attachedPdf,setAttachedPdf]= useState<File | null>(null)
  const [sidebarOpen,setSidebarOpen]= useState(true)
  const [convHistory,setConvHistory]= useState<any[]>([])
  const [showHistory,setShowHistory]= useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const fileRef        = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [msgs])

  useEffect(() => {
    tutorService.getConversations()
      .then(d => setConvHistory(d.conversations || []))
      .catch(() => {})
  }, [])

  /* ── switch subject ── */
  const switchSubject = (sub: Subject, key?: string) => {
    setActiveSub(sub)
    setActiveKey(key || sub.key)
    setConvId(null)
    const slug = key || sub.key

    const welcomes: Record<string, string> = {
      english:     '🔤 مرحباً! معلم اللغة الإنجليزية جاهز. كيف أساعدك في منهج الاختبار الوطني؟',
      arabic:      '📖 مرحباً! معلم اللغة العربية هنا. ما الذي تريد أن تتعلمه في النحو أو البلاغة؟',
      computer:    '💻 مرحباً! معلم الحاسوب حاضر. اسألني عن Word أو Excel أو الإنترنت.',
      grammar:     '📐 Grammar teacher ready! Ask me anything about tenses, clauses, or structures.',
      reading:     '📑 Let\'s work on Reading Comprehension! Share a passage or ask about strategy.',
      vocabulary:  '🔑 Vocabulary master at your service! Ask about word meanings, roots, or usage.',
      nahw:        '✍️ معلم النحو والإعراب بين يديك. اسألني عن الإعراب أو القواعد النحوية.',
      balagha:     '🎭 معلم البلاغة هنا. أعطني جملة لأحللها أو اسألني عن الاستعارة والتشبيه.',
      word:        '📝 Microsoft Word expert! Ask me about shortcuts, formatting, or features.',
      excel:       '📊 Excel guru here! Ask about formulas, functions, charts, or data.',
      net:         '🌐 Network & Internet specialist! Ask about IP, protocols, or browser concepts.',
    }

    setMsgs([{ id:uid(), role:'ai', content: welcomes[slug] || welcomes[sub.key] }])
  }

  /* ── send message ── */
  const sendMsg = useCallback(async (text?: string) => {
    const message = (text || input).trim()
    if (!message || sending) return
    if (!user) { toast.error('سجل الدخول أولاً'); return }
    if (user.credits < 1) {
      toast.error('رصيدك نفد! اشحن رصيداً 💳')
      return
    }

    const userMsg: Msg = { id:uid(), role:'user', content: message,
      pdf: attachedPdf?.name }
    const typingMsg: Msg = { id:'typing', role:'typing', content:'' }

    setMsgs(p => [...p, userMsg, typingMsg])
    setInput('')
    setAttachedPdf(null)
    setSending(true)
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    try {
      const res = await tutorService.sendMessage({
        message,
        subject_slug: activeKey,
        conversation_id: convId || undefined,
      })

      if (!convId && res.conversation_id) setConvId(res.conversation_id)
      updateCredits(-1)

      setMsgs(p => [
        ...p.filter(m => m.id !== 'typing'),
        { id:uid(), role:'ai', content: res.reply }
      ])
    } catch (err: any) {
      setMsgs(p => p.filter(m => m.id !== 'typing'))
      if (err?.response?.status === 402) {
        toast.error('رصيدك غير كافٍ 💳')
      }
    } finally { setSending(false) }
  }, [input, sending, user, convId, activeKey, attachedPdf])

  /* ── key handler ── */
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() }
  }

  /* ── render message content (simple markdown) ── */
  const renderContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:var(--bg2);padding:2px 6px;border-radius:4px;font-size:0.88em">$1</code>')
      .replace(/\n/g, '<br>')
  }

  /* ──────────────── JSX ──────────────── */
  return (
    <div style={{ display:'flex', height:'calc(100vh - 64px)', overflow:'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? 240 : 0, flexShrink:0,
        background:'var(--surface)', borderLeft:'1px solid var(--border)',
        display:'flex', flexDirection:'column',
        transition:'width 0.3s ease', overflow:'hidden',
      }}>
        <div style={{ padding:14, overflowY:'auto', flex:1 }}>

          {/* Main subjects */}
          <div style={{ fontSize:'0.72rem', color:'var(--text3)', fontWeight:600, padding:'0 4px', marginBottom:6 }}>
            مواد الاختبار الوطني
          </div>
          {SUBJECTS.map(sub => (
            <button key={sub.key}
              onClick={() => switchSubject(sub)}
              style={{
                width:'100%', padding:'11px 13px', borderRadius:10, border:'none',
                background: activeSub.key===sub.key && activeKey===sub.key ? sub.color+'22' : 'transparent',
                borderRight: activeSub.key===sub.key && activeKey===sub.key ? `3px solid ${sub.color}` : '3px solid transparent',
                color: activeSub.key===sub.key && activeKey===sub.key ? sub.color : 'var(--text2)',
                fontFamily:'var(--font-cairo)', fontSize:'0.88rem',
                textAlign:'right', cursor:'pointer', transition:'all 0.2s',
                display:'flex', alignItems:'center', gap:8, marginBottom:4,
              }}>
              {sub.icon} {sub.label}
            </button>
          ))}

          {/* Subsections */}
          <div style={{ height:1, background:'var(--border)', margin:'12px 0' }} />
          <div style={{ fontSize:'0.72rem', color:'var(--text3)', fontWeight:600, padding:'0 4px', marginBottom:6 }}>
            أبواب: {activeSub.label}
          </div>
          {activeSub.subsections.map(sec => (
            <button key={sec.key}
              onClick={() => switchSubject(activeSub, sec.key)}
              style={{
                width:'100%', padding:'9px 13px', borderRadius:10, border:'none',
                background: activeKey===sec.key ? 'var(--primary)' : 'transparent',
                color: activeKey===sec.key ? '#fff' : 'var(--text3)',
                fontFamily:'var(--font-cairo)', fontSize:'0.82rem',
                textAlign:'right', cursor:'pointer', transition:'all 0.2s',
                display:'flex', alignItems:'center', gap:8, marginBottom:2,
              }}>
              {sec.icon} {sec.label}
            </button>
          ))}

          {/* History */}
          <div style={{ height:1, background:'var(--border)', margin:'12px 0' }} />
          <div style={{ fontSize:'0.72rem', color:'var(--text3)', fontWeight:600, padding:'0 4px', marginBottom:6 }}>
            المحادثات السابقة
          </div>
          {convHistory.slice(0, 5).map(c => (
            <button key={c.id}
              onClick={async () => {
                const { messages } = await tutorService.getMessages(c.id)
                setConvId(c.id)
                setMsgs((messages || []).map((m: any) => ({
                  id: m.id, role: m.role === 'assistant' ? 'ai' : m.role, content: m.content
                })))
              }}
              style={{
                width:'100%', padding:'8px 13px', borderRadius:9, border:'none',
                background:'transparent', color:'var(--text3)',
                fontFamily:'var(--font-cairo)', fontSize:'0.78rem',
                textAlign:'right', cursor:'pointer', transition:'all 0.2s',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>
              💬 {c.title || 'محادثة'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* Chat header */}
        <div style={{
          padding:'12px 18px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:10, background:'var(--surface)',
        }}>
          <button onClick={() => setSidebarOpen(p=>!p)} style={{
            background:'none', border:'none', color:'var(--text2)',
            fontSize:'1.2rem', cursor:'pointer', padding:4,
          }}>☰</button>

          <div style={{
            width:38, height:38, borderRadius:'50%',
            background:`linear-gradient(135deg,${activeSub.color},var(--accent))`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0,
          }}>{activeSub.icon}</div>

          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:'0.95rem' }}>معلم {activeSub.label}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--success)' }}>
              ● متاح الآن — مدعوم بـ Claude AI
            </div>
          </div>

          <div style={{ fontSize:'0.75rem', color:'var(--text3)', display:'flex', alignItems:'center', gap:5 }}>
            ⚡ 1 رصيد/رسالة
            <span style={{
              background:'rgba(37,99,176,0.15)', color:'#60a5fa',
              padding:'3px 10px', borderRadius:20, fontSize:'0.75rem', fontWeight:700,
            }}>{user?.credits ?? 0} رصيد</span>
          </div>
        </div>

        {/* Quick chips */}
        <div style={{
          display:'flex', flexWrap:'wrap', gap:7, padding:'10px 16px',
          borderBottom:'1px solid var(--border)', background:'var(--bg2)',
        }}>
          {activeSub.chips.map(chip => (
            <button key={chip}
              onClick={() => sendMsg(chip)}
              disabled={sending}
              style={{
                padding:'6px 13px', borderRadius:20,
                background:'var(--bg3)', border:'1px solid var(--border2)',
                fontFamily:'var(--font-cairo)', fontSize:'0.78rem',
                cursor:'pointer', color:'var(--text2)', transition:'all 0.2s',
              }}>
              {chip}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{
          flex:1, overflowY:'auto', padding:'18px 20px',
          display:'flex', flexDirection:'column', gap:14,
        }}>
          {msgs.map(msg => (
            <div key={msg.id} style={{
              display:'flex',
              justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end',
            }}>
              {msg.role === 'ai' && (
                <div style={{
                  width:30, height:30, borderRadius:'50%', flexShrink:0,
                  background:`linear-gradient(135deg,${activeSub.color},var(--accent))`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'0.9rem', marginLeft:8, alignSelf:'flex-end',
                }}>{activeSub.icon}</div>
              )}

              <div style={{
                maxWidth:'80%', padding:'12px 16px',
                borderRadius: msg.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role==='user' ? 'var(--primary)' : 'var(--bg3)',
                border: msg.role==='ai' ? '1px solid var(--border)' : 'none',
                color: msg.role==='user' ? '#fff' : 'var(--text)',
                fontSize:'0.9rem', lineHeight:1.75,
              }}>
                {msg.role === 'typing' ? (
                  <div style={{ display:'flex', gap:4, padding:'4px 0' }}>
                    {[0,1,2].map(i => (
                      <div key={i} className="typing-dot"
                        style={{ animationDelay:`${i*0.2}s` }} />
                    ))}
                  </div>
                ) : (
                  <>
                    {msg.pdf && (
                      <div style={{
                        display:'flex', alignItems:'center', gap:7,
                        background:'rgba(255,255,255,0.1)', borderRadius:8,
                        padding:'6px 10px', marginBottom:8, fontSize:'0.78rem',
                      }}>
                        📎 {msg.pdf}
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
                  </>
                )}
              </div>

              {msg.role === 'user' && (
                <div style={{
                  width:30, height:30, borderRadius:'50%', flexShrink:0,
                  background:'linear-gradient(135deg,var(--primary-l),var(--accent))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'0.85rem', fontWeight:700, color:'#fff',
                  marginRight:8, alignSelf:'flex-end',
                }}>
                  {user?.full_name?.charAt(0) || 'أ'}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding:'12px 16px', borderTop:'1px solid var(--border)',
          background:'var(--surface)',
        }}>
          {/* PDF attachment preview */}
          {attachedPdf && (
            <div style={{
              display:'flex', alignItems:'center', gap:8, marginBottom:10,
              background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)',
              borderRadius:10, padding:'8px 12px', fontSize:'0.82rem',
            }}>
              <span>📎</span>
              <span style={{ flex:1, color:'var(--text2)' }}>{attachedPdf.name}</span>
              <button onClick={() => setAttachedPdf(null)} style={{
                background:'none', border:'none', color:'var(--accent2)', cursor:'pointer', fontSize:'1rem',
              }}>✕</button>
            </div>
          )}

          <div style={{ display:'flex', gap:9, alignItems:'flex-end' }}>
            {/* PDF attach */}
            <button onClick={() => fileRef.current?.click()} style={{
              width:42, height:42, borderRadius:12, flexShrink:0,
              background:'var(--bg3)', border:'1px solid var(--border2)',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'1.1rem', color:'var(--text2)', transition:'all 0.2s',
            }} title="إرفاق PDF">
              📎
            </button>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }}
              onChange={e => { if (e.target.files?.[0]) setAttachedPdf(e.target.files[0]) }} />

            {/* Text input */}
            <textarea ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120)+'px'
              }}
              onKeyDown={handleKey}
              placeholder="اكتب سؤالك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
              disabled={sending}
              rows={1}
              style={{
                flex:1, padding:'11px 14px', minHeight:42, maxHeight:120,
                background:'var(--input-bg)', border:'1px solid var(--border2)',
                borderRadius:12, color:'var(--text)',
                fontFamily:'var(--font-cairo)', fontSize:'0.9rem',
                resize:'none', outline:'none', transition:'border-color 0.2s',
              }}
            />

            {/* Send button */}
            <button onClick={() => sendMsg()} disabled={!input.trim() || sending} style={{
              width:42, height:42, borderRadius:12, flexShrink:0,
              background: !input.trim() || sending ? 'var(--bg3)' : 'var(--primary)',
              border:'none', cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'1.1rem', transition:'all 0.2s', color:'#fff',
            }}>
              {sending ? <span className="spinner" /> : '➤'}
            </button>
          </div>

          <div style={{ marginTop:8, fontSize:'0.72rem', color:'var(--text3)', display:'flex', gap:16 }}>
            <span>⚡ كل رسالة تستهلك 1 رصيد</span>
            <span>📎 يمكنك إرفاق PDF لتحليله مع الرسالة</span>
          </div>
        </div>
      </div>
    </div>
  )
}
