// frontend/src/app/exam/page.tsx
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore, useExamStore, type Question } from '@/store'
import { questionService, examService, creditCost } from '@/lib/api'
import toast from 'react-hot-toast'

const SUBJECTS = [
  { slug:'english',  label:'اللغة الإنجليزية', icon:'🔤', color:'#3b82f6', chapters: [
    {slug:'all',name:'كل الأبواب'},{slug:'eng-grammar',name:'Grammar'},{slug:'eng-reading',name:'Reading'},
    {slug:'eng-vocabulary',name:'Vocabulary'},{slug:'eng-writing',name:'Writing'},{slug:'eng-tenses',name:'Tenses'},
    {slug:'eng-conditionals',name:'Conditionals'},{slug:'eng-passive',name:'Passive Voice'},
  ]},
  { slug:'arabic',   label:'اللغة العربية',    icon:'📖', color:'#10b981', chapters: [
    {slug:'all',name:'كل الأبواب'},{slug:'ara-nahw',name:'النحو والإعراب'},{slug:'ara-sarf',name:'الصرف'},
    {slug:'ara-balagha',name:'البلاغة'},{slug:'ara-adab',name:'الأدب والنصوص'},
  ]},
  { slug:'computer', label:'الحاسوب',          icon:'💻', color:'#8b5cf6', chapters: [
    {slug:'all',name:'كل الأبواب'},{slug:'com-word',name:'Microsoft Word'},{slug:'com-excel',name:'Microsoft Excel'},
    {slug:'com-internet',name:'الإنترنت'},{slug:'com-basics',name:'أساسيات الحاسوب'},
  ]},
]

const MODES = [
  {id:'ministerial',  icon:'📜', label:'وزاري حقيقي',    desc:'أسئلة من امتحانات وزارية'},
  {id:'practice',     icon:'💪', label:'تدريب حر',        desc:'بدون ضغط الوقت'},
  {id:'challenge',    icon:'⚡', label:'تحدي سريع',       desc:'30 ثانية لكل سؤال'},
  {id:'weak',         icon:'🎯', label:'نقاط الضعف',      desc:'الأسئلة التي أخطأت فيها'},
  {id:'national_sim', icon:'🏛️', label:'محاكاة وطنية',   desc:'نفس ظروف الامتحان الحقيقي'},
]

type Phase = 'setup' | 'quiz' | 'results'

