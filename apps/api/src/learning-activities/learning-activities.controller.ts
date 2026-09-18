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
import { CreateLearningContentDto } from './dto/create-learning-content.dto';
import {
  ChangeLearningActivityStatusDto,
  ReorderLearningActivitiesDto,
} from './dto/learning-activity-actions.dto';
import { CreateLearningActivityDto } from './dto/create-learning-activity.dto';
import {
  LearningActivityListResponseDto,
  LearningActivityResponseDto,
  ReorderLearningActivitiesResponseDto,
} from './dto/learning-activity-response.dto';
import {
  LearningContentListResponseDto,
  LearningContentResponseDto,
  LearningContentVersionResponseDto,
} from './dto/learning-content-response.dto';
import {
  ListLearningActivitiesQueryDto,
  ListLearningContentsQueryDto,
} from './dto/list-learning-activities-query.dto';
import { UpdateLearningActivityDto } from './dto/update-learning-activity.dto';
import {
  CreateLearningContentVersionDto,
  UpdateLearningContentDto,
} from './dto/update-learning-content.dto';
import { LearningActivitiesService } from './learning-activities.service';
import { LearningContentsService } from './learning-contents.service';

@ApiTags('learning-activities')
@AllowAuthenticated()
@Controller('learning-activities')
export class LearningActivitiesController {
  constructor(
    private readonly activities: LearningActivitiesService,
    private readonly contents: LearningContentsService,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: LearningActivityResponseDto })
  create(
    @Body() dto: CreateLearningActivityDto,
  ): Promise<LearningActivityResponseDto> {
    return this.activities.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: LearningActivityListResponseDto })
  list(
    @Query() query: ListLearningActivitiesQueryDto,
  ): Promise<LearningActivityListResponseDto> {
    return this.activities.list(query);
  }

  /**
   * Declared before the `:id` routes so the literal path is matched first and
   * `reorder` is never parsed as an activity id.
   */
  @Patch('reorder')
  @ApiOkResponse({ type: ReorderLearningActivitiesResponseDto })
  reorder(
    @Body() dto: ReorderLearningActivitiesDto,
  ): Promise<ReorderLearningActivitiesResponseDto> {
    return this.activities.reorder(dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: LearningActivityResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LearningActivityResponseDto> {
    return this.activities.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: LearningActivityResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLearningActivityDto,
  ): Promise<LearningActivityResponseDto> {
    return this.activities.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: LearningActivityResponseDto })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeLearningActivityStatusDto,
  ): Promise<LearningActivityResponseDto> {
    return this.activities.changeStatus(id, dto);
  }

  /**
   * Content is nested under its activity because an activity is the only
   * meaningful owner: content without an activity has no place in the student
   * journey and no availability window to obey.
   */
  @Post(':id/contents')
  @ApiCreatedResponse({ type: LearningContentResponseDto })
  createContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLearningContentDto,
  ): Promise<LearningContentResponseDto> {
    return this.contents.create(id, dto);
  }

  @Get(':id/contents')
  @ApiOkResponse({ type: LearningContentListResponseDto })
  listContents(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListLearningContentsQueryDto,
  ): Promise<LearningContentListResponseDto> {
    return this.contents.list(id, query);
  }
}

@ApiTags('learning-contents')
@AllowAuthenticated()
@Controller('learning-contents')
export class LearningContentsController {
  constructor(private readonly contents: LearningContentsService) {}

  @Get(':id')
  @ApiOkResponse({ type: LearningContentResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LearningContentResponseDto> {
    return this.contents.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: LearningContentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLearningContentDto,
  ): Promise<LearningContentResponseDto> {
    return this.contents.update(id, dto);
  }

  @Post(':id/versions')
  @ApiCreatedResponse({ type: LearningContentVersionResponseDto })
  createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLearningContentVersionDto,
  ): Promise<LearningContentVersionResponseDto> {
    return this.contents.createVersion(id, dto);
  }
}
