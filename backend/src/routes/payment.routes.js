// src/routes/payment.routes.js
const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth.middleware');
const router = express.Router();

// باقات الرصيد
const CREDIT_PACKAGES = {
  starter:   { credits: 50,  price_iqd: 2500,  name: 'باقة المبتدئ' },
  standard:  { credits: 150, price_iqd: 5000,  name: 'الباقة القياسية' },
  premium:   { credits: 400, price_iqd: 10000, name: 'الباقة المميزة' },
};

// ===== GET /api/payments/packages =====
router.get('/packages', (req, res) => {
  res.json({ packages: CREDIT_PACKAGES });
});

// ===== POST /api/payments/initiate =====
// بدء عملية الدفع
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { package_id, payment_method } = req.body;

    const pkg = CREDIT_PACKAGES[package_id];
    if (!pkg) return res.status(400).json({ error: 'باقة غير موجودة' });

    if (!['zaincash','fib','visa','master','asia_hawala'].includes(payment_method)) {
      return res.status(400).json({ error: 'طريقة دفع غير مدعومة' });
    }

    // إنشاء سجل معاملة بانتظار الدفع
    const { data: transaction, error } = await supabase.from('transactions').insert({
      user_id:        req.user.id,
      type:           'purchase',
      amount:         pkg.credits,
      description:    `شراء ${pkg.credits} رصيد — ${pkg.name}`,
      payment_method,
      payment_amount: pkg.price_iqd,
      payment_status: 'pending',
    }).select().single();
    if (error) throw error;

    let paymentUrl = null;

    // ===== ZainCash =====
    if (payment_method === 'zaincash') {
      // تكامل ZainCash الحقيقي
      // const jwt = require('jsonwebtoken');
      // const token = jwt.sign({
      //   amount: pkg.price_iqd,
      //   serviceType: 'منصة النجاح — شحن رصيد',
      //   msisdn: process.env.ZAINCASH_MSISDN,
      //   orderId: transaction.id,
      //   redirectUrl: `${process.env.FRONTEND_URL}/payment/verify`,
      //   iat: Math.floor(Date.now() / 1000),
      // }, process.env.ZAINCASH_SECRET_KEY);
      //
      // const response = await fetch(process.env.ZAINCASH_API_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token, merchantId: process.env.ZAINCASH_MERCHANT_ID, lang: 'ar' }),
      // });
      // const data = await response.json();
      // paymentUrl = `https://api.zaincash.iq/transaction/pay?id=${data.id}`;

      // === محاكاة في بيئة التطوير ===
      paymentUrl = `https://sandbox.zaincash.iq/pay?order=${transaction.id}&amount=${pkg.price_iqd}`;
    }

    // ===== FIB =====
    else if (payment_method === 'fib') {
      // const fibRes = await fetch(`${process.env.FIB_API_URL}/protected/v1/payments`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${fibToken}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     monetaryValue: { amount: pkg.price_iqd, currency: 'IQD' },
      //     statusCallbackUrl: `${process.env.BACKEND_URL}/api/payments/fib-callback`,
      //     description: pkg.name,
      //   }),
      // });
      // const fibData = await fibRes.json();
      // paymentUrl = fibData.readableCode;

      paymentUrl = `https://sandbox.fib.iq/pay?ref=${transaction.id}`;
    }

    // ===== بطاقة ائتمانية (Stripe) =====
    else if (['visa','master'].includes(payment_method)) {
      // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      // const session = await stripe.checkout.sessions.create({
      //   payment_method_types: ['card'],
      //   line_items: [{ price_data: {
      //     currency: 'usd',
      //     product_data: { name: pkg.name },
      //     unit_amount: Math.round(pkg.price_iqd / 1500), // تحويل دينار → دولار تقريبي
      //   }, quantity: 1 }],
      //   mode: 'payment',
      //   success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      //   cancel_url:  `${process.env.FRONTEND_URL}/payment/cancel`,
      //   metadata: { transaction_id: transaction.id, user_id: req.user.id, credits: pkg.credits },
      // });
      // paymentUrl = session.url;

      paymentUrl = `https://checkout.stripe.com/pay/sandbox_${transaction.id}`;
    }

    res.json({
      transaction_id: transaction.id,
      payment_url:    paymentUrl,
      package:        pkg,
      message:        'انتقل لإتمام الدفع',
    });

  } catch (err) {
    res.status(500).json({ error: 'فشل بدء عملية الدفع', detail: err.message });
  }
});

// ===== POST /api/payments/verify =====
// التحقق من الدفع وإضافة الرصيد
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { transaction_id, payment_ref } = req.body;

    const { data: txn } = await supabase.from('transactions')
      .select('*').eq('id', transaction_id).eq('user_id', req.user.id).single();

    if (!txn) return res.status(404).json({ error: 'المعاملة غير موجودة' });
    if (txn.payment_status === 'completed') return res.status(200).json({ message: 'تم الدفع مسبقاً' });

    // === التحقق من بوابة الدفع هنا ===
    // في الإنتاج: تحقق من بوابة ZainCash أو FIB أو Stripe

    // تحديث المعاملة
    await supabase.from('transactions').update({
      payment_status: 'completed',
      payment_ref:    payment_ref || `SIM_${Date.now()}`,
    }).eq('id', transaction_id);

    // إضافة الرصيد للمستخدم
    const { data: user } = await supabase.from('users').select('credits').eq('id', req.user.id).single();
    const newCredits = (user.credits || 0) + txn.amount;

    await supabase.from('users').update({ credits: newCredits }).eq('id', req.user.id);

    // إشعار
    await supabase.from('notifications').insert({
      user_id: req.user.id,
      title:   `تم إضافة ${txn.amount} رصيد بنجاح! 💎`,
      message: `رصيدك الحالي: ${newCredits}`,
      type:    'system', icon: '💳',
    });

    res.json({
      message:     `تم إضافة ${txn.amount} رصيد بنجاح!`,
      new_credits: newCredits,
    });

  } catch (err) {
    res.status(500).json({ error: 'فشل التحقق من الدفع', detail: err.message });
  }
});

// ===== Webhooks =====
// POST /api/payments/zaincash-webhook
router.post('/zaincash-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // التحقق من صحة الطلب من ZainCash وتحديث الرصيد
  res.sendStatus(200);
});

// POST /api/payments/stripe-webhook
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // معالجة أحداث Stripe
  res.sendStatus(200);
});

// ===== GET /api/payments/history =====
router.get('/history', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('transactions')
      .select('id, type, amount, description, payment_method, payment_amount, payment_status, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    res.json({ transactions: data });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب السجل المالي' });
  }
});

module.exports = router;
