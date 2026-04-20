import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AiProxyService {
  constructor(
    private http: HttpService,
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async chat(userId: string, question: string, subject: string) {
    const cacheKey = `ai:chat:${subject}:${Buffer.from(question).toString('base64').slice(0, 32)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // خصم رصيد (10 أسئلة مجانية يومياً، الباقي 500 د.ع)
    await this.checkAndDeductCredits(userId, subject, 'chat');

    const { data } = await firstValueFrom(
      this.http.post(`${process.env.AI_SERVICE_URL}/api/v1/chat`, 
        { question, subject, user_id: userId },
        { headers: { Authorization: `Bearer ${process.env.AI_INTERNAL_SECRET}` } }
      ).pipe(catchError(err => {
        throw new HttpException('فشل الاتصال بالمعلم الذكي', HttpStatus.SERVICE_UNAVAILABLE);
      }))
    );

    await this.redis.set(cacheKey, JSON.stringify(data), 3600); // كاش ساعة واحدة
    return data;
  }

  async gradeAnswer(userId: string, question: string, answer: string, subject: string) {
    await this.checkAndDeductCredits(userId, subject, 'grade');
    const { data } = await firstValueFrom(
      this.http.post(`${process.env.AI_SERVICE_URL}/api/v1/grade`, { question, answer, subject })
    );
    return data;
  }

  async analyzePdf(userId: string, file: Express.Multer.File, subject: string) {
    await this.checkAndDeductCredits(userId, subject, 'pdf');
    const formData = new FormData();
    formData.append('file', file.buffer, file.originalname);
    formData.append('subject', subject);

    const { data } = await firstValueFrom(
      this.http.post(`${process.env.AI_SERVICE_URL}/api/v1/pdf/analyze`, formData, {
        headers: { ...formData.getHeaders(), Authorization: `Bearer ${process.env.AI_INTERNAL_SECRET}` }
      })
    );
    return data;
  }

  private async checkAndDeductCredits(userId: string, subject: string, type: string) {
    // منطق خصم الرصيد أو التحقق من الحصة المجانية
    // (يتم تنفيذه عبر Prisma $transaction كما في ExamService)
  }
}