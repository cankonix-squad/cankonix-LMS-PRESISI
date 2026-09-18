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
import { AllowAuthenticated } from '../authorization/authorization.decorators';
import {
  ChangeLearningMeetingStatusDto,
  ReorderLearningMeetingsDto,
} from './dto/learning-meeting-actions.dto';
import {
  LearningMeetingListResponseDto,
  LearningMeetingResponseDto,
  ReorderLearningMeetingsResponseDto,
} from './dto/learning-meeting-response.dto';
import { CreateLearningMeetingDto } from './dto/create-learning-meeting.dto';
import { ListLearningMeetingsQueryDto } from './dto/list-learning-meetings-query.dto';
import { UpdateLearningMeetingDto } from './dto/update-learning-meeting.dto';
import { LearningMeetingsService } from './learning-meetings.service';

@ApiTags('learning-meetings')
@AllowAuthenticated()
@Controller('learning-meetings')
export class LearningMeetingsController {
  constructor(private readonly meetings: LearningMeetingsService) {}

  @Post()
  @ApiCreatedResponse({ type: LearningMeetingResponseDto })
  create(
    @Body() dto: CreateLearningMeetingDto,
  ): Promise<LearningMeetingResponseDto> {
    return this.meetings.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: LearningMeetingListResponseDto })
  list(
    @Query() query: ListLearningMeetingsQueryDto,
  ): Promise<LearningMeetingListResponseDto> {
    return this.meetings.list(query);
  }

  /**
   * Declared before `:id` routes so the literal path is matched first and
   * `reorder` is never parsed as a meeting id.
   */
  @Patch('reorder')
  @ApiOkResponse({ type: ReorderLearningMeetingsResponseDto })
  reorder(
    @Body() dto: ReorderLearningMeetingsDto,
  ): Promise<ReorderLearningMeetingsResponseDto> {
    return this.meetings.reorder(dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: LearningMeetingResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LearningMeetingResponseDto> {
    return this.meetings.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: LearningMeetingResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLearningMeetingDto,
  ): Promise<LearningMeetingResponseDto> {
    return this.meetings.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: LearningMeetingResponseDto })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeLearningMeetingStatusDto,
  ): Promise<LearningMeetingResponseDto> {
    return this.meetings.changeStatus(id, dto);
  }
}
