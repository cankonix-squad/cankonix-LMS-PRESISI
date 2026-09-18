import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { SaveAttemptAnswerDto, StartAttemptDto } from './dto/attempt.dto';
import { AttemptsService } from './attempts.service';
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}
  @Post()
  @RequirePermissions('exam.attempt.manage')
  start(@Body() dto: StartAttemptDto) {
    return this.attempts.start(dto);
  }
  @Get(':id')
  @RequirePermissions('exam.attempt.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.attempts.get(id);
  }
  @Post(':id/submit')
  @RequirePermissions('exam.attempt.manage')
  submit(@Param('id', ParseUUIDPipe) id: string) {
    return this.attempts.submit(id);
  }
  @Put(':attemptId/questions/:attemptQuestionId/answer')
  @RequirePermissions('exam.attempt.manage')
  saveAnswer(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Param('attemptQuestionId', ParseUUIDPipe) attemptQuestionId: string,
    @Body() dto: SaveAttemptAnswerDto,
  ) {
    return this.attempts.saveAnswer(attemptId, attemptQuestionId, dto);
  }
}
