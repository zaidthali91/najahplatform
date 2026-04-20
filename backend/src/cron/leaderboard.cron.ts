// backend/src/cron/leaderboard.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class LeaderboardCron {
  private readonly logger = new Logger(LeaderboardCron.name);
  
  constructor(private dashboardService: DashboardService) {}

  // 🔹 تحديث المتصدرين يومياً الساعة 2 صباحاً
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async updateDailyLeaderboards() {
    this.logger.log('🔄 بدء تحديث المتصدرين اليومي...');
    
    const periods: Array<'daily' | 'weekly' | 'monthly' | 'all_time'> = ['daily', 'weekly', 'monthly'];
    
    for (const period of periods) {
      const now = new Date();
      let start: Date, end: Date;
      
      // حساب التواريخ حسب الفترة
      // ... (نفس المنطق في getLeaderboard)
      
      await this.dashboardService.updateLeaderboardEntries(period, start, end);
      this.logger.log(`✅ تم تحديث متصدرين ${period}`);
    }
    
    this.logger.log('🎉 اكتمل تحديث المتصدرين');
  }

  // 🔹 إعادة تعيين السلسلة اليومية (الساعة 12:01 صباحاً)
  @Cron('1 0 * * *')
  async resetDailyStreaks() {
    // منطق التحقق من كسر السلسلة
    // وإرسال إشعار للطلاب الذين كسروا سلسلة طويلة
  }
}