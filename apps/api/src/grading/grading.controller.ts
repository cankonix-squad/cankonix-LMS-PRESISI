import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { ManualGradeDto } from './dto/manual-grade.dto';
import { GradingService } from './grading.service';

@Controller('exam-grading')
export class GradingController {
  constructor(private readonly grading: GradingService) {}

  @Post(':attemptId/auto')
  @RequirePermissions('exam.grade.manage')
  autoGrade(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    return this.grading.autoGrade(attemptId);
  }

  @Put('answers/:answerId')
  @RequirePermissions('exam.grade.manage')
  manualGrade(
    @Param('answerId', ParseUUIDPipe) answerId: string,
    @Body() dto: ManualGradeDto,
  ) {
    return this.grading.manualGrade(answerId, dto);
  }
}
