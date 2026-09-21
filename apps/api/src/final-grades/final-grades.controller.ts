import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { GRADING_PERMISSIONS } from '../grading/grading-permissions';
import {
  ApproveFinalGradeDto,
  CalculateFinalGradeDto,
  ReopenFinalGradeDto,
} from './dto/final-grade.dto';
import { FinalGradesService } from './final-grades.service';

/**
 * Final grade calculation and approval (TASK-051).
 *
 * Every route is guarded by `grading.final_grade.manage`. A final grade is an
 * academic record, so reading and writing it is a scoped permission decision —
 * never a role-name check — consistent with `docs/04-authorization-model.md`.
 *
 * The `api/v1` prefix is applied globally in `app.ts`; paths here are relative.
 */
@ApiTags('final-grades')
@Controller('final-grades')
export class FinalGradesController {
  constructor(private readonly finalGrades: FinalGradesService) {}

  @Post('calculate')
  @RequirePermissions(GRADING_PERMISSIONS.FINAL_GRADE_MANAGE)
  @ApiCreatedResponse()
  calculate(@Body() dto: CalculateFinalGradeDto) {
    return this.finalGrades.calculate({
      enrollmentId: dto.enrollmentId,
      classSubjectId: dto.classSubjectId,
      gradingSchemeId: dto.gradingSchemeId,
    });
  }

  @Post('recalculate')
  @RequirePermissions(GRADING_PERMISSIONS.FINAL_GRADE_MANAGE)
  @ApiCreatedResponse()
  recalculate(@Body() dto: CalculateFinalGradeDto) {
    return this.finalGrades.recalculate({
      enrollmentId: dto.enrollmentId,
      classSubjectId: dto.classSubjectId,
      gradingSchemeId: dto.gradingSchemeId,
    });
  }

  @Post(':id/approve')
  @RequirePermissions(GRADING_PERMISSIONS.FINAL_GRADE_MANAGE)
  @ApiOkResponse()
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveFinalGradeDto,
  ) {
    return this.finalGrades.approve(id, {
      approvedByUserId: dto.approvedByUserId,
    });
  }

  @Post(':id/reopen')
  @RequirePermissions(GRADING_PERMISSIONS.FINAL_GRADE_MANAGE)
  @ApiOkResponse()
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReopenFinalGradeDto,
  ) {
    return this.finalGrades.reopen(id, {
      reopenedByUserId: dto.reopenedByUserId,
      note: dto.note,
    });
  }

  @Get(':id')
  @RequirePermissions(GRADING_PERMISSIONS.FINAL_GRADE_MANAGE)
  @ApiOkResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.finalGrades.findOne(id);
  }
}
