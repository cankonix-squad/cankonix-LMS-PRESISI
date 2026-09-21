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
import { RequirePermissions } from '../authorization/authorization.decorators';
import {
  ApproveGraduationDecisionDto,
  CorrectGraduationDecisionDto,
  CreateGraduationDecisionDto,
  ListGraduationDecisionsQueryDto,
  RevokeGraduationDecisionDto,
} from './dto/graduation-decision.dto';
import {
  GraduationDecisionListResponseDto,
  GraduationDecisionResponseDto,
} from './dto/graduation-decision-response.dto';
import { GRADUATION_DECISION_PERMISSIONS } from './graduation-decision-permissions';
import { GraduationDecisionService } from './graduation-decision.service';

/**
 * Formal graduation decisions (TASK-053).
 *
 * The four acts are guarded by four distinct permissions rather than one
 * umbrella. Recording a verdict, putting it in force, and withdrawing it are
 * different authorities, and the spec calls this workflow sensitive precisely
 * because the act that changes a learner's graduation status should be
 * separately grantable from the act that merely enters it.
 *
 * The `api/v1` prefix is applied globally in `app.ts`; paths here are relative.
 */
@ApiTags('graduation-decisions')
@Controller('graduation/decisions')
export class GraduationDecisionController {
  constructor(private readonly decisions: GraduationDecisionService) {}

  @Post()
  @RequirePermissions(GRADUATION_DECISION_PERMISSIONS.RECORD)
  @ApiCreatedResponse({ type: GraduationDecisionResponseDto })
  create(
    @Body() dto: CreateGraduationDecisionDto,
  ): Promise<GraduationDecisionResponseDto> {
    return this.decisions.create(dto);
  }

  @Get()
  @RequirePermissions(GRADUATION_DECISION_PERMISSIONS.READ)
  @ApiOkResponse({ type: GraduationDecisionListResponseDto })
  list(
    @Query() query: ListGraduationDecisionsQueryDto,
  ): Promise<GraduationDecisionListResponseDto> {
    return this.decisions.list(query);
  }

  @Get(':id')
  @RequirePermissions(GRADUATION_DECISION_PERMISSIONS.READ)
  @ApiOkResponse({ type: GraduationDecisionResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GraduationDecisionResponseDto> {
    return this.decisions.findOne(id);
  }

  @Patch(':id/approve')
  @RequirePermissions(GRADUATION_DECISION_PERMISSIONS.APPROVE)
  @ApiOkResponse({ type: GraduationDecisionResponseDto })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveGraduationDecisionDto,
  ): Promise<GraduationDecisionResponseDto> {
    return this.decisions.approve(id, dto.approvedByUserId ?? null);
  }

  @Patch(':id/correct')
  @RequirePermissions(GRADUATION_DECISION_PERMISSIONS.APPROVE)
  @ApiOkResponse({ type: GraduationDecisionResponseDto })
  correct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CorrectGraduationDecisionDto,
  ): Promise<GraduationDecisionResponseDto> {
    return this.decisions.correct(id, dto);
  }

  @Patch(':id/revoke')
  @RequirePermissions(GRADUATION_DECISION_PERMISSIONS.REVOKE)
  @ApiOkResponse({ type: GraduationDecisionResponseDto })
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeGraduationDecisionDto,
  ): Promise<GraduationDecisionResponseDto> {
    return this.decisions.revoke(id, dto);
  }
}
