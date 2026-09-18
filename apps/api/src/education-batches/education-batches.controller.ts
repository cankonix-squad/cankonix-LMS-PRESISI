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
import { CreateEducationBatchDto } from './dto/create-education-batch.dto';
import {
  EducationBatchListResponseDto,
  EducationBatchResponseDto,
} from './dto/education-batch-response.dto';
import { ListEducationBatchesQueryDto } from './dto/list-education-batches-query.dto';
import { UpdateEducationBatchDto } from './dto/update-education-batch.dto';
import { EducationBatchesService } from './education-batches.service';

@ApiTags('education-batches')
@AllowAuthenticated()
@Controller('education-batches')
export class EducationBatchesController {
  constructor(private readonly batches: EducationBatchesService) {}

  @Post()
  @ApiCreatedResponse({ type: EducationBatchResponseDto })
  create(
    @Body() dto: CreateEducationBatchDto,
  ): Promise<EducationBatchResponseDto> {
    return this.batches.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: EducationBatchListResponseDto })
  list(
    @Query() query: ListEducationBatchesQueryDto,
  ): Promise<EducationBatchListResponseDto> {
    return this.batches.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: EducationBatchResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EducationBatchResponseDto> {
    return this.batches.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: EducationBatchResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEducationBatchDto,
  ): Promise<EducationBatchResponseDto> {
    return this.batches.update(id, dto);
  }
}