export default function ExamPage() {
  const { user, updateCredits } = useAuthStore()
  const { session, startSession, recordAnswer, nextQuestion, useHint, skipQuestion, completeSession, resetSession, tickTimer, hintUsed, answered } = useExamStore()

  const [phase,      setPhase]      = useState<Phase>('setup')
  const [subjSlug,   setSubjSlug]   = useState('english')
  const [chapter,    setChapter]    = useState('all')
  const [mode,       setMode]       = useState('ministerial')
  const [qCount,     setQCount]     = useState(10)
  const [difficulty, setDifficulty] = useState('all')
  const [year,       setYear]       = useState('all')
  const [loading,    setLoading]    = useState(false)
  const [aiFeedback, setAiFeedback] = useState<{text:string;correct:boolean}|null>(null)
  const [essayText,  setEssayText]  = useState('')
  const [submittingEssay, setSubmittingEssay] = useState(false)
  const [sessionId,  setSessionId]  = useState<string|null>(null)
  const [results,    setResults]    = useState<any>(null)
  const timerRef = useRef<NodeJS.Timeout|null>(null)
  const [elapsed, setElapsed]       = useState(0)

  const currentSubj = SUBJECTS.find(s => s.slug === subjSlug)!
  const cost = creditCost(qCount)
  const currentQ: Question | undefined = session?.questions[session.currentIndex]

  // Timer
  useEffect(() => {
    if (phase === 'quiz') {
      timerRef.current = setInterval(() => setElapsed(p => p+1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  // Start exam
  const handleStart = async () => {
    if (!user) { toast.error('سجل الدخول أولاً'); return }
    if (cost > user.credits) { toast.error('رصيدك غير كافٍ 💳'); return }
    setLoading(true)
    try {
      // بدء الجلسة على السيرفر
      const sessData = await examService.startSession({
        subject_slug: subjSlug,
        chapter_slug: chapter !== 'all' ? chapter : undefined,
        mode, question_count: qCount, difficulty,
        year_filter: year !== 'all' ? year : undefined,
      })
      setSessionId(sessData.session_id)

      // جلب الأسئلة
      const { questions } = await questionService.getQuestions({
        subject: subjSlug,
        chapter: chapter !== 'all' ? chapter : undefined,
        year:    year !== 'all' ? year : undefined,
        difficulty: difficulty !== 'all' ? difficulty : undefined,
        limit:  qCount, mode,
      })

      if (!questions?.length) { toast.error('لا توجد أسئلة بهذه الفلاتر'); return }

      startSession({ session_id: sessData.session_id, questions, mode, subject_slug: subjSlug, credits_used: cost })
      updateCredits(-cost)
      setPhase('quiz')
      setElapsed(0)
      setAiFeedback(null)
      setEssayText('')
    } catch (err: any) {
      if (err?.response?.status === 402) toast.error('رصيدك غير كافٍ للبدء')
    } finally { setLoading(false) }
  }

  // Submit MCQ answer
  const handleMCQ = async (idx: number) => {
    if (!currentQ || answered || !sessionId) return
    const correct = idx === currentQ.correct_answer

    // إرسال الإجابة للسيرفر
    const res = await examService.submitAnswer(sessionId, {
      question_id: currentQ.id, answer_index: idx,
      time_taken_seconds: elapsed,
    })

    recordAnswer(currentQ.id, idx, correct, elapsed)
    setAiFeedback({ text: res.explanation || currentQ.explanation || '', correct: res.is_correct })
    if (correct) toast.success('+10 نقاط! ✅')
  }

  // Submit essay
  const handleEssay = async () => {
    if (!currentQ || !essayText.trim() || !sessionId) return
    setSubmittingEssay(true)
    try {
      const res = await examService.submitAnswer(sessionId, {
        question_id: currentQ.id, essay_answer: essayText,
        time_taken_seconds: elapsed,
      })
      recordAnswer(currentQ.id, essayText, res.is_correct, elapsed)
      setAiFeedback({
        text: `${res.ai_feedback || ''} — الدرجة: ${res.ai_score ?? '?'}/10`,
        correct: res.is_correct,
      })
    } finally { setSubmittingEssay(false) }
  }

  // Next question
  const handleNext = () => {
    const isLast = session && session.currentIndex >= session.questions.length - 1
    if (isLast) { handleFinish(); return }
    nextQuestion()
    setAiFeedback(null)
    setEssayText('')
  }

  // Finish exam
  const handleFinish = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!sessionId) { setPhase('results'); return }
    try {
      const res = await examService.completeSession(sessionId, elapsed)
      setResults(res)
      completeSession()
    } catch { setResults(null) }
    setPhase('results')
  }

  // Reset
  const handleReset = () => {
    resetSession()
    setPhase('setup')
    setResults(null)
    setSessionId(null)
    setAiFeedback(null)
    setEssayText('')
    setElapsed(0)
  }

  const pct   = session ? Math.round(((session.currentIndex+1)/session.questions.length)*100) : 0
  const score = session?.score ?? 0

  // ===== SETUP PHASE =====
  if (phase === 'setup') return (
    <div className="page-container" style={{ maxWidth:740 }}>
      <h1 className="section-title">📝 إعداد امتحان الاختبار الوطني</h1>

      {/* Subject selector */}
      <div className="card" style={{ marginBottom:16 }}>
        <h3 style={{ marginBottom:16, fontSize:'1rem' }}>اختر المادة</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {SUBJECTS.map(s => (
            <button key={s.slug} onClick={() => { setSubjSlug(s.slug); setChapter('all') }} style={{
              padding:'16px 10px', borderRadius:14, textAlign:'center',
              border:`2px solid ${subjSlug===s.slug ? s.color : 'var(--border)'}`,
              background: subjSlug===s.slug ? `${s.color}18` : 'var(--bg3)',
              cursor:'pointer', transition:'all 0.2s',
            }}>
              <div style={{ fontSize:'2rem', marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:'0.88rem', fontWeight:700, color:'var(--text)', fontFamily:'var(--font-cairo)' }}>{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Chapter selector */}
      <div className="card" style={{ marginBottom:16 }}>
        <h3 style={{ marginBottom:14, fontSize:'1rem' }}>الباب / الوحدة</h3>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {currentSubj.chapters.map(c => (
            <button key={c.slug} onClick={() => setChapter(c.slug)} style={{
              padding:'8px 16px', borderRadius:20, border:'1px solid var(--border2)',
              background: chapter===c.slug ? 'rgba(37,99,176,0.15)' : 'var(--bg3)',
              borderColor: chapter===c.slug ? 'var(--primary-l)' : 'var(--border2)',
              color:'var(--text)', fontFamily:'var(--font-cairo)', fontSize:'0.82rem',
              cursor:'pointer', transition:'all 0.2s',
            }}>{c.name}</button>
          ))}
        </div>
      </div>

      {/* Mode selector */}
      <div className="card" style={{ marginBottom:16 }}>
        <h3 style={{ marginBottom:14, fontSize:'1rem' }}>طريقة الامتحان</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10 }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              padding:'14px 10px', borderRadius:12, textAlign:'center',
              border:`2px solid ${mode===m.id ? 'var(--primary-l)' : 'var(--border)'}`,
              background: mode===m.id ? 'rgba(37,99,176,0.1)' : 'var(--bg3)',
              cursor:'pointer', transition:'all 0.2s',
            }}>
              <div style={{ fontSize:'1.8rem', marginBottom:6 }}>{m.icon}</div>
              <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text)', fontFamily:'var(--font-cairo)' }}>{m.label}</div>
              <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginTop:3, fontFamily:'var(--font-cairo)' }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="card" style={{ marginBottom:16 }}>
        <h3 style={{ marginBottom:14, fontSize:'1rem' }}>إعدادات تفصيلية</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:'0.82rem', color:'var(--text2)', marginBottom:7, fontWeight:600 }}>عدد الأسئلة</label>
            <select className="input-base" value={qCount} onChange={e => setQCount(+e.target.value)} style={{ appearance:'none' }}>
              <option value={5}>5 أسئلة — مجاني</option>
              <option value={10}>10 أسئلة (1 رصيد)</option>
              <option value={20}>20 سؤال (2 رصيد)</option>
              <option value={30}>30 سؤال (3 رصيد)</option>
              <option value={50}>50 سؤال (5 رصيد)</option>
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:'0.82rem', color:'var(--text2)', marginBottom:7, fontWeight:600 }}>مستوى الصعوبة</label>
            <select className="input-base" value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ appearance:'none' }}>
              <option value="all">كل المستويات</option>
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:'0.82rem', color:'var(--text2)', marginBottom:7, fontWeight:600 }}>السنة الوزارية</label>
            <select className="input-base" value={year} onChange={e => setYear(e.target.value)} style={{ appearance:'none' }}>
              <option value="all">كل السنوات</option>
              {[2025,2024,2023,2022,2021,2020,2019,2018,2015].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Credit warning */}
      {cost > 0 && user && cost > user.credits && (
        <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:'0.88rem' }}>
          ⚠️ رصيدك ({user.credits}) غير كافٍ لهذا الامتحان ({cost} رصيد).{' '}
          <a href="/pricing" style={{ color:'var(--accent)', fontWeight:700 }}>اشحن رصيداً</a>
        </div>
      )}

      <div style={{ textAlign:'center' }}>
        <button className="btn btn-accent btn-lg" onClick={handleStart} disabled={loading}>
          {loading ? <span className="spinner" /> : `🚀 ابدأ الامتحان ${cost > 0 ? `(${cost} رصيد)` : '(مجاناً)'}`}
        </button>
      </div>
    </div>
  )

  // ===== QUIZ PHASE =====
  if (phase === 'quiz' && session && currentQ) return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', color:'var(--text2)', marginBottom:5 }}>
            <span>السؤال {session.currentIndex+1} من {session.questions.length}</span>
            <span style={{ color:'var(--accent)' }}>النقاط: {score}</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width:`${pct}%` }} /></div>
        </div>
        <div style={{
          background:'var(--surface)', border:`1px solid ${elapsed > 5400 ? 'var(--accent2)' : 'var(--border)'}`,
          borderRadius:10, padding:'7px 14px', fontFamily:'var(--font-tajawal)', fontSize:'1.1rem', fontWeight:700,
          color: elapsed > 5400 ? 'var(--accent2)' : 'var(--text)',
        }}>⏱ {fmtTime(elapsed)}</div>
        <button className="btn btn-outline btn-sm" onClick={handleFinish}>إنهاء</button>
      </div>

      {/* Question card */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:14 }}>
          {currentQ.year && <span className="badge badge-accent">{currentQ.year} — الدور {currentQ.session}</span>}
          <span className="badge badge-primary">{currentQ.subject?.name_ar}</span>
          <span className="badge badge-national">🇮🇶 وطني</span>
          <span className="badge badge-success">{currentQ.question_type === 'mcq' ? 'اختيار متعدد' : 'مقالي'}</span>
          <div style={{ display:'flex', gap:3, alignItems:'center' }}>
            {['easy','medium','hard'].map((d,i) => (
              <div key={d} className={`diff-dot ${i < (['easy','medium','hard'].indexOf(currentQ.difficulty)+1) ? currentQ.difficulty : ''}`} />
            ))}
          </div>
        </div>
        <p style={{ fontSize:'1.05rem', lineHeight:1.85, fontWeight:600, marginBottom:22 }}>
          {currentQ.question_text}
        </p>

        {/* MCQ Options */}
        {currentQ.question_type === 'mcq' && currentQ.options && (
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {currentQ.options.map((opt, i) => {
              const ans = session.answers[currentQ.id]
              const isSelected = ans?.answer === i
              const isCorrect  = answered && i === currentQ.correct_answer
              const isWrong    = answered && isSelected && !isCorrect
              return (
                <button key={i} disabled={answered} onClick={() => handleMCQ(i)}
                  className={`option-btn ${isCorrect?'correct':''} ${isWrong?'wrong':''}`}>
                  <span style={{
                    width:30, height:30, borderRadius:'50%', flexShrink:0,
                    background: isCorrect ? 'rgba(16,185,129,0.3)' : isWrong ? 'rgba(239,68,68,0.3)' : 'var(--surface2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:700, fontSize:'0.85rem',
                  }}>{opt.label}</span>
                  {opt.text}
                </button>
              )
            })}
          </div>
        )}

        {/* Essay */}
        {currentQ.question_type === 'essay' && (
          <>
            <textarea style={{
              width:'100%', minHeight:150, padding:'14px',
              background:'var(--bg3)', border:'1px solid var(--border2)',
              borderRadius:12, color:'var(--text)', fontFamily:'var(--font-cairo)',
              fontSize:'0.95rem', resize:'vertical', outline:'none', lineHeight:1.8,
            }} placeholder="اكتب إجابتك هنا..." value={essayText} onChange={e => setEssayText(e.target.value)} disabled={answered} />
            {!answered && (
              <button className="btn btn-primary btn-sm" style={{ marginTop:10 }}
                onClick={handleEssay} disabled={submittingEssay || !essayText.trim()}>
                {submittingEssay ? <><span className="spinner" /> جاري التقييم...</> : '🤖 تقييم بالذكاء الاصطناعي'}
              </button>
            )}
          </>
        )}

        {/* Hint */}
        {hintUsed && currentQ.hint && (
          <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:'12px 14px', marginTop:12 }}>
            <div style={{ fontSize:'0.78rem', color:'var(--accent)', fontWeight:700, marginBottom:5 }}>💡 تلميح (-2 نقطة)</div>
            <div style={{ fontSize:'0.9rem' }}>{currentQ.hint}</div>
          </div>
        )}
      </div>

      {/* AI Feedback */}
      {aiFeedback && (
        <div style={{ background:'var(--bg3)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, color:'var(--accent)', marginBottom:8 }}>
            <span>🤖</span> تقييم الذكاء الاصطناعي
            <span style={{ background:'var(--surface)', borderRadius:20, padding:'3px 12px', fontSize:'0.9rem', color: aiFeedback.correct ? 'var(--success)' : 'var(--accent2)' }}>
              {aiFeedback.correct ? '✓ صحيح' : '✗ خطأ'}
            </span>
          </div>
          <div style={{ color:'var(--text2)', lineHeight:1.8, fontSize:'0.9rem' }}>{aiFeedback.text}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:9, justifyContent:'flex-end', flexWrap:'wrap' }}>
        {!hintUsed && currentQ.hint && (
          <button className="btn btn-outline btn-sm" onClick={useHint} disabled={answered}>💡 تلميح</button>
        )}
        <button className="btn btn-outline btn-sm" onClick={() => { skipQuestion(); setAiFeedback(null); setEssayText('') }}>⏭ تخطي</button>
        <button className="btn btn-primary" onClick={handleNext} disabled={!answered} style={{ padding:'10px 22px' }}>
          {session.currentIndex >= session.questions.length-1 ? 'إنهاء ✓' : 'التالي ←'}
        </button>
      </div>
    </div>
  )

  // ===== RESULTS PHASE =====
  if (phase === 'results') {
    const total   = session?.questions.length ?? 0
    const correct = session ? Object.values(session.answers).filter(a => a.correct).length : 0
    const wrong   = total - correct
    const finalPct= total > 0 ? Math.round((correct/total)*100) : (results?.percentage ?? 0)
    const deg     = (finalPct/100)*360
    const grade   = finalPct>=90?'ممتاز 🌟':finalPct>=75?'جيد جداً 👏':finalPct>=60?'جيد 📚':'يحتاج مراجعة ⚠️'
    const xp      = results?.xp_earned ?? Math.round(correct*5)

    return (
      <div className="page-container" style={{ maxWidth:700 }}>
        <div className="card" style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{
            width:130, height:130, borderRadius:'50%', margin:'0 auto 18px',
            background:`conic-gradient(var(--accent) ${deg}deg, var(--bg3) 0deg)`,
            display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
          }}>
            <div style={{ position:'absolute', inset:11, background:'var(--surface)', borderRadius:'50%' }} />
            <span style={{ position:'relative', fontFamily:'var(--font-tajawal)', fontSize:'2rem', fontWeight:900 }}>{finalPct}%</span>
          </div>
          <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'1.5rem', fontWeight:800, marginBottom:6 }}>{grade}</div>
          <div style={{ color:'var(--text2)', fontSize:'0.88rem' }}>
            حصلت على <strong style={{ color:'var(--gold)' }}>{xp} XP</strong> من هذا الامتحان!
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:22 }}>
          {[
            { val:`${finalPct}%`, label:'الدرجة', color:'var(--accent)' },
            { val:correct, label:'صحيح', color:'var(--success)' },
            { val:wrong, label:'خطأ', color:'var(--accent2)' },
            { val:fmtTime(elapsed), label:'الوقت', color:'#60a5fa' },
          ].map(item => (
            <div key={item.label} className="card" style={{ textAlign:'center', padding:14 }}>
              <div style={{ fontSize:'1.4rem', fontWeight:800, fontFamily:'var(--font-tajawal)', color:item.color }}>{item.val}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text2)', marginTop:3 }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn btn-accent" onClick={handleReset}>🔄 امتحان جديد</button>
          <button className="btn btn-primary" onClick={() => { setMode('weak'); handleReset() }}>📋 راجع الأخطاء</button>
          <a href="/dashboard" className="btn btn-outline">📊 لوحة الأداء</a>
        </div>
      </div>
    )
  }

  return null
}
