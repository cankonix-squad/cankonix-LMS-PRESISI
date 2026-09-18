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
import { AcademicClassesService } from './academic-classes.service';
import {
  AcademicClassListResponseDto,
  AcademicClassResponseDto,
} from './dto/academic-class-response.dto';
import { CreateAcademicClassDto } from './dto/create-academic-class.dto';
import { ListAcademicClassesQueryDto } from './dto/list-academic-classes-query.dto';
import { UpdateAcademicClassDto } from './dto/update-academic-class.dto';

@ApiTags('academic-classes')
@AllowAuthenticated()
@Controller('academic-classes')
export class AcademicClassesController {
  constructor(private readonly academicClasses: AcademicClassesService) {}

  @Post()
  @ApiCreatedResponse({ type: AcademicClassResponseDto })
  create(
    @Body() dto: CreateAcademicClassDto,
  ): Promise<AcademicClassResponseDto> {
    return this.academicClasses.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: AcademicClassListResponseDto })
  list(
    @Query() query: ListAcademicClassesQueryDto,
  ): Promise<AcademicClassListResponseDto> {
    return this.academicClasses.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: AcademicClassResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AcademicClassResponseDto> {
    return this.academicClasses.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: AcademicClassResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicClassDto,
  ): Promise<AcademicClassResponseDto> {
    return this.academicClasses.update(id, dto);
  }
}
