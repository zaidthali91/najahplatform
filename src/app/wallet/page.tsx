// frontend/src/app/wallet/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCardIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const [balRes, histRes] = await Promise.all([
        api.get('/payments/balance'),
        api.get('/payments/history')
      ]);
      setBalance(balRes.data.balance);
      setHistory(histRes.data.transactions);
    } catch {
      setError('فشل تحميل بيانات المحفظة');
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const val = parseInt(amount);
    if (!val || val < 1000) {
      setError('الحد الأدنى للشحن هو 1,000 د.ع');
      return;
    }

    setLoading(true);
    try {
      const idempotencyKey = `topup_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const res = await api.post('/payments/topup', {
        amount: val,
        paymentMethod: 'CARD',
        idempotencyKey
      }, {
        headers: { 'X-Idempotency-Key': idempotencyKey }
      });

      if (res.data.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل بدء عملية الدفع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* 💳 بطاقة الرصيد */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white mb-8 shadow-lg"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm mb-1">الرصيد المتاح</p>
              <h1 className="text-4xl font-bold tracking-wide">{balance.toLocaleString()} <span className="text-2xl font-normal">د.ع</span></h1>
            </div>
            <button onClick={loadWalletData} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-6 flex gap-3">
            <button className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur py-3 rounded-xl font-medium transition flex items-center justify-center gap-2">
              <CreditCardIcon className="w-5 h-5" /> شحن سريع
            </button>
            <button className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur py-3 rounded-xl font-medium transition">
              تحويل لصديق
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 💰 نموذج الشحن */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">🔋 شحن الرصيد</h3>
            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">المبلغ (د.ع)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="مثال: 10000"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[5000, 10000, 25000, 50000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className="flex-1 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                  >
                    {val.toLocaleString()}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}
              <button
                type="submit"
                disabled={loading || !amount}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                {loading ? 'جاري التوجيه لبوابة الدفع...' : '💳 المتابعة للدفع'}
              </button>
              <p className="text-xs text-gray-500 text-center">🔒 دفع آمن عبر PayTabs • دعم Mastercard/Visa</p>
            </form>
          </div>

          {/* 📜 سجل المعاملات */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">📜 سجل المعاملات</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              <AnimatePresence>
                {history.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">لا توجد معاملات بعد</p>
                ) : (
                  history.map((tx: any) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          tx.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                          tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {tx.status === 'COMPLETED' ? <CheckCircleIcon className="w-5 h-5"/> :
                           tx.status === 'PENDING' ? <ClockIcon className="w-5 h-5"/> : <XCircleIcon className="w-5 h-5"/>}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{tx.description}</p>
                          <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString('ar-IQ')}</p>
                        </div>
                      </div>
                      <span className={`font-bold ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}{Number(tx.amount).toLocaleString()} د.ع
                      </span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}