// frontend/src/app/exam/take/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExamTakePage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [question, setQuestion] = useState<any>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600); // 60 دقيقة افتراضية
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [finished, setFinished] = useState(false);

  // 🔹 تحميل السؤال
  const loadQuestion = useCallback(async (index: number) => {
    try {
      const res = await api.get(`/exams/${id}/question/${index}`);
      setQuestion(res.data);
      setSelected(res.data.selectedOption);
      setCurrentIndex(index);
      setShowHint(false);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { loadQuestion(0); }, [loadQuestion]);

  // 🔹 المؤقت
  useEffect(() => {
    if (finished || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, timeLeft]);

  // 🔹 إرسال الإجابة
  const submitAnswer = async (optionIndex: number) => {
    setSelected(optionIndex);
    try {
      await api.post(`/exams/${id}/question/${currentIndex}/answer`, { selectedOption: optionIndex });
    } catch (err) {
      console.error('فشل حفظ الإجابة', err);
    }
  };

  // 🔹 إنهاء الامتحان
  const handleFinish = async () => {
    if (finished) return;
    setFinished(true);
    try {
      const result = await api.post(`/exams/${id}/finish`);
      router.push(`/exam/results/${id}?score=${result.data.score}&correct=${result.data.correctAnswers}`);
    } catch (err) {
      console.error('خطأ في الإنهاء', err);
    }
  };

  // 🔹 تنسيق الوقت
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading || !question) return <div className="min-h-screen flex items-center justify-center">⏳ جاري تحميل الامتحان...</div>;
  if (finished) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* 📊 شريط التقدم والمؤقت */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-4 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            السؤال {currentIndex + 1} من {question.total}
          </span>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${((currentIndex + 1) / question.total) * 100}%` }} />
          </div>
        </div>
        <div className={`text-lg font-mono font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {/* 📝 بطاقة السؤال */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8"
      >
        <div className="flex justify-between items-start mb-6">
          <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
            {question.difficulty === 'EASY' ? '😊 سهل' : question.difficulty === 'MEDIUM' ? '⚖️ متوسط' : '🔥 صعب'}
          </span>
          <button onClick={() => setShowHint(!showHint)} className="text-blue-600 text-sm hover:underline">💡 تلميح</button>
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-8 leading-relaxed">{question.question}</h2>

        {showHint && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800">
            💡 تذكر: اقرأ السؤال جيداً واستبعد الخيارات الواضحة خطأً أولاً.
          </motion.div>
        )}

        <div className="space-y-3 mb-8">
          {question.options.map((opt: any, idx: number) => (
            <button
              key={idx}
              onClick={() => submitAnswer(idx)}
              className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                selected === idx
                  ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <span className="inline-block w-6 h-6 rounded-full border-2 border-gray-300 mr-3 text-center text-sm leading-5">
                {String.fromCharCode(65 + idx)}
              </span>
              {opt.text}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button
            disabled={currentIndex === 0}
            onClick={() => loadQuestion(currentIndex - 1)}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            ← السابق
          </button>

          <div className="flex gap-3">
            <button onClick={() => api.post(`/exams/${id}/ai/eval`, { questionIndex: currentIndex })} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition">
              🤖 تقييم ذكي
            </button>
            {currentIndex < question.total - 1 ? (
              <button onClick={() => loadQuestion(currentIndex + 1)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                التالي →
              </button>
            ) : (
              <button onClick={handleFinish} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
                ✅ إنهاء الامتحان
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* 🛡️ منع الغش البسيط */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => { if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase()))) e.preventDefault(); });
      `}} />
    </div>
  );
}