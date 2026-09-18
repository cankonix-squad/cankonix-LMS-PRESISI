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
import { CreateEducatorAssignmentDto } from './dto/create-educator-assignment.dto';
import { EndEducatorAssignmentDto } from './dto/end-educator-assignment.dto';
import {
  EducatorAssignmentListResponseDto,
  EducatorAssignmentResponseDto,
} from './dto/educator-assignment-response.dto';
import { ListEducatorAssignmentsQueryDto } from './dto/list-educator-assignments-query.dto';
import { UpdateEducatorAssignmentDto } from './dto/update-educator-assignment.dto';
import { EducatorAssignmentsService } from './educator-assignments.service';

@ApiTags('educator-assignments')
@AllowAuthenticated()
@Controller('educator-assignments')
export class EducatorAssignmentsController {
  constructor(private readonly assignments: EducatorAssignmentsService) {}

  @Post()
  @ApiCreatedResponse({ type: EducatorAssignmentResponseDto })
  create(
    @Body() dto: CreateEducatorAssignmentDto,
  ): Promise<EducatorAssignmentResponseDto> {
    return this.assignments.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: EducatorAssignmentListResponseDto })
  list(
    @Query() query: ListEducatorAssignmentsQueryDto,
  ): Promise<EducatorAssignmentListResponseDto> {
    return this.assignments.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: EducatorAssignmentResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EducatorAssignmentResponseDto> {
    return this.assignments.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: EducatorAssignmentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEducatorAssignmentDto,
  ): Promise<EducatorAssignmentResponseDto> {
    return this.assignments.update(id, dto);
  }

  @Patch(':id/end')
  @ApiOkResponse({ type: EducatorAssignmentResponseDto })
  end(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndEducatorAssignmentDto,
  ): Promise<EducatorAssignmentResponseDto> {
    return this.assignments.end(id, dto);
  }
}
