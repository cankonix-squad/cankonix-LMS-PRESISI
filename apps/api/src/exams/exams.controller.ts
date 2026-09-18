import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { EXAM_PERMISSIONS } from './exam-permissions';
import {
  ChangeExamStatusDto,
  CreateBlueprintDto,
  CreateExamDto,
  UpdateExamDto,
} from './dto/exam.dto';
import { ExamsService } from './exams.service';
@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}
  @Post() @RequirePermissions(EXAM_PERMISSIONS.MANAGE) create(
    @Body() dto: CreateExamDto,
  ) {
    return this.exams.create(dto);
  }
  @Get(':id') @RequirePermissions(EXAM_PERMISSIONS.READ) get(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.exams.get(id);
  }
  @Patch(':id') @RequirePermissions(EXAM_PERMISSIONS.MANAGE) update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.exams.update(id, dto);
  }
  @Post(':id/blueprint') @RequirePermissions(EXAM_PERMISSIONS.MANAGE) blueprint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBlueprintDto,
  ) {
    return this.exams.blueprint(id, dto);
  }
  @Patch(':id/status') @RequirePermissions(EXAM_PERMISSIONS.VALIDATE) status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeExamStatusDto,
  ) {
    return this.exams.status(id, dto);
  }
}
