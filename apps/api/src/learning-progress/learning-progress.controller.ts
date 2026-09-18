import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAuthenticated } from '../authorization/authorization.decorators';
import {
  ClassSubjectProgressSummaryResponseDto,
  LearningProgressListResponseDto,
  LearningProgressResponseDto,
  ParticipantProgressSummaryResponseDto,
} from './dto/learning-progress-response.dto';
import { ListLearningProgressQueryDto } from './dto/list-learning-progress-query.dto';
import { UpdateLearningProgressDto } from './dto/update-learning-progress.dto';
import { LearningProgressService } from './learning-progress.service';

/**
 * Controller for participant learning progress (TASK-023).
 *
 * Exposes incremental progress tracking and pre-aggregated summaries per class
 * subject and participant.
 */
@ApiTags('learning-progress')
@AllowAuthenticated()
@Controller('learning-progress')
export class LearningProgressController {
  constructor(private readonly service: LearningProgressService) {}

  @Post()
  @ApiOperation({
    summary: 'Record or update learning progress for an activity',
  })
  async recordProgress(
    @Body() dto: UpdateLearningProgressDto,
  ): Promise<LearningProgressResponseDto> {
    return await this.service.recordProgress(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List learning progress records with optional filters',
  })
  async list(
    @Query() query: ListLearningProgressQueryDto,
  ): Promise<LearningProgressListResponseDto> {
    return await this.service.list(query);
  }

  @Get('summary/class-subjects/:classSubjectId')
  @ApiOperation({
    summary:
      'List pre-aggregated progress summaries for all participants in a class subject',
  })
  async listClassSubjectSummaries(
    @Param('classSubjectId', ParseUUIDPipe) classSubjectId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<ClassSubjectProgressSummaryResponseDto> {
    return await this.service.listClassSubjectSummaries(
      classSubjectId,
      +page,
      +limit,
    );
  }

  @Get('summary/class-subjects/:classSubjectId/enrollments/:enrollmentId')
  @ApiOperation({
    summary:
      'Get pre-aggregated progress summary for a specific participant in a class subject',
  })
  async getParticipantSummary(
    @Param('classSubjectId', ParseUUIDPipe) classSubjectId: string,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<ParticipantProgressSummaryResponseDto> {
    return await this.service.getParticipantSummary(
      classSubjectId,
      enrollmentId,
    );
  }

  @Get('enrollments/:enrollmentId/activities/:activityId')
  @ApiOperation({
    summary: 'Get progress for a single enrollment and activity',
  })
  async findOne(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ): Promise<LearningProgressResponseDto> {
    return await this.service.findOne(enrollmentId, activityId);
  }
}
