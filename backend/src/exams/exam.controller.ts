// backend/src/exams/exam.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ExamService } from './exam.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExamSetupDto, SubmitAnswerDto } from './dto/exam.dto';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private examService: ExamService) {}

  @Post('setup')
  setup(@Req() req, @Body() dto: ExamSetupDto) {
    return this.examService.createSession(req.user.userId, dto);
  }

  @Get(':id/question/:index')
  getQuestion(@Req() req, @Param('id') examId: string, @Param('index') index: number) {
    return this.examService.getQuestion(req.user.userId, examId, parseInt(index));
  }

  @Post(':id/question/:index/answer')
  submitAnswer(@Req() req, @Param('id') examId: string, @Param('index') index: number, @Body() dto: SubmitAnswerDto) {
    return this.examService.submitAnswer(req.user.userId, examId, parseInt(index), dto);
  }

  @Post(':id/finish')
  finish(@Req() req, @Param('id') examId: string) {
    return this.examService.finishExam(req.user.userId, examId);
  }
}