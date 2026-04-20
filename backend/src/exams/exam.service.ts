// backend/src/exams/exam.service.ts
import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamSetupDto, SubmitAnswerDto } from './dto/exam.dto';
import { ExamMode, Difficulty, Prisma } from '@prisma/client';

@Injectable()
export class ExamService {
  constructor(private prisma: PrismaService) {}

  // 🔹 إنشاء جلسة امتحان جديدة
  async createSession(userId: string, dto: ExamSetupDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { code: dto.subjectCode, isActive: true }
    });
    if (!subject) throw new NotFoundException('المادة غير موجودة أو غير نشطة');

    // حساب التكلفة (أول 10 أسئلة مجانية، الباقي 50 د.ع/سؤال)
    const cost = dto.questionCount <= 10 ? 0 : (dto.questionCount - 10) * 50;

    // فحص الرصيد
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true }
    });
    if (user.walletBalance < cost) {
      throw new ForbiddenException(`رصيدك غير كافٍ. مطلوب: ${cost} د.ع`);
    }

    // جلب الأسئلة عشوائياً بكفاءة (PostgreSQL RANDOM())
    const questions = await this.prisma.question.findMany({
      where: {
        subjectId: subject.id,
        difficulty: dto.difficulty === 'RANDOM' ? undefined : dto.difficulty,
        tags: dto.tags?.length ? { hasSome: dto.tags } : undefined
      },
      select: { id: true, content: true, options: true, difficulty: true },
      take: dto.questionCount * 2, // هامش للشuffle
      orderBy: Prisma.sql`RANDOM()`
    });

    if (questions.length < dto.questionCount) {
      throw new BadRequestException('لا توجد أسئلة كافية بهذه الإعدادات حالياً');
    }

    const selectedQuestions = questions.slice(0, dto.questionCount);

    // عملية ذرية: خصم الرصيد + إنشاء الامتحان + حفظ الأسئلة
    const exam = await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.create({
        data: {
          userId,
          subjectId: subject.id,
          mode: dto.mode,
          totalQuestions: dto.questionCount,
          isPaid: cost > 0,
          costDeducted: cost,
          answers: selectedQuestions.map(q => ({ questionId: q.id, selectedOption: null, isCorrect: null }))
        }
      });

      if (cost > 0) {
        await tx.user.update({ where: { id: userId }, data: { walletBalance: { decrement: cost } } });
        await tx.transaction.create({
          data: {
            userId, amount: cost, type: 'DEBIT',
            description: `امتحان ${subject.nameAr} (${dto.questionCount} سؤال)`,
            status: 'COMPLETED'
          }
        });
      }

      return { id: attempt.id, duration: subject.durationMinutes, totalQuestions: dto.questionCount };
    });

    return exam;
  }

  // 🔹 جلب سؤال محدد (بدون إظهار الإجابة الصحيحة)
  async getQuestion(userId: string, examId: string, index: number) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: examId, userId },
      include: { answers: { orderBy: { questionId: 'asc' } } }
    });
    if (!attempt || index >= attempt.answers.length) {
      throw new NotFoundException('سؤال غير موجود');
    }

    const question = await this.prisma.question.findUnique({
      where: { id: attempt.answers[index].questionId },
      select: { content: true, options: true, difficulty: true }
    });

    return {
      index: index + 1,
      total: attempt.answers.length,
      question: question.content,
      options: question.options,
      difficulty: question.difficulty,
      selectedOption: attempt.answers[index].selectedOption,
      timeSpent: attempt.answers[index].timeSpent || 0
    };
  }

  // 🔹 حفظ إجابة
  async submitAnswer(userId: string, examId: string, index: number, dto: SubmitAnswerDto) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: examId, userId },
      include: { answers: true }
    });
    if (!attempt || index >= attempt.answers.length) {
      throw new NotFoundException('سؤال غير موجود');
    }

    const question = await this.prisma.question.findUnique({
      where: { id: attempt.answers[index].questionId }
    });

    const isCorrect = question.options[dto.selectedOption]?.isCorrect === true;

    await this.prisma.examAttempt.update({
      where: { id: examId },
      data: {
        answers: {
          update: {
            where: { id: attempt.answers[index].id },
            data: { selectedOption: dto.selectedOption, isCorrect }
          }
        }
      }
    });

    return { success: true, isCorrect };
  }

  // 🔹 إنهاء الامتحان وحساب النتيجة
  async finishExam(userId: string, examId: string) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: examId, userId, completedAt: null },
      include: { answers: { include: { question: true } }, subject: true }
    });
    if (!attempt) throw new NotFoundException('امتحان غير موجود أو منتهي مسبقاً');

    const correctAnswers = attempt.answers.filter(a => a.isCorrect === true).length;
    const score = (correctAnswers / attempt.totalQuestions) * 100;

    // إضافة نقاط XP
    const xpGain = Math.floor(correctAnswers * 5) + (score >= attempt.subject.passingScore ? 50 : 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        xpPoints: { increment: xpGain },
        currentStreak: { increment: 1 }
      }
    });

    return this.prisma.examAttempt.update({
      where: { id: examId },
      data: {
        score,
        correctAnswers,
        timeTakenSeconds: Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000),
        completedAt: new Date()
      },
      select: {
        id: true, score: true, correctAnswers: true, totalQuestions: true,
        timeTakenSeconds: true, subject: { select: { nameAr: true, passingScore: true } }
      }
    });
  }
}