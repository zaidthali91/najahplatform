// backend/src/routes/payment.routes.v2.js
// ============================================================
// نظام الدفع الكامل — ZainCash + FIB + Stripe + Webhooks
// ============================================================
const express = require('express')
const Stripe  = require('stripe')
const { supabase } = require('../config/supabase')
const { authenticate } = require('../middleware/auth.middleware')
const { ZainCashService, FIBService } = require('../services/payment.service')
const router = express.Router()

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

// باقات الرصيد بالدينار العراقي
const PACKAGES = {
  starter:  { credits:50,  priceIQD:2500,  priceUSD:1.65, name:'باقة المبتدئ'  },
  standard: { credits:150, priceIQD:5000,  priceUSD:3.30, name:'الباقة القياسية'},
  premium:  { credits:400, priceIQD:10000, priceUSD:6.60, name:'الباقة المميزة' },
}

// ===== GET /api/payments/packages =====
router.get('/packages', (_req, res) => res.json({ packages: PACKAGES }))

// ===== POST /api/payments/initiate =====
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { package_id, payment_method } = req.body
    const pkg = PACKAGES[package_id]
    if (!pkg) return res.status(400).json({ error: 'باقة غير موجودة' })

    const validMethods = ['zaincash','fib','visa','master','asia_hawala']
    if (!validMethods.includes(payment_method))
      return res.status(400).json({ error: 'طريقة دفع غير مدعومة' })

    // إنشاء سجل معاملة
    const { data: txn } = await supabase.from('transactions').insert({
      user_id:        req.user.id,
      type:           'purchase',
      amount:         pkg.credits,
      description:    `شراء ${pkg.credits} رصيد — ${pkg.name}`,
      payment_method,
      payment_amount: pkg.priceIQD,
      payment_status: 'pending',
    }).select().single()

    const redirectBase = `${process.env.FRONTEND_URL}/payment`
    let paymentUrl     = null
    let extra          = {}

    // ──────────── ZainCash ────────────
    if (payment_method === 'zaincash') {
      if (!process.env.ZAINCASH_MERCHANT_ID) {
        // وضع التطوير
        paymentUrl = `${redirectBase}/demo?method=zaincash&txn=${txn.id}&amount=${pkg.priceIQD}`
      } else {
        const zc = await ZainCashService.createPayment({
          amount:      pkg.priceIQD,
          orderId:     txn.id,
          redirectUrl: `${redirectBase}/zaincash-callback`,
          serviceType: `منصة النجاح — ${pkg.credits} رصيد`,
        })
        paymentUrl = zc.url
        extra.zcTransactionId = zc.transactionId
      }
    }

    // ──────────── FIB Bank ────────────
    else if (payment_method === 'fib') {
      if (!process.env.FIB_CLIENT_ID) {
        paymentUrl = `${redirectBase}/demo?method=fib&txn=${txn.id}&amount=${pkg.priceIQD}`
      } else {
        const fib = await FIBService.createPayment({
          amountIQD:   pkg.priceIQD,
          orderId:     txn.id,
          callbackUrl: `${process.env.BACKEND_URL}/api/payments/fib-webhook`,
        })
        extra = {
          readableCode:     fib.readableCode,
          personalAppLink:  fib.personalAppLink,
          businessAppLink:  fib.businessAppLink,
        }
        paymentUrl = fib.personalAppLink
      }
    }

    // ──────────── Visa / Mastercard (Stripe) ────────────
    else if (['visa','master'].includes(payment_method)) {
      if (!stripe) {
        paymentUrl = `${redirectBase}/demo?method=stripe&txn=${txn.id}&amount=${pkg.priceIQD}`
      } else {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency:     'usd',
              product_data: { name: pkg.name, description: `${pkg.credits} رصيد — منصة النجاح` },
              unit_amount:  Math.round(pkg.priceUSD * 100),
            },
            quantity: 1,
          }],
          mode:        'payment',
          success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&txn=${txn.id}`,
          cancel_url:  `${process.env.FRONTEND_URL}/pricing`,
          metadata:    { transaction_id: txn.id, user_id: req.user.id, credits: pkg.credits },
          customer_email: req.user.email,
        })
        paymentUrl = session.url
        extra.stripeSessionId = session.id
      }
    }

    // ──────────── أسيا حوالة ────────────
    else if (payment_method === 'asia_hawala') {
      // يتطلب تسوية يدوية — نوجّه للواتساب
      paymentUrl = `https://wa.me/${process.env.SUPPORT_PHONE}?text=طلب شحن رصيد — الباقة: ${pkg.name} — المعرف: ${txn.id}`
    }

    // تحديث السجل برقم مرجع الدفع
    await supabase.from('transactions').update({
      payment_ref: extra.zcTransactionId || extra.stripeSessionId || null
    }).eq('id', txn.id)

    res.json({ transaction_id: txn.id, payment_url: paymentUrl, package: pkg, ...extra })

  } catch (err) {
    console.error('Payment initiate error:', err)
    res.status(500).json({ error: 'فشل بدء عملية الدفع', detail: err.message })
  }
})

