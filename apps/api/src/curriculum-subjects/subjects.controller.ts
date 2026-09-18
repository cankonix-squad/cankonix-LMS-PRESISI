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
import { CreateSubjectDto } from './dto/create-subject.dto';
import { ListSubjectsQueryDto } from './dto/list-subjects-query.dto';
import {
  SubjectListResponseDto,
  SubjectResponseDto,
} from './dto/subject-response.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectsService } from './subjects.service';

@ApiTags('subjects')
@AllowAuthenticated()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Post()
  @ApiCreatedResponse({ type: SubjectResponseDto })
  create(@Body() dto: CreateSubjectDto): Promise<SubjectResponseDto> {
    return this.subjects.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: SubjectListResponseDto })
  list(@Query() query: ListSubjectsQueryDto): Promise<SubjectListResponseDto> {
    return this.subjects.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: SubjectResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SubjectResponseDto> {
    return this.subjects.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SubjectResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectDto,
  ): Promise<SubjectResponseDto> {
    return this.subjects.update(id, dto);
  }
}
