// backend/src/exams/dto/exam.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ExamMode, Difficulty, SubjectCode } from '@prisma/client';

export class ExamSetupDto {
  @IsString()
  subjectCode: SubjectCode;

  @IsEnum(ExamMode)
  mode: ExamMode;

  @IsInt() @Min(5) @Max(60)
  questionCount: number;

  @IsEnum(Difficulty) @IsOptional()
  difficulty: Difficulty = 'RANDOM';

  @IsOptional() @IsString()
  tags?: string[];
}

export class SubmitAnswerDto {
  @IsInt() @Min(0) @Max(3)
  selectedOption: number;
}