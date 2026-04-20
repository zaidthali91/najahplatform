import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, currency: true } // أضف currency إذا لزم
    });
    return { balance: user?.walletBalance || 0, currency: 'IQD' };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, amount: true, type: true, description: true,
          status: true, paymentMethod: true, createdAt: true, gatewayRef: true
        }
      }),
      this.prisma.transaction.count({ where: { userId } })
    ]);
    return { transactions, total, page, totalPages: Math.ceil(total / limit) };
  }

  // عملية ذرية لتحديث الرصيد + تسجيل المعاملة
  async creditWallet(userId: string, transactionId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: amount } }
      });

      return tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' }
      });
    });
  }

  async failTransaction(transactionId: string, reason: string, gatewayResponse?: any) {
    return this.prisma.transaction.update({
      where: { id: transactionId },
       {
        status: 'FAILED',
        gatewayResponse: gatewayResponse || null,
        description: `فشل الدفع: ${reason}`
      }
    });
  }
}