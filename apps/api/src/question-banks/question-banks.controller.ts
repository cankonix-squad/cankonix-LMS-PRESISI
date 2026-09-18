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
import { RequirePermissions } from '../authorization/authorization.decorators';
import {
  CreateQuestionBankDto,
  ListQuestionBanksQueryDto,
  UpdateQuestionBankDto,
} from './dto/question-bank.dto';
import {
  CreateQuestionDto,
  CreateQuestionVersionDto,
  ListQuestionTypesQueryDto,
  ListQuestionsQueryDto,
  UpdateQuestionDto,
  UpdateQuestionVersionDto,
} from './dto/question.dto';
import {
  QuestionBankListResponseDto,
  QuestionBankResponseDto,
  QuestionListResponseDto,
  QuestionResponseDto,
  QuestionTypeListResponseDto,
  QuestionVersionPublishResponseDto,
  QuestionVersionResponseDto,
  StudentQuestionListResponseDto,
  StudentQuestionDto,
} from './dto/question-response.dto';
import { QuestionBanksService } from './question-banks.service';
import { QUESTION_PERMISSIONS } from './question-permissions';

/**
 * Question banks.
 *
 * Bank and question routes are separate resources but share one controller file
 * because the question routes are always addressed through their bank
 * (`/question-banks/:bankId/questions`), which keeps the ownership check in the
 * path instead of in a query parameter.
 */
@ApiTags('question-banks')
@Controller('question-banks')
export class QuestionBanksController {
  constructor(private readonly banks: QuestionBanksService) {}

  @Post()
  @RequirePermissions(QUESTION_PERMISSIONS.BANK_MANAGE)
  @ApiCreatedResponse({ type: QuestionBankResponseDto })
  create(@Body() dto: CreateQuestionBankDto): Promise<QuestionBankResponseDto> {
    return this.banks.createBank(dto);
  }

  @Get()
  @RequirePermissions(QUESTION_PERMISSIONS.BANK_READ)
  @ApiOkResponse({ type: QuestionBankListResponseDto })
  list(
    @Query() query: ListQuestionBanksQueryDto,
  ): Promise<QuestionBankListResponseDto> {
    return this.banks.listBanks(query);
  }

  @Get(':id')
  @RequirePermissions(QUESTION_PERMISSIONS.BANK_READ)
  @ApiOkResponse({ type: QuestionBankResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionBankResponseDto> {
    return this.banks.findBank(id);
  }

  @Patch(':id')
  @RequirePermissions(QUESTION_PERMISSIONS.BANK_MANAGE)
  @ApiOkResponse({ type: QuestionBankResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionBankDto,
  ): Promise<QuestionBankResponseDto> {
    return this.banks.updateBank(id, dto);
  }

  @Post(':bankId/questions')
  @RequirePermissions(QUESTION_PERMISSIONS.MANAGE)
  @ApiCreatedResponse({ type: QuestionResponseDto })
  createQuestion(
    @Param('bankId', ParseUUIDPipe) bankId: string,
    @Body() dto: CreateQuestionDto,
  ): Promise<QuestionResponseDto> {
    return this.banks.createQuestion(bankId, dto);
  }

  @Get(':bankId/questions')
  @RequirePermissions(QUESTION_PERMISSIONS.READ)
  @ApiOkResponse({ type: QuestionListResponseDto })
  listQuestions(
    @Param('bankId', ParseUUIDPipe) bankId: string,
    @Query() query: ListQuestionsQueryDto,
  ): Promise<QuestionListResponseDto> {
    return this.banks.listQuestions(bankId, query);
  }

  /**
   * The student-safe read of a bank.
   *
   * Declared before any `:id`-style matching on the same segment depth and
   * guarded by its own permission: a participant may be granted
   * `question.participate` without ever holding `question.read`, so this route
   * can never be used as a side door to the answer key.
   */
  @Get(':bankId/questions/student')
  @RequirePermissions(QUESTION_PERMISSIONS.PARTICIPATE)
  @ApiOkResponse({ type: StudentQuestionListResponseDto })
  listStudentQuestions(
    @Param('bankId', ParseUUIDPipe) bankId: string,
    @Query() query: ListQuestionsQueryDto,
  ): Promise<StudentQuestionListResponseDto> {
    return this.banks.listStudentQuestions(bankId, query);
  }
}

@ApiTags('question-types')
@Controller('question-types')
export class QuestionTypesController {
  constructor(private readonly banks: QuestionBanksService) {}

  @Get()
  @RequirePermissions(QUESTION_PERMISSIONS.TYPE_READ)
  @ApiOkResponse({ type: QuestionTypeListResponseDto })
  list(
    @Query() query: ListQuestionTypesQueryDto,
  ): Promise<QuestionTypeListResponseDto> {
    return this.banks.listQuestionTypes(query);
  }
}

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly banks: QuestionBanksService) {}

  @Get(':id')
  @RequirePermissions(QUESTION_PERMISSIONS.READ)
  @ApiOkResponse({ type: QuestionResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionResponseDto> {
    return this.banks.findQuestion(id);
  }

  @Patch(':id')
  @RequirePermissions(QUESTION_PERMISSIONS.MANAGE)
  @ApiOkResponse({ type: QuestionResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto> {
    return this.banks.updateQuestion(id, dto);
  }

  /**
   * Appends a new version. Editing a published version is refused by the
   * service with 422 — a correction is always a new version.
   */
  @Post(':id/versions')
  @RequirePermissions(QUESTION_PERMISSIONS.MANAGE)
  @ApiCreatedResponse({ type: QuestionVersionResponseDto })
  createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuestionVersionDto,
  ): Promise<QuestionVersionResponseDto> {
    return this.banks.createVersion(id, dto);
  }

  /**
   * Edit a DRAFT version only. Kept separate from the version list so the
   * immutability guard is applied on exactly one code path.
   */
  @Patch(':id/versions/:versionId')
  @RequirePermissions(QUESTION_PERMISSIONS.MANAGE)
  @ApiOkResponse({ type: QuestionVersionResponseDto })
  updateVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: UpdateQuestionVersionDto,
  ): Promise<QuestionVersionResponseDto> {
    return this.banks.updateVersion(id, versionId, dto);
  }

  /**
   * Freezes the version and supersedes the previous published one atomically.
   */
  @Post(':id/versions/:versionId/publish')
  @RequirePermissions(QUESTION_PERMISSIONS.MANAGE)
  @ApiCreatedResponse({ type: QuestionVersionPublishResponseDto })
  publishVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ): Promise<QuestionVersionPublishResponseDto> {
    return this.banks.publishVersion(id, versionId);
  }

  /**
   * The student-safe projection of one published version. No `scoringRule`, no
   * `explanation`, no `isCorrect` — see `StudentQuestionDto`.
   */
  @Get(':id/versions/:versionId/student')
  @RequirePermissions(QUESTION_PERMISSIONS.PARTICIPATE)
  @ApiOkResponse({ type: StudentQuestionDto })
  findStudentVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ): Promise<StudentQuestionDto> {
    return this.banks.findStudentVersion(id, versionId);
  }
}
