// backend/src/dashboard/dashboard.controller.ts
import { Controller, Get, Query, Post, Param, UseGuards, Req, ParseEnumPipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeaderboardPeriod } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Req() req) {
    return this.dashboardService.getDashboardSummary(req.user.userId);
  }

  @Get('leaderboard')
  getLeaderboard(
    @Query('period', new ParseEnumPipe(LeaderboardPeriod)) period: LeaderboardPeriod = 'weekly',
    @Query('province') province?: string,
    @Query('limit') limit: number = 10,
    @Req() req
  ) {
    return this.dashboardService.getLeaderboard(period, province, limit);
  }

  @Get('notifications/unread')
  getUnreadNotifications(@Req() req) {
    return this.dashboardService.getUnreadNotifications(req.user.userId);
  }

  @Post('notifications/:id/read')
  markRead(@Req() req, @Param('id') id: string) {
    return this.dashboardService.markNotificationRead(req.user.userId, id);
  }

  // 🔹 WebSocket Gateway (ملف منفصل)
  // backend/src/dashboard/dashboard.gateway.ts
  // يستخدم @WebSocketGateway() للتحديث الفوري عند:
  // - إنهاء امتحان → تحديث اللوحة فورياً
  // - كسر سلسلة → إشعار فوري
  // - دخول المتصدرين → تحديث الترتيب
}