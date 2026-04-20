// backend/src/services/zaincash.service.js
// ============================================================
// تكامل ZainCash الحقيقي — بوابة الدفع العراقية
// ============================================================
const jwt    = require('jsonwebtoken')
const crypto = require('crypto')

class ZainCashService {

  /**
   * إنشاء رابط دفع ZainCash
   * @param {Object} params
   * @param {number}  params.amount      - المبلغ بالدينار العراقي
   * @param {string}  params.orderId     - معرف الطلب الداخلي
   * @param {string}  params.redirectUrl - رابط إعادة التوجيه بعد الدفع
   * @param {string}  params.serviceType - وصف الخدمة
   * @returns {Promise<{url: string, transactionId: string}>}
   */
  async createPayment({ amount, orderId, redirectUrl, serviceType = 'منصة النجاح — شحن رصيد' }) {
    try {
      const data = {
        amount,
        serviceType,
        msisdn:      process.env.ZAINCASH_MSISDN,
        orderId,
        redirectUrl,
        iat:         Math.floor(Date.now() / 1000),
        exp:         Math.floor(Date.now() / 1000) + (60 * 60), // ساعة
      }

      // إنشاء JWT موقّع بمفتاح ZainCash
      const token = jwt.sign(data, process.env.ZAINCASH_SECRET_KEY)

      // إرسال الطلب لـ ZainCash API
      const response = await fetch(process.env.ZAINCASH_API_URL + '/transaction/init', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          merchantId: process.env.ZAINCASH_MERCHANT_ID,
          lang:       'ar',
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`ZainCash API error: ${err}`)
      }

      const result = await response.json()
      if (!result.id) throw new Error('لم يُعادَ معرف المعاملة من ZainCash')

      const paymentUrl = `${process.env.ZAINCASH_API_URL}/transaction/pay?id=${result.id}`

      return { url: paymentUrl, transactionId: result.id }

    } catch (err) {
      throw new Error(`فشل إنشاء رابط ZainCash: ${err.message}`)
    }
  }

  /**
   * التحقق من نتيجة الدفع القادمة من ZainCash
   * عندما يعود المستخدم من بوابة الدفع
   * @param {string} token - التوكن المُعاد من ZainCash
   * @returns {{status, orderId, amount, transactionId}}
   */
  verifyCallback(token) {
    try {
      const decoded = jwt.verify(token, process.env.ZAINCASH_SECRET_KEY)
      return {
        status:        decoded.status,      // 'paid' | 'failed' | 'cancelled'
        orderId:       decoded.orderId,
        amount:        decoded.amount,
        transactionId: decoded.id,
        msisdn:        decoded.msisdn,      // رقم هاتف الدافع
      }
    } catch {
      throw new Error('توكن ZainCash غير صالح أو منتهي')
    }
  }

  /**
   * التحقق من حالة معاملة معينة
   * @param {string} transactionId
   */
  async checkStatus(transactionId) {
    const data    = { id: transactionId, iat: Math.floor(Date.now()/1000) }
    const token   = jwt.sign(data, process.env.ZAINCASH_SECRET_KEY)
    const res     = await fetch(`${process.env.ZAINCASH_API_URL}/transaction/get`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, merchantId: process.env.ZAINCASH_MERCHANT_ID }),
    })
    if (!res.ok) throw new Error('فشل الاستعلام عن حالة المعاملة')
    return res.json()
  }
}

module.exports = new ZainCashService()


// ============================================================
// backend/src/services/fib.service.js
// First Iraqi Bank — بنك الرافدين العراقي
// ============================================================
class FIBService {
  #accessToken = null
  #tokenExpiry  = 0

  /** الحصول على Access Token من FIB */
  async #getToken() {
    if (this.#accessToken && Date.now() < this.#tokenExpiry) {
      return this.#accessToken
    }
    const res = await fetch(`${process.env.FIB_API_URL}/auth/realms/fib-online-shop/protocol/openid-connect/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     process.env.FIB_CLIENT_ID,
        client_secret: process.env.FIB_CLIENT_SECRET,
      }),
    })
    if (!res.ok) throw new Error('فشل الحصول على FIB Token')
    const data       = await res.json()
    this.#accessToken = data.access_token
    this.#tokenExpiry  = Date.now() + (data.expires_in - 30) * 1000
    return this.#accessToken
  }

  /**
   * إنشاء طلب دفع FIB
   * @param {number} amountIQD  - المبلغ بالدينار
   * @param {string} orderId    - معرف الطلب
   * @param {string} callbackUrl
   */
  async createPayment({ amountIQD, orderId, callbackUrl }) {
    const token = await this.#getToken()
    const res = await fetch(`${process.env.FIB_API_URL}/protected/v1/payments`, {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${token}`,
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({
        monetaryValue: { amount: amountIQD, currency: 'IQD' },
        statusCallbackUrl: callbackUrl,
        description: `منصة النجاح — رصيد (طلب ${orderId})`,
      }),
    })
    if (!res.ok) throw new Error('فشل إنشاء دفعة FIB')
    const data = await res.json()
    return {
      paymentId:    data.paymentId,
      readableCode: data.readableCode,    // كود يُعرض للمستخدم
      personalAppLink:   data.personalAppLink,
      businessAppLink:   data.businessAppLink,
      corporateAppLink:  data.corporateAppLink,
    }
  }

  /** التحقق من حالة الدفع */
  async checkStatus(paymentId) {
    const token = await this.#getToken()
    const res   = await fetch(`${process.env.FIB_API_URL}/protected/v1/payments/${paymentId}/status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('فشل الاستعلام عن حالة الدفع FIB')
    return res.json()  // { status: 'PAID' | 'UNPAID' | 'DECLINED' }
  }

  /** إلغاء دفعة */
  async cancelPayment(paymentId) {
    const token = await this.#getToken()
    await fetch(`${process.env.FIB_API_URL}/protected/v1/payments/${paymentId}/cancel`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })
  }
}

module.exports = { ZainCashService: new ZainCashService(), FIBService: new FIBService() }
