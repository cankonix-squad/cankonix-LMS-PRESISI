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
import { ASSESSMENT_PERMISSIONS } from '../assessments/assessment-permissions';
import { AssessmentTypesService } from './assessment-types.service';
import { CreateAssessmentTypeDto } from './dto/create-assessment-type.dto';
import {
  AssessmentTypeListResponseDto,
  AssessmentTypeResponseDto,
} from './dto/assessment-type-response.dto';
import { ListAssessmentTypesQueryDto } from './dto/list-assessment-types-query.dto';
import { UpdateAssessmentTypeDto } from './dto/update-assessment-type.dto';

@ApiTags('assessment-types')
@Controller('assessment-types')
export class AssessmentTypesController {
  constructor(private readonly assessmentTypes: AssessmentTypesService) {}

  @Post()
  @RequirePermissions(ASSESSMENT_PERMISSIONS.TYPE_MANAGE)
  @ApiCreatedResponse({ type: AssessmentTypeResponseDto })
  create(
    @Body() dto: CreateAssessmentTypeDto,
  ): Promise<AssessmentTypeResponseDto> {
    return this.assessmentTypes.create(dto);
  }

  @Get()
  @RequirePermissions(ASSESSMENT_PERMISSIONS.TYPE_READ)
  @ApiOkResponse({ type: AssessmentTypeListResponseDto })
  list(
    @Query() query: ListAssessmentTypesQueryDto,
  ): Promise<AssessmentTypeListResponseDto> {
    return this.assessmentTypes.list(query);
  }

  @Get(':id')
  @RequirePermissions(ASSESSMENT_PERMISSIONS.TYPE_READ)
  @ApiOkResponse({ type: AssessmentTypeResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssessmentTypeResponseDto> {
    return this.assessmentTypes.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(ASSESSMENT_PERMISSIONS.TYPE_MANAGE)
  @ApiOkResponse({ type: AssessmentTypeResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentTypeDto,
  ): Promise<AssessmentTypeResponseDto> {
    return this.assessmentTypes.update(id, dto);
  }
}
