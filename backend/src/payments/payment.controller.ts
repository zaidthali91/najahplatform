import { Controller, Post, Body, Get, Query, UseGuards, Req, Headers, RawBodyRequest } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/payment.dto';
import { IdempotencyGuard } from '../common/guards/idempotency.guard';

@Controller('payments')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private walletService: WalletService
  ) {}

  @UseGuards(JwtAuthGuard, IdempotencyGuard)
  @Post('topup')
  async topUp(@Req() req, @Body() dto: CreatePaymentDto) {
    return this.paymentService.initiateTopUp(req.user.userId, {
      ...dto,
      userEmail: req.user.email
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('balance')
  async getBalance(@Req() req) {
    return this.walletService.getBalance(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(@Req() req, @Query('page') page: number = 1) {
    return this.walletService.getHistory(req.user.userId, page);
  }

  // ويب هوك PayTabs (بدون حماية JWT، يتطلب توقيع)
  @Post('webhooks/paytabs')
  async handlePaytabsWebhook(@Headers('authorization') signature: string, @RawBody() rawBody: Buffer) {
    const payload = JSON.parse(rawBody.toString());
    // إزالة Bearer prefix إذا وجد
    const cleanSig = signature?.startsWith('Bearer ') ? signature.slice(7) : signature;
    return this.paymentService.handleWebhook(payload, cleanSig);
  }
}