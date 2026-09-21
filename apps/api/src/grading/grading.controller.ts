import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/authorization.decorators';
import {
  CreateGradingComponentDto,
  CreateGradingSchemeDto,
} from './dto/grading-scheme.dto';
import { ManualGradeDto } from './dto/manual-grade.dto';
import { GRADING_PERMISSIONS } from './grading-permissions';
import { GradingService } from './grading.service';

@ApiTags('exam-grading')
@Controller('exam-grading')
export class GradingController {
  constructor(private readonly grading: GradingService) {}

  @Post(':attemptId/auto')
  @RequirePermissions(GRADING_PERMISSIONS.MANAGE)
  autoGrade(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    return this.grading.autoGrade(attemptId);
  }

  @Put('answers/:answerId')
  @RequirePermissions(GRADING_PERMISSIONS.MANAGE)
  manualGrade(
    @Param('answerId', ParseUUIDPipe) answerId: string,
    @Body() dto: ManualGradeDto,
  ) {
    return this.grading.manualGrade(answerId, dto);
  }
}

/**
 * Grading scheme and component configuration (TASK-050).
 *
 * Kept on a separate controller from the answer-grading routes: configuring
 * *how* a class subject is graded is a curriculum decision with a different
 * permission from marking one individual answer, so the two are not welded to a
 * single guard.
 *
 * The `api/v1` prefix is applied globally in `app.ts`; the paths here are
 * relative to it.
 */
@ApiTags('grading-schemes')
@Controller('grading-schemes')
export class GradingSchemesController {
  constructor(private readonly grading: GradingService) {}

  @Get()
  @RequirePermissions(GRADING_PERMISSIONS.SCHEME_READ)
  @ApiOkResponse()
  list() {
    return this.grading.listSchemes();
  }

  @Post()
  @RequirePermissions(GRADING_PERMISSIONS.SCHEME_MANAGE)
  @ApiCreatedResponse()
  create(@Body() dto: CreateGradingSchemeDto) {
    return this.grading.createScheme({
      classSubjectId: dto.classSubjectId,
      name: dto.name,
      status: dto.status,
    });
  }

  @Get(':id')
  @RequirePermissions(GRADING_PERMISSIONS.SCHEME_READ)
  @ApiOkResponse()
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.grading.getScheme(id);
  }

  @Post(':id/components')
  @RequirePermissions(GRADING_PERMISSIONS.SCHEME_MANAGE)
  @ApiCreatedResponse()
  addComponent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGradingComponentDto,
  ) {
    return this.grading.createComponent(id, {
      assessmentId: dto.assessmentId,
      name: dto.name,
      weight: dto.weight,
      required: dto.required,
    });
  }
}
