// frontend/src/app/ai-tutor/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperClipIcon, ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function AiTutorPage() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'ai', content: 'مرحباً! أنا معلمك الذكي 🎓\nيمكنني مساعدتك في: شرح القوانين، حل المسائل، تصحيح الإجابات، أو تحليل ملفات PDF.\nما المادة التي تدرسها اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [subject, setSubject] = useState('ARABIC');
  const [loading, setLoading] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai-proxy/chat', { question: text, subject });
      setMessages(prev => [...prev, { role: 'ai', content: res.data.answer, related: res.data.related_topics }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '⚠️ حدث خطأ أثناء الاتصال بالمعلم. حاول مرة أخرى.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      'شرح': 'اشرح هذا المفهوم بمثال عملي وخطوات واضحة',
      'قوانين': 'ما أهم القوانين والقواعد المرتبطة بهذا الموضوع؟',
      'أخطاء': 'ما الأخطاء الشائعة التي يقع فيها الطلاب في هذا الباب؟',
      'تمرين': 'أعطني 3 أسئلة تدريبية متدرجة الصعوبة مع الحل'
    };
    sendMessage(prompts[action] || action);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 flex flex-col">
      {/* 🎓 Header مطابق للقالب */}
      <header className="bg-white/90 backdrop-blur border-b px-4 py-3 flex justify-between items-center sticky top-0 z-30">
        <h1 className="text-xl font-bold flex items-center gap-2">🤖 <span>المعلم الذكي</span></h1>
        <select 
          value={subject} 
          onChange={(e) => setSubject(e.target.value)}
          className="bg-gray-100 border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
        >
          <option value="ARABIC">📖 اللغة العربية</option>
          <option value="INELT">🔤 اللغة الإنكليزية</option>
          <option value="INCPT">💻 الحاسوب</option>
        </select>
      </header>

      {/* 💬 منطقة المحادثة */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 overflow-y-auto">
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-4 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white shadow-sm border border-gray-100 rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.related && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {msg.related.map((t: string) => (
                        <span key={t} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex justify-end">
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 🛠️ أزرار سريعة (مطابقة للقالب) */}
      <div className="bg-white border-t px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
        {['📝 اشرح بمثال', '📌 القوانين', '💪 تمرين', '⚠️ أخطاء شائعة', '📄 رفع PDF'].map(btn => (
          <button
            key={btn}
            onClick={() => btn.includes('PDF') ? setShowPdfModal(true) : handleQuickAction(btn.split(' ')[1])}
            className="flex-shrink-0 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition"
          >
            {btn}
          </button>
        ))}
      </div>

      {/* ⌨️ شريط الإدخال */}
      <footer className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button onClick={() => setShowPdfModal(true)} className="p-3 text-gray-500 hover:text-blue-600 transition">
            <PaperClipIcon className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="اكتب سؤالك هنا... مثال: ما إعراب الجملة: 'كان الطالب مجتهداً'؟"
            className="flex-1 bg-gray-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            disabled={loading}
          />
          <button 
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition"
          >
            <SparklesIcon className="w-5 h-5" />
            إرسال
          </button>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">🔒 مجاني 10 أسئلة/يوم • بعدها 500 د.ع/سؤال</p>
      </footer>

      {/* 📄 نافذة رفع PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPdfModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">📄 رفع ملف للتحليل الذكي</h3>
            <p className="text-sm text-gray-600 mb-4">سنستخرج الأسئلة، نلخص المحتوى، ونولد تدريبات منهجية.</p>
            <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition">
              <input type="file" accept=".pdf" className="hidden" onChange={() => {}} />
              <span className="text-3xl mb-2 block">📤</span>
              <span className="text-sm text-gray-700">اضغط لاختيار ملف PDF</span>
            </label>
            <button onClick={() => setShowPdfModal(false)} className="mt-4 w-full py-2 bg-gray-100 rounded-lg hover:bg-gray-200">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}