// ===== POST /api/payments/zaincash-callback =====
// معالجة العودة من ZainCash
router.post('/zaincash-callback', async (req, res) => {
  try {
    const { token } = req.body
    const payment   = ZainCashService.verifyCallback(token)

    if (payment.status !== 'paid') {
      return res.status(400).json({ error: 'الدفع لم يكتمل', status: payment.status })
    }

    await completePayment(payment.orderId, payment.transactionId)
    res.json({ success: true, message: 'تم الدفع بنجاح' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ===== POST /api/payments/fib-webhook =====
router.post('/fib-webhook', async (req, res) => {
  try {
    const { paymentId, status } = req.body
    if (status !== 'PAID') return res.sendStatus(200)

    // البحث عن المعاملة بمرجع FIB
    const { data: txn } = await supabase.from('transactions')
      .select('id').eq('payment_ref', paymentId).single()
    if (txn) await completePayment(txn.id, paymentId)
    res.sendStatus(200)
  } catch { res.sendStatus(200) }
})

// ===== POST /api/payments/stripe-webhook =====
router.post('/stripe-webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe) return res.sendStatus(200)
    try {
      const sig   = req.headers['stripe-signature']
      const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        const txnId   = session.metadata.transaction_id
        if (txnId) await completePayment(txnId, session.id)
      }
      res.sendStatus(200)
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  }
)

// ===== POST /api/payments/verify =====
// التحقق اليدوي (للتطوير أو أسيا حوالة)
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { transaction_id, payment_ref } = req.body

    const { data: txn } = await supabase.from('transactions')
      .select('*').eq('id', transaction_id).eq('user_id', req.user.id).single()
    if (!txn) return res.status(404).json({ error: 'معاملة غير موجودة' })
    if (txn.payment_status === 'completed') {
      return res.json({ message: 'تم الدفع مسبقاً', already_done: true })
    }

    const result = await completePayment(transaction_id, payment_ref || 'MANUAL')
    res.json({ message: `تم إضافة ${txn.amount} رصيد!`, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== دالة مساعدة: إكمال الدفع وإضافة الرصيد =====
async function completePayment(transactionId, paymentRef) {
  const { data: txn } = await supabase.from('transactions')
    .select('user_id, amount, payment_status')
    .eq('id', transactionId).single()

  if (!txn || txn.payment_status === 'completed') return { already_done: true }

  // تحديث حالة المعاملة
  await supabase.from('transactions').update({
    payment_status: 'completed',
    payment_ref:    paymentRef,
  }).eq('id', transactionId)

  // جلب الرصيد الحالي وإضافة الجديد
  const { data: user } = await supabase.from('users')
    .select('credits, full_name, email').eq('id', txn.user_id).single()

  const newCredits = (user?.credits || 0) + txn.amount
  await supabase.from('users').update({ credits: newCredits }).eq('id', txn.user_id)

  // إشعار المستخدم
  await supabase.from('notifications').insert({
    user_id: txn.user_id,
    title:   `تم إضافة ${txn.amount} رصيد بنجاح! 💎`,
    message: `رصيدك الحالي: ${newCredits} رصيد`,
    type:    'system', icon: '💳',
  })

  return { new_credits: newCredits, added: txn.amount }
}

// ===== GET /api/payments/history =====
router.get('/history', authenticate, async (req, res) => {
  const { data } = await supabase.from('transactions')
    .select('id,type,amount,description,payment_method,payment_amount,payment_status,created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false }).limit(30)
  res.json({ transactions: data || [] })
})

module.exports = router
