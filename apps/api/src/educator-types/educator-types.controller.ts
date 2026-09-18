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
import { CreateEducatorTypeDto } from './dto/create-educator-type.dto';
import {
  EducatorTypeListResponseDto,
  EducatorTypeResponseDto,
} from './dto/educator-type-response.dto';
import { ListEducatorTypesQueryDto } from './dto/list-educator-types-query.dto';
import { UpdateEducatorTypeDto } from './dto/update-educator-type.dto';
import { EducatorTypesService } from './educator-types.service';

@ApiTags('educator-types')
@AllowAuthenticated()
@Controller('educator-types')
export class EducatorTypesController {
  constructor(private readonly educatorTypes: EducatorTypesService) {}

  @Post()
  @ApiCreatedResponse({ type: EducatorTypeResponseDto })
  create(@Body() dto: CreateEducatorTypeDto): Promise<EducatorTypeResponseDto> {
    return this.educatorTypes.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: EducatorTypeListResponseDto })
  list(
    @Query() query: ListEducatorTypesQueryDto,
  ): Promise<EducatorTypeListResponseDto> {
    return this.educatorTypes.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: EducatorTypeResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EducatorTypeResponseDto> {
    return this.educatorTypes.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: EducatorTypeResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEducatorTypeDto,
  ): Promise<EducatorTypeResponseDto> {
    return this.educatorTypes.update(id, dto);
  }
}
