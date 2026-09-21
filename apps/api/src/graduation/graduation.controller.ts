import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GraduationRuleStatus } from '@prisma/client';
import { RequirePermissions } from '../authorization/authorization.decorators';
import {
  ChangeGraduationRuleStatusDto,
  CreateGraduationRuleDto,
  EvaluateBatchDto,
  EvaluateEnrollmentDto,
  ListGraduationRulesQueryDto,
  UpdateGraduationRuleDto,
} from './dto/graduation.dto';
import {
  BatchEvaluationSummaryDto,
  GraduationEvaluationResponseDto,
  GraduationRuleListResponseDto,
  GraduationRuleResponseDto,
} from './dto/graduation-response.dto';
import { GRADUATION_PERMISSIONS } from './graduation-permissions';
import { GraduationService } from './graduation.service';

/**
 * Graduation rules and evaluation (TASK-052).
 *
 * Two permission families are used deliberately. Rule authoring is guarded by
 * `graduation.rule.*`; running an evaluation is guarded by
 * `graduation.evaluation.*`. An institution can therefore let an operator run
 * evaluations without also letting them rewrite the standard participants are
 * measured against.
 *
 * The `api/v1` prefix is applied globally in `app.ts`; paths here are relative.
 */
@ApiTags('graduation')
@Controller('graduation')
export class GraduationController {
  constructor(private readonly graduation: GraduationService) {}

  // --- Rules -----------------------------------------------------------------

  @Post('rules')
  @RequirePermissions(GRADUATION_PERMISSIONS.RULE_MANAGE)
  @ApiCreatedResponse({ type: GraduationRuleResponseDto })
  createRule(
    @Body() dto: CreateGraduationRuleDto,
  ): Promise<GraduationRuleResponseDto> {
    return this.graduation.createRule(dto);
  }

  @Get('rules')
  @RequirePermissions(GRADUATION_PERMISSIONS.RULE_READ)
  @ApiOkResponse({ type: GraduationRuleListResponseDto })
  listRules(
    @Query() query: ListGraduationRulesQueryDto,
  ): Promise<GraduationRuleListResponseDto> {
    return this.graduation.listRules(query);
  }

  @Get('rules/:id')
  @RequirePermissions(GRADUATION_PERMISSIONS.RULE_READ)
  @ApiOkResponse({ type: GraduationRuleResponseDto })
  findRule(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GraduationRuleResponseDto> {
    return this.graduation.findRule(id);
  }

  @Patch('rules/:id')
  @RequirePermissions(GRADUATION_PERMISSIONS.RULE_MANAGE)
  @ApiOkResponse({ type: GraduationRuleResponseDto })
  updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGraduationRuleDto,
  ): Promise<GraduationRuleResponseDto> {
    return this.graduation.updateRule(id, dto);
  }

  /**
   * Publish or archive. Its own route so the lifecycle move carries the
   * transition guard and a distinct audit action rather than being inferred
   * from a generic update.
   */
  @Patch('rules/:id/status')
  @RequirePermissions(GRADUATION_PERMISSIONS.RULE_MANAGE)
  @ApiOkResponse({ type: GraduationRuleResponseDto })
  changeRuleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeGraduationRuleStatusDto,
  ): Promise<GraduationRuleResponseDto> {
    return this.graduation.changeStatus(
      id,
      dto.status as GraduationRuleStatus,
      dto.publishedByUserId ?? null,
    );
  }

  // --- Evaluation ------------------------------------------------------------

  @Post('evaluations/enrollment')
  @RequirePermissions(GRADUATION_PERMISSIONS.EVALUATION_RUN)
  @ApiCreatedResponse({ type: GraduationEvaluationResponseDto })
  evaluateEnrollment(
    @Body() dto: EvaluateEnrollmentDto,
  ): Promise<GraduationEvaluationResponseDto> {
    return this.graduation.evaluateEnrollment(dto);
  }

  @Post('evaluations/batch')
  @RequirePermissions(GRADUATION_PERMISSIONS.EVALUATION_RUN)
  @ApiCreatedResponse({ type: BatchEvaluationSummaryDto })
  evaluateBatch(
    @Body() dto: EvaluateBatchDto,
  ): Promise<BatchEvaluationSummaryDto> {
    return this.graduation.evaluateBatch(dto);
  }

  @Get('evaluations/:id')
  @RequirePermissions(GRADUATION_PERMISSIONS.EVALUATION_READ)
  @ApiOkResponse({ type: GraduationEvaluationResponseDto })
  findEvaluation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GraduationEvaluationResponseDto> {
    return this.graduation.findEvaluation(id);
  }

  @Get('enrollments/:enrollmentId/evaluations')
  @RequirePermissions(GRADUATION_PERMISSIONS.EVALUATION_READ)
  @ApiOkResponse({ type: [GraduationEvaluationResponseDto] })
  listEvaluations(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<GraduationEvaluationResponseDto[]> {
    return this.graduation.listEvaluationsForEnrollment(enrollmentId);
  }
}
