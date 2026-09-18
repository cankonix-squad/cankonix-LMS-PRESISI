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
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import {
  CurriculumListResponseDto,
  CurriculumResponseDto,
} from './dto/curriculum-response.dto';
import { ListCurriculaQueryDto } from './dto/list-curricula-query.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { CurriculaService } from './curricula.service';

@ApiTags('curricula')
@AllowAuthenticated()
@Controller('curricula')
export class CurriculaController {
  constructor(private readonly curricula: CurriculaService) {}

  @Post()
  @ApiCreatedResponse({ type: CurriculumResponseDto })
  create(@Body() dto: CreateCurriculumDto): Promise<CurriculumResponseDto> {
    return this.curricula.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: CurriculumListResponseDto })
  list(
    @Query() query: ListCurriculaQueryDto,
  ): Promise<CurriculumListResponseDto> {
    return this.curricula.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: CurriculumResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CurriculumResponseDto> {
    return this.curricula.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CurriculumResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCurriculumDto,
  ): Promise<CurriculumResponseDto> {
    return this.curricula.update(id, dto);
  }
}
