import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';
import { CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentService {
  private readonly PAYTABS_URL = process.env.PAYTABS_API_URL || 'https://secure-egypt.paytabs.com/payment/request';
  private readonly API_KEY = process.env.PAYTABS_API_KEY;
  private readonly PROFILE_ID = process.env.PAYTABS_PROFILE_ID;
  private readonly CALLBACK_URL = process.env.PAYMENT_WEBHOOK_URL;
  private readonly RETURN_URL = process.env.PAYMENT_RETURN_URL;

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService
  ) {}

  async initiateTopUp(userId: string, dto: CreatePaymentDto) {
    // 1. فحص التكرار
    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: dto.idempotencyKey }
    });
    if (existing) {
      throw new ConflictException('تمت معالجة هذه العملية مسبقاً');
    }

    // 2. إنشاء معاملة معلقة
    const tx = await this.prisma.transaction.create({
       {
        userId,
        amount: dto.amount,
        type: 'CREDIT',
        description: `شحن رصيد - ${dto.paymentMethod}`,
        idempotencyKey: dto.idempotencyKey,
        paymentMethod: dto.paymentMethod,
        status: 'PENDING',
        metadata: { cart_id: `topup_${Date.now()}_${userId.slice(0,8)}` }
      }
    });

    // 3. استدعاء PayTabs
    const payload = {
      profile_id: this.PROFILE_ID,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: tx.metadata.cart_id,
      cart_description: `شحن منصة النجاح - ${dto.amount} د.ع`,
      cart_currency: 'IQD',
      cart_amount: Number(dto.amount),
      callback: this.CALLBACK_URL,
      return: this.RETURN_URL,
      customer_details: { name: 'طالب منصة النجاح', email: dto.userEmail }
    };

    try {
      const res = await fetch(this.PAYTABS_URL, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${this.API_KEY}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`PayTabs Error: ${res.status}`);
      const data = await res.json();

      // حفظ مرجع البوابة
      await this.prisma.transaction.update({
        where: { id: tx.id },
         { gatewayRef: data.tran_ref }
      });

      return { success: true, redirectUrl: data.redirect_url, transactionId: tx.id };
    } catch (err) {
      await this.walletService.failTransaction(tx.id, err.message);
      throw new BadRequestException('فشل في إنشاء عملية الدفع. يرجى المحاولة لاحقاً');
    }
  }

  // معالجة الويب هوك من PayTabs
  async handleWebhook(payload: any, signature: string) {
    // التحقق من التوقيع (HMAC-SHA256)
    const expectedSig = crypto.createHmac('sha256', process.env.PAYTABS_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSig) {
      throw new Error('توقيع الويب هوك غير صالح');
    }

    const { cart_id, payment_result, tran_ref } = payload;
    const tx = await this.prisma.transaction.findFirst({
      where: { metadata: { path: ['cart_id'], equals: cart_id } }
    });

    if (!tx) return { status: 'ignored' };

    if (payment_result === 'A') { // Approved
      await this.walletService.creditWallet(tx.userId, tx.id, Number(tx.amount));
    } else {
      await this.walletService.failTransaction(tx.id, `Payment result: ${payment_result}`, payload);
    }

    return { status: 'processed', transactionId: tx.id };
  }
}