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
import { CreateEducationProgramDto } from './dto/create-education-program.dto';
import {
  EducationProgramListResponseDto,
  EducationProgramResponseDto,
} from './dto/education-program-response.dto';
import { ListEducationProgramsQueryDto } from './dto/list-education-programs-query.dto';
import { UpdateEducationProgramDto } from './dto/update-education-program.dto';
import { EducationProgramsService } from './education-programs.service';

/**
 * Education program master data (TASK-010).
 *
 * The route is intentionally allow-listed for authenticated callers in the same
 * style as the preceding foundation tasks: the fail-closed PermissionGuard
 * still enforces a real decision, and this module's permission vocabulary is
 * owned by the task that adds it.
 */
@ApiTags('education-programs')
@AllowAuthenticated()
@Controller('education-programs')
export class EducationProgramsController {
  constructor(private readonly programs: EducationProgramsService) {}

  @Post()
  @ApiCreatedResponse({ type: EducationProgramResponseDto })
  create(
    @Body() dto: CreateEducationProgramDto,
  ): Promise<EducationProgramResponseDto> {
    return this.programs.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: EducationProgramListResponseDto })
  list(
    @Query() query: ListEducationProgramsQueryDto,
  ): Promise<EducationProgramListResponseDto> {
    return this.programs.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: EducationProgramResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EducationProgramResponseDto> {
    return this.programs.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: EducationProgramResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEducationProgramDto,
  ): Promise<EducationProgramResponseDto> {
    return this.programs.update(id, dto);
  }
}
