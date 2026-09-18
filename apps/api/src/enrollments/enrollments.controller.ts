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
import {
  EnrollmentListResponseDto,
  EnrollmentResponseDto,
} from './dto/enrollment-response.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ListEnrollmentsQueryDto } from './dto/list-enrollments-query.dto';
import { TransferEnrollmentClassDto } from './dto/transfer-enrollment-class.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('enrollments')
@AllowAuthenticated()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Post()
  @ApiCreatedResponse({ type: EnrollmentResponseDto })
  create(@Body() dto: CreateEnrollmentDto): Promise<EnrollmentResponseDto> {
    return this.enrollments.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: EnrollmentListResponseDto })
  list(
    @Query() query: ListEnrollmentsQueryDto,
  ): Promise<EnrollmentListResponseDto> {
    return this.enrollments.list(query);
  }

  /**
   * Person education history. Declared before `:id` so the static segment is not
   * captured by the UUID parameter route.
   */
  @Get('persons/:personId')
  @ApiOkResponse({ type: [EnrollmentResponseDto] })
  listByPerson(
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<EnrollmentResponseDto[]> {
    return this.enrollments.listByPerson(personId);
  }

  @Get(':id')
  @ApiOkResponse({ type: EnrollmentResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollments.findOne(id);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: EnrollmentResponseDto })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnrollmentStatusDto,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollments.changeStatus(id, dto);
  }

  @Patch(':id/class')
  @ApiOkResponse({ type: EnrollmentResponseDto })
  transferClass(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferEnrollmentClassDto,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollments.transferClass(id, dto);
  }
}
