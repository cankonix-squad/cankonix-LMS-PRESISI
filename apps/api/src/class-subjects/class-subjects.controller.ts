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
import { ClassSubjectsService } from './class-subjects.service';
import {
  ClassSubjectListResponseDto,
  ClassSubjectResponseDto,
} from './dto/class-subject-response.dto';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { ListClassSubjectsQueryDto } from './dto/list-class-subjects-query.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';

@ApiTags('class-subjects')
@AllowAuthenticated()
@Controller('class-subjects')
export class ClassSubjectsController {
  constructor(private readonly classSubjects: ClassSubjectsService) {}

  @Post()
  @ApiCreatedResponse({ type: ClassSubjectResponseDto })
  create(@Body() dto: CreateClassSubjectDto): Promise<ClassSubjectResponseDto> {
    return this.classSubjects.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: ClassSubjectListResponseDto })
  list(
    @Query() query: ListClassSubjectsQueryDto,
  ): Promise<ClassSubjectListResponseDto> {
    return this.classSubjects.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ClassSubjectResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClassSubjectResponseDto> {
    return this.classSubjects.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ClassSubjectResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassSubjectDto,
  ): Promise<ClassSubjectResponseDto> {
    return this.classSubjects.update(id, dto);
  }
}
