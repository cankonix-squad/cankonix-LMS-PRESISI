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
import { ClassStaffAssignmentsService } from './class-staff-assignments.service';
import {
  ClassStaffAssignmentListResponseDto,
  ClassStaffAssignmentResponseDto,
} from './dto/class-staff-assignment-response.dto';
import { CreateClassStaffAssignmentDto } from './dto/create-class-staff-assignment.dto';
import { EndClassStaffAssignmentDto } from './dto/end-class-staff-assignment.dto';
import { ListClassStaffAssignmentsQueryDto } from './dto/list-class-staff-assignments-query.dto';
import { UpdateClassStaffAssignmentDto } from './dto/update-class-staff-assignment.dto';

@ApiTags('class-staff-assignments')
@AllowAuthenticated()
@Controller('class-staff-assignments')
export class ClassStaffAssignmentsController {
  constructor(private readonly assignments: ClassStaffAssignmentsService) {}

  @Post()
  @ApiCreatedResponse({ type: ClassStaffAssignmentResponseDto })
  create(
    @Body() dto: CreateClassStaffAssignmentDto,
  ): Promise<ClassStaffAssignmentResponseDto> {
    return this.assignments.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: ClassStaffAssignmentListResponseDto })
  list(
    @Query() query: ListClassStaffAssignmentsQueryDto,
  ): Promise<ClassStaffAssignmentListResponseDto> {
    return this.assignments.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ClassStaffAssignmentResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClassStaffAssignmentResponseDto> {
    return this.assignments.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ClassStaffAssignmentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassStaffAssignmentDto,
  ): Promise<ClassStaffAssignmentResponseDto> {
    return this.assignments.update(id, dto);
  }

  @Patch(':id/end')
  @ApiOkResponse({ type: ClassStaffAssignmentResponseDto })
  end(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndClassStaffAssignmentDto,
  ): Promise<ClassStaffAssignmentResponseDto> {
    return this.assignments.end(id, dto);
  }
}
