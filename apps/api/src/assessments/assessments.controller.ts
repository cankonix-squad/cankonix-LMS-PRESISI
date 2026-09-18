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
import { ASSESSMENT_PERMISSIONS } from './assessment-permissions';
import { AssessmentsService } from './assessments.service';
import { ChangeAssessmentStatusDto } from './dto/assessment-actions.dto';
import {
  AssessmentListResponseDto,
  AssessmentResponseDto,
} from './dto/assessment-response.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { ListAssessmentsQueryDto } from './dto/list-assessments-query.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

@ApiTags('assessments')
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Post()
  @RequirePermissions(ASSESSMENT_PERMISSIONS.MANAGE)
  @ApiCreatedResponse({ type: AssessmentResponseDto })
  create(@Body() dto: CreateAssessmentDto): Promise<AssessmentResponseDto> {
    return this.assessments.create(dto);
  }

  @Get()
  @RequirePermissions(ASSESSMENT_PERMISSIONS.READ)
  @ApiOkResponse({ type: AssessmentListResponseDto })
  list(
    @Query() query: ListAssessmentsQueryDto,
  ): Promise<AssessmentListResponseDto> {
    return this.assessments.list(query);
  }

  @Get(':id')
  @RequirePermissions(ASSESSMENT_PERMISSIONS.READ)
  @ApiOkResponse({ type: AssessmentResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssessmentResponseDto> {
    return this.assessments.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(ASSESSMENT_PERMISSIONS.MANAGE)
  @ApiOkResponse({ type: AssessmentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
  ): Promise<AssessmentResponseDto> {
    return this.assessments.update(id, dto);
  }

  /**
   * Publish/unpublish/close/archive. Kept as its own route so every lifecycle
   * move carries the transition guard and the `assessment.status_changed` audit
   * action, instead of being inferred from a generic update.
   */
  @Patch(':id/status')
  @RequirePermissions(ASSESSMENT_PERMISSIONS.MANAGE)
  @ApiOkResponse({ type: AssessmentResponseDto })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeAssessmentStatusDto,
  ): Promise<AssessmentResponseDto> {
    return this.assessments.changeStatus(id, dto);
  }
}
