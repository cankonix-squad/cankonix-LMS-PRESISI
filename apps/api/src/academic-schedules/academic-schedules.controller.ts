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
import { AcademicSchedulesService } from './academic-schedules.service';
import {
  AcademicScheduleListResponseDto,
  AcademicScheduleResponseDto,
} from './dto/academic-schedule-response.dto';
import { CreateAcademicScheduleDto } from './dto/create-academic-schedule.dto';
import { ListAcademicSchedulesQueryDto } from './dto/list-academic-schedules-query.dto';
import { UpdateAcademicScheduleDto } from './dto/update-academic-schedule.dto';

@ApiTags('academic-schedules')
@AllowAuthenticated()
@Controller('academic-schedules')
export class AcademicSchedulesController {
  constructor(private readonly schedules: AcademicSchedulesService) {}

  @Post()
  @ApiCreatedResponse({ type: AcademicScheduleResponseDto })
  create(
    @Body() dto: CreateAcademicScheduleDto,
  ): Promise<AcademicScheduleResponseDto> {
    return this.schedules.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: AcademicScheduleListResponseDto })
  list(
    @Query() query: ListAcademicSchedulesQueryDto,
  ): Promise<AcademicScheduleListResponseDto> {
    return this.schedules.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: AcademicScheduleResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AcademicScheduleResponseDto> {
    return this.schedules.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: AcademicScheduleResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicScheduleDto,
  ): Promise<AcademicScheduleResponseDto> {
    return this.schedules.update(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOkResponse({ type: AcademicScheduleResponseDto })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AcademicScheduleResponseDto> {
    return this.schedules.cancel(id);
  }
}
