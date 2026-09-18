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
import {
  AddParticipantDto,
  ChangeSessionStatusDto,
  CreateSessionDto,
} from './dto/session.dto';
import { ExamSessionsService } from './exam-sessions.service';
@Controller('exam-sessions')
export class ExamSessionsController {
  constructor(private readonly sessions: ExamSessionsService) {}
  @Post() @RequirePermissions('exam.session.manage') create(
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessions.create(dto);
  }
  @Get(':id') @RequirePermissions('exam.session.read') get(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessions.get(id);
  }
  @Patch(':id/status') @RequirePermissions('exam.session.manage') status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeSessionStatusDto,
  ) {
    return this.sessions.status(id, dto);
  }
  @Post(':id/participants')
  @RequirePermissions('exam.session.manage')
  participant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddParticipantDto,
  ) {
    return this.sessions.addParticipant(id, dto);
  }
}
