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
import { CreateLearningActivityTypeDto } from './dto/create-learning-activity-type.dto';
import {
  LearningActivityTypeListResponseDto,
  LearningActivityTypeResponseDto,
} from './dto/learning-activity-type-response.dto';
import { ListLearningActivityTypesQueryDto } from './dto/list-learning-activity-types-query.dto';
import { UpdateLearningActivityTypeDto } from './dto/update-learning-activity-type.dto';
import { LearningActivityTypesService } from './learning-activity-types.service';

@ApiTags('learning-activity-types')
@AllowAuthenticated()
@Controller('learning-activity-types')
export class LearningActivityTypesController {
  constructor(private readonly activityTypes: LearningActivityTypesService) {}

  @Post()
  @ApiCreatedResponse({ type: LearningActivityTypeResponseDto })
  create(
    @Body() dto: CreateLearningActivityTypeDto,
  ): Promise<LearningActivityTypeResponseDto> {
    return this.activityTypes.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: LearningActivityTypeListResponseDto })
  list(
    @Query() query: ListLearningActivityTypesQueryDto,
  ): Promise<LearningActivityTypeListResponseDto> {
    return this.activityTypes.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: LearningActivityTypeResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LearningActivityTypeResponseDto> {
    return this.activityTypes.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: LearningActivityTypeResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLearningActivityTypeDto,
  ): Promise<LearningActivityTypeResponseDto> {
    return this.activityTypes.update(id, dto);
  }
}
