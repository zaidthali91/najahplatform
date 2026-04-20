// backend/src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // 🔹 بيانات اللوحة الرئيسية
  async getDashboardSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, trackType: true, xpPoints: true,
        walletBalance: true, currentStreak: true, longestStreak: true,
        lastStudyDate: true, createdAt: true,
        achievements: {
          include: { achievement: { select: { nameAr: true, icon: true } } }
        }
      }
    });

    // المستوى الحالي (كل 500 XP = مستوى جديد)
    const currentLevel = Math.floor(user.xpPoints / 500) + 1;
    const xpForNextLevel = currentLevel * 500;
    const xpProgress = ((user.xpPoints % 500) / 500) * 100;

    // إحصاءات اليوم
    const today = startOfDay(new Date());
    const todayActivity = await this.prisma.dailyStudyActivity.findFirst({
      where: { userId, date: today }
    });

    // إحصاءات الأسبوع
    const weekStart = startOfWeek(today, { weekStartsOn: 6 }); // السبت
    const weekEnd = endOfWeek(today, { weekStartsOn: 6 });
    
    const weekStats = await this.prisma.dailyStudyActivity.groupBy({
      by: ['date'],
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      _sum: { questionsAnswered: true, correctAnswers: true, timeSpentMinutes: true, xpEarned: true },
      orderBy: { date: 'asc' }
    });

    // أداء المواد
    const subjectPerformance = await this.prisma.examAttempt.groupBy({
      by: ['subjectId'],
      where: { userId, completedAt: { not: null } },
      _avg: { score: true },
      _count: { id: true }
    });

    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectPerformance.map(s => s.subjectId) } }
    });

    const performanceBySubject = subjectPerformance.map(sp => {
      const subject = subjects.find(s => s.id === sp.subjectId);
      return {
        subjectName: subject?.nameAr,
        subjectCode: subject?.code,
        avgScore: Number(sp._avg.score?.toFixed(1) || 0),
        examsTaken: sp._count.id
      };
    });

    return {
      user: {
        ...user,
        currentLevel,
        xpForNextLevel,
        xpProgress: Math.round(xpProgress),
        todayActivity: todayActivity || {
          questionsAnswered: 0, correctAnswers: 0, timeSpentMinutes: 0, xpEarned: 0
        }
      },
      weekStats: weekStats.map(s => ({
        date: s.date,
        questions: s._sum.questionsAnswered || 0,
        correct: s._sum.correctAnswers || 0,
        minutes: s._sum.timeSpentMinutes || 0,
        xp: s._sum.xpEarned || 0
      })),
      performanceBySubject,
      streak: {
        current: user.currentStreak,
        longest: user.longestStreak,
        lastStudy: user.lastStudyDate,
        isOnStreak: user.lastStudyDate && 
          new Date(user.lastStudyDate).toDateString() === today.toDateString()
      }
    };
  }

  // 🔹 قائمة المتصدرين
  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'weekly', 
                       province?: string, limit: number = 10) {
    const now = new Date();
    let periodStart: Date, periodEnd: Date;

    switch (period) {
      case 'daily':
        periodStart = startOfDay(now);
        periodEnd = endOfDay(now);
        break;
      case 'weekly':
        periodStart = startOfWeek(now, { weekStartsOn: 6 });
        periodEnd = endOfWeek(now, { weekStartsOn: 6 });
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = endOfDay(addDays(periodStart, 31));
        break;
      default: // all_time
        periodStart = new Date('2024-01-01');
        periodEnd = now;
    }

    // جلب أو إنشاء إدخالات المتصدرين (في الإنتاج: Cron Job يحدّث هذا يومياً)
    await this.updateLeaderboardEntries(period, periodStart, periodEnd);

    const where: any = { period, periodStart, periodEnd };
    if (province) where.province = province;

    const entries = await this.prisma.leaderboardEntry.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, trackType: true } }
      },
      orderBy: { rank: 'asc' },
      take: limit
    });

    // موقع المستخدم الحالي
    const currentUser = await this.prisma.leaderboardEntry.findFirst({
      where: { ...where, userId: '' }, // سيتم تمرير userId من السياق
      select: { rank: true, xpEarned: true }
    });

    return {
      period,
      entries: entries.map((e, idx) => ({
        rank: e.rank,
        user: e.user,
        xpEarned: e.xpEarned,
        examsCompleted: e.examsCompleted,
        avgScore: e.avgScore ? Number(e.avgScore) : null,
        isCurrentUser: false // سيتم تعيينه في الـ Controller
      })),
      currentUserRank: currentUser?.rank || null,
      totalParticipants: await this.prisma.leaderboardEntry.count({ where })
    };
  }

  // 🔹 تحديث إدخالات المتصدرين (يُشغّل كـ Cron Job)
  async updateLeaderboardEntries(period: string, start: Date, end: Date) {
    const users = await this.prisma.user.findMany({
      select: { id: true }
    });

    for (const user of users) {
      const stats = await this.prisma.examAttempt.aggregate({
        where: {
          userId: user.id,
          completedAt: { gte: start, lte: end },
          score: { not: null }
        },
        _sum: { score: true },
        _count: { id: true }
      });

      const xpEarned = await this.prisma.dailyStudyActivity.aggregate({
        where: { userId: user.id, date: { gte: start, lte: end } },
        _sum: { xpEarned: true }
      });

      const avgScore = stats._count.id > 0 
        ? Number((stats._sum.score! / stats._count.id).toFixed(2)) 
        : null;

      await this.prisma.leaderboardEntry.upsert({
        where: {
          userId_period_periodStart: {
            userId: user.id,
            period,
            periodStart: start
          }
        },
        update: {
          xpEarned: xpEarned._sum.xpEarned || 0,
          examsCompleted: stats._count.id,
          avgScore
        },
        create: {
          userId: user.id,
          period,
          periodStart: start,
          periodEnd: end,
          xpEarned: xpEarned._sum.xpEarned || 0,
          examsCompleted: stats._count.id,
          avgScore,
          rank: 0 // سيتم حسابه لاحقاً بالترتيب
        }
      });
    }

    // تحديث الترتيب
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: { period, periodStart: start },
      orderBy: { xpEarned: 'desc' }
    });

    for (let i = 0; i < entries.length; i++) {
      await this.prisma.leaderboardEntry.update({
        where: { id: entries[i].id },
        data: { rank: i + 1 }
      });
    }
  }

  // 🔹 التحقق من الإنجازات الجديدة
  async checkAndGrantAchievements(userId: string, activity: {
    questionsAnswered?: number;
    correctAnswers?: number;
    streak?: number;
    perfectScore?: boolean;
  }) {
    const achievements = await this.prisma.achievement.findMany({
      where: { userAchievements: { none: { userId } } }
    });

    const granted: string[] = [];

    for (const achievement of achievements) {
      const req = achievement.requirement as any;
      let earned = false;

      switch (req.type) {
        case 'exam_count':
          if (activity.questionsAnswered! >= req.value) earned = true;
          break;
        case 'streak_days':
          if (activity.streak! >= req.value) earned = true;
          break;
        case 'perfect_score':
          if (activity.perfectScore) earned = true;
          break;
        case 'accuracy':
          const acc = (activity.correctAnswers! / activity.questionsAnswered!) * 100;
          if (acc >= req.value) earned = true;
          break;
      }

      if (earned) {
        await this.prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            progress: 100,
            isClaimed: false
          }
        });

        // إضافة نقاط المكافأة
        await this.prisma.user.update({
          where: { id: userId },
          data: { xpPoints: { increment: achievement.xpReward } }
        });

        // إنشاء إشعار
        await this.prisma.notification.create({
          data: {
            userId,
            type: 'achievement',
            title: `🎉 حصلت على شارة جديدة!`,
            message: `${achievement.icon} ${achievement.nameAr}: ${achievement.description}`,
            priority: 'high'
          }
        });

        granted.push(achievement.key);
      }
    }

    return granted;
  }

  // 🔹 الإشعارات غير المقروءة
  async getUnreadNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, type: true, title: true, message: true, 
        link: true, priority: true, createdAt: true
      }
    });
  }

  async markNotificationRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() }
    });
  }
}