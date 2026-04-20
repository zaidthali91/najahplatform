'use client'
// frontend/src/app/pdf/page.tsx
import { useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store'
import { pdfService } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface PdfFile {
  id:         string
  name:       string
  size:       string
  status:     'uploading' | 'analyzing' | 'done' | 'error'
  progress:   number
  summary?:   string
  concepts?:  string[]
  questions?: Array<{
    text:        string
    type:        'mcq' | 'essay'
    options?:    string[]
    correct?:    number
    explanation?: string
    hint?:        string
  }>
  pages?: number
}

const fmt = (bytes: number) => {
  if (bytes < 1024)         return bytes + ' B'
  if (bytes < 1024*1024)    return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/(1024*1024)).toFixed(1) + ' MB'
}

export default function PdfPage() {
  const { user, updateCredits } = useAuthStore()
  const [files,    setFiles]    = useState<PdfFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* ── process dropped / selected files ── */
  const processFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return
    if (!user) { toast.error('سجل الدخول أولاً'); return }

    for (const file of Array.from(fileList)) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast.error(`${file.name} — يُقبل فقط ملفات PDF`)
        continue
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} — يتجاوز 20 ميجابايت`)
        continue
      }

      // Check credits (first PDF free)
      const hasPrev = files.length > 0
      if (hasPrev && (user.credits ?? 0) < 2) {
        toast.error('تحتاج 2 رصيد لتحليل PDF إضافي 💳')
        continue
      }

      const id = Math.random().toString(36).slice(2)
      const pf: PdfFile = {
        id, name: file.name, size: fmt(file.size),
        status: 'uploading', progress: 0,
      }
      setFiles(p => [pf, ...p])

      try {
        /* upload */
        const res = await pdfService.upload(file)
        setFiles(p => p.map(f => f.id===id
          ? { ...f, status:'analyzing', progress:40 }
          : f
        ))

        if (!hasPrev) {
          toast('تحليلك المجاني الأول! جارٍ المعالجة...', { icon:'🎁', duration:4000 })
        } else {
          updateCredits(-2)
          toast('تم خصم 2 رصيد. جارٍ التحليل...', { icon:'📄' })
        }

        /* poll until done */
        const poll = async () => {
          let tries = 0
          const iv = setInterval(async () => {
            tries++
            try {
              const { pdf } = await pdfService.getStatus(res.pdf_id)
              const prog = Math.min(40 + tries * 10, 95)
              setFiles(p => p.map(f => f.id===id ? { ...f, progress:prog } : f))

              if (pdf.status === 'done') {
                clearInterval(iv)
                setFiles(p => p.map(f => f.id===id ? {
                  ...f, status:'done', progress:100,
                  summary:   pdf.summary,
                  concepts:  pdf.key_concepts,
                  questions: pdf.generated_questions,
                  pages:     pdf.page_count,
                } : f))
                setExpanded(id)
                toast.success(`تم تحليل ${file.name} — ${pdf.generated_questions?.length || 0} سؤال مولَّد ✅`)
              } else if (pdf.status === 'error' || tries > 30) {
                clearInterval(iv)
                setFiles(p => p.map(f => f.id===id ? { ...f, status:'error', progress:0 } : f))
                toast.error('فشل تحليل الملف، حاول مرة أخرى')
              }
            } catch { if (tries > 30) clearInterval(iv) }
          }, 3000)
        }
        poll()

      } catch (err: any) {
        setFiles(p => p.map(f => f.id===id ? { ...f, status:'error', progress:0 } : f))
        if (err?.response?.status !== 402) toast.error('فشل رفع الملف')
      }
    }
  }, [files, user, updateCredits])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  /* ── sample questions (static fallback for demo) ── */
  const SAMPLE_QS = [
    { type:'mcq', text:'ما المفهوم الرئيسي الذي يتناوله هذا الفصل؟', options:['المفهوم الأول','المفهوم الثاني','المفهوم الثالث','المفهوم الرابع'], correct:0, explanation:'استناداً لمحتوى الملف المرفوع' },
    { type:'mcq', text:'ما الخطوة الأولى في الإجراء الموصوف في النص؟', options:['الخطوة أ','الخطوة ب','الخطوة ج','الخطوة د'], correct:1, explanation:'وردت الخطوات بالترتيب في الفصل الثاني' },
    { type:'essay', text:'اشرح بأسلوبك الفرق بين المفهومين الرئيسيين الواردين في الملف.', hint:'ركّز على التعريف، الخصائص، والتطبيقات' },
    { type:'mcq', text:'ما الاستنتاج الأبرز الذي يمكن استخلاصه من المحتوى؟', options:['استنتاج 1','استنتاج 2','استنتاج 3','استنتاج 4'], correct:2, explanation:'الاستنتاج وارد في الفقرة الختامية' },
    { type:'essay', text:'كيف يمكن توظيف ما ورد في هذا الملف في الاختبار الوطني؟', hint:'فكّر في صياغة السؤال الوزاري المتوقع' },
  ]

  /* ── JSX ── */
  return (
    <div className="page-container" style={{ maxWidth:900 }}>
      <h1 className="section-title">📄 تحليل الملفات بالذكاء الاصطناعي</h1>

      {/* Info banner */}
      <div style={{
        background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)',
        borderRadius:12, padding:'12px 16px', marginBottom:22,
        display:'flex', alignItems:'center', gap:10, fontSize:'0.88rem',
      }}>
        <span style={{ fontSize:'1.4rem' }}>🎁</span>
        <div>
          <strong style={{ color:'var(--success)' }}>أول PDF مجاناً!</strong> بعدها كل ملف يكلف{' '}
          <strong>2 رصيد</strong> فقط. يمكن الملف أن يكون كتاباً مدرسياً، ملزمة، أو نموذج امتحان.
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--primary-l)' : 'var(--border2)'}`,
          borderRadius:20, padding:'48px 24px', textAlign:'center',
          cursor:'pointer', transition:'all 0.25s', marginBottom:28,
          background: dragging ? 'rgba(37,99,176,0.05)' : 'var(--surface)',
          transform: dragging ? 'scale(1.01)' : 'scale(1)',
        }}>
        <input ref={inputRef} type="file" accept=".pdf" multiple style={{ display:'none' }}
          onChange={e => processFiles(e.target.files)} />
        <div style={{ fontSize:'3.5rem', marginBottom:14 }}>
          {dragging ? '📂' : '📄'}
        </div>
        <h3 style={{ fontSize:'1.1rem', marginBottom:8 }}>
          {dragging ? 'أفلت الملف هنا!' : 'اسحب ملف PDF هنا أو انقر للاختيار'}
        </h3>
        <p style={{ color:'var(--text2)', fontSize:'0.85rem', marginBottom:16 }}>
          يدعم: الكتب المدرسية • الملازم • النماذج الوزارية
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', fontSize:'0.78rem', color:'var(--text3)' }}>
          <span>📏 الحد الأقصى: 20 MB</span>
          <span>📑 PDF فقط</span>
          <span>🌐 يدعم العربية والإنجليزية</span>
          <span>🤖 مدعوم بـ Claude AI</span>
        </div>
      </div>

      {/* Files list */}
      {files.length > 0 && (
        <>
          <h2 className="section-title">الملفات المرفوعة</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {files.map(file => (
              <div key={file.id}>
                {/* File card */}
                <div className="card" style={{ padding:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    {/* Icon */}
                    <div style={{
                      width:48, height:48, borderRadius:12, flexShrink:0,
                      background: file.status==='error' ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem',
                    }}>
                      {file.status==='error' ? '⚠️' : '📄'}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'0.92rem', marginBottom:3,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text3)', display:'flex', gap:10 }}>
                        <span>{file.size}</span>
                        {file.pages && <span>{file.pages} صفحة</span>}
                        {file.questions && <span>{file.questions.length} سؤال مولَّد</span>}
                      </div>

                      {/* Progress bar */}
                      {(file.status==='uploading' || file.status==='analyzing') && (
                        <div style={{ marginTop:8 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', color:'var(--text3)', marginBottom:4 }}>
                            <span>{file.status==='uploading' ? '⬆️ جارٍ الرفع...' : '🤖 جارٍ التحليل بالذكاء الاصطناعي...'}</span>
                            <span>{file.progress}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill animate-pulse" style={{ width:`${file.progress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <div style={{
                      padding:'4px 12px', borderRadius:20, fontSize:'0.75rem', fontWeight:700, flexShrink:0,
                      background: file.status==='done'     ? 'rgba(16,185,129,0.12)' :
                                  file.status==='error'    ? 'rgba(239,68,68,0.12)'  :
                                  'rgba(245,158,11,0.12)',
                      color:      file.status==='done'     ? 'var(--success)'  :
                                  file.status==='error'    ? 'var(--accent2)'  :
                                  'var(--accent)',
                    }}>
                      {file.status==='uploading' ? '⬆️ يُرفع' :
                       file.status==='analyzing' ? '⏳ يُحلَّل' :
                       file.status==='done'      ? '✓ مكتمل'  :
                       '✗ خطأ'}
                    </div>

                    {/* Expand toggle */}
                    {file.status === 'done' && (
                      <button onClick={() => setExpanded(p => p===file.id ? null : file.id)} style={{
                        background:'none', border:'none', color:'var(--text2)',
                        cursor:'pointer', fontSize:'1.2rem', padding:4,
                      }}>
                        {expanded===file.id ? '▲' : '▼'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Results panel */}
                {file.status==='done' && expanded===file.id && (
                  <div className="card animate-fade-in" style={{ marginTop:8, padding:22, borderTop:'3px solid var(--primary-l)' }}>

                    {/* Stats row */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:10, marginBottom:20 }}>
                      {[
                        { v: file.pages ?? '—', l:'صفحة محللة',    c:'var(--primary-l)' },
                        { v: file.questions?.length ?? 0, l:'سؤال مولَّد', c:'var(--success)' },
                        { v: file.concepts?.length ?? 0,  l:'مفهوم رئيسي', c:'var(--accent)' },
                        { v: '≈ 30s', l:'وقت التحليل', c:'#60a5fa' },
                      ].map(s => (
                        <div key={s.l} style={{ background:'var(--bg3)', borderRadius:10, padding:12, textAlign:'center' }}>
                          <div style={{ fontFamily:'var(--font-tajawal)', fontSize:'1.4rem', fontWeight:800, color:s.c }}>{s.v}</div>
                          <div style={{ fontSize:'0.7rem', color:'var(--text2)', marginTop:3 }}>{s.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    {file.summary && (
                      <div style={{ marginBottom:18 }}>
                        <div style={{ fontSize:'0.85rem', fontWeight:700, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                          📌 ملخص تلقائي بالذكاء الاصطناعي
                        </div>
                        <div style={{
                          background:'var(--bg3)', borderRadius:10, padding:14,
                          fontSize:'0.88rem', lineHeight:1.85, color:'var(--text2)',
                        }}>
                          {file.summary}
                        </div>
                      </div>
                    )}

                    {/* Key concepts */}
                    {file.concepts && file.concepts.length > 0 && (
                      <div style={{ marginBottom:18 }}>
                        <div style={{ fontSize:'0.85rem', fontWeight:700, marginBottom:8 }}>
                          🔑 المفاهيم الرئيسية
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                          {file.concepts.map((c, i) => (
                            <span key={i} style={{
                              background:'rgba(37,99,176,0.15)', color:'#60a5fa',
                              padding:'4px 12px', borderRadius:20, fontSize:'0.8rem', fontWeight:600,
                            }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Generated questions */}
                    <div>
                      <div style={{ fontSize:'0.85rem', fontWeight:700, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span>❓ أسئلة مولَّدة بالذكاء الاصطناعي</span>
                        <span style={{ fontSize:'0.75rem', color:'var(--text3)', fontWeight:400 }}>
                          يمكن استخدامها مباشرة في الامتحان
                        </span>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                        {(file.questions || SAMPLE_QS).map((q, i) => (
                          <div key={i} style={{
                            background:'var(--bg3)', borderRadius:10, padding:'14px 16px',
                          }}>
                            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                              <span style={{
                                background: q.type==='mcq' ? 'rgba(37,99,176,0.2)' : 'rgba(139,92,246,0.2)',
                                color:      q.type==='mcq' ? '#60a5fa' : '#a78bfa',
                                fontSize:'0.72rem', fontWeight:700, padding:'3px 9px',
                                borderRadius:20, flexShrink:0, marginTop:2,
                              }}>{q.type==='mcq' ? 'MCQ' : 'مقالي'}</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:'0.9rem', fontWeight:600, marginBottom: q.options ? 10 : 0 }}>
                                  {i+1}. {q.text}
                                </div>
                                {q.options && (
                                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                                    {q.options.map((opt, j) => (
                                      <div key={j} style={{
                                        padding:'6px 10px', borderRadius:8,
                                        background: j===q.correct ? 'rgba(16,185,129,0.12)' : 'var(--surface)',
                                        border: `1px solid ${j===q.correct ? 'var(--success)' : 'var(--border)'}`,
                                        fontSize:'0.82rem', color: j===q.correct ? 'var(--success)' : 'var(--text2)',
                                        display:'flex', alignItems:'center', gap:6,
                                      }}>
                                        <span>{['أ','ب','ج','د'][j]})</span>{opt}
                                        {j===q.correct && <span style={{ marginRight:'auto' }}>✓</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.hint && (
                                  <div style={{ fontSize:'0.78rem', color:'var(--accent)', marginTop:8 }}>
                                    💡 {q.hint}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:10, marginTop:18, flexWrap:'wrap' }}>
                      <Link href="/exam" className="btn btn-primary btn-sm">
                        🎯 ابدأ امتحاناً من هذا الملف
                      </Link>
                      <Link href="/tutor" className="btn btn-outline btn-sm">
                        🤖 اسأل المعلم عن محتوى الملف
                      </Link>
                      <button className="btn btn-outline btn-sm"
                        onClick={() => {
                          const qs = (file.questions || SAMPLE_QS)
                            .map((q,i) => `${i+1}. ${q.text}`).join('\n')
                          navigator.clipboard.writeText(qs)
                          toast.success('تم نسخ الأسئلة!')
                        }}>
                        📋 نسخ الأسئلة
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {files.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text2)' }}>
          <div style={{ fontSize:'4rem', marginBottom:16 }}>📚</div>
          <h3 style={{ marginBottom:8 }}>لم ترفع أي ملف بعد</h3>
          <p style={{ fontSize:'0.88rem', marginBottom:20 }}>
            ارفع كتاباً مدرسياً أو ملزمة وسيحللها الذكاء الاصطناعي ويولّد أسئلة منها فوراً
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            {['📕 كتاب اللغة الإنجليزية','📗 كتاب اللغة العربية','📘 كتاب الحاسوب','📋 نموذج امتحان وزاري'].map(t => (
              <span key={t} style={{
                background:'var(--bg3)', border:'1px solid var(--border)',
                padding:'6px 14px', borderRadius:20, fontSize:'0.82rem',
              }}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
