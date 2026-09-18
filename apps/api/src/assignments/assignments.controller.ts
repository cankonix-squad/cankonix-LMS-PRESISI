import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedPrincipal } from '../auth/auth.types';
import { AllowAuthenticated } from '../authorization/authorization.decorators';
import {
  AssignmentListResponseDto,
  AssignmentResponseDto,
  SubmissionListResponseDto,
  SubmissionResponseDto,
  SubmitResponseDto,
} from './dto/assignment-response.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import {
  ListAssignmentsWithScopeQueryDto,
  UpdateAssignmentStatusDto,
} from './dto/update-assignment-status.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import {
  AttachSubmissionFileDto,
  ListSubmissionsQueryDto,
  SubmitAssignmentDto,
  UpdateSubmissionDto,
} from './dto/submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { AssignmentsService } from './assignments.service';
import { SubmissionsService } from './submissions.service';

/**
 * Educator-facing assignment administration (TASK-024).
 *
 * Routes are declared with the literals before the `:id` wildcard so that
 * `assignments/submissions/...` is never mistaken for `assignments/:id`.
 */
@ApiTags('assignments')
@AllowAuthenticated()
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an assignment for a learning activity' })
  async create(
    @Body() dto: CreateAssignmentDto,
  ): Promise<AssignmentResponseDto> {
    return await this.assignments.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List assignments with optional scope filters' })
  async list(
    @Query() query: ListAssignmentsWithScopeQueryDto,
  ): Promise<AssignmentListResponseDto> {
    return await this.assignments.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one assignment' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssignmentResponseDto> {
    return await this.assignments.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an assignment' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentDto,
  ): Promise<AssignmentResponseDto> {
    return await this.assignments.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Publish, close, or archive an assignment',
  })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentStatusDto,
  ): Promise<AssignmentResponseDto> {
    return await this.assignments.changeStatus(id, dto.status);
  }
}

/**
 * Participant-facing submission routes (TASK-024).
 *
 * Kept on its own base path (`assignment-submissions`) so the participant
 * endpoints cannot collide with assignment administration routes, and so the
 * authorization surface is easy to reason about: everything here is either the
 * participant's own work or an educator acting on one attempt.
 */
@ApiTags('assignment-submissions')
@AllowAuthenticated()
@Controller('assignment-submissions')
export class AssignmentSubmissionsController {
  constructor(
    private readonly submissions: SubmissionsService,
    private readonly assignments: AssignmentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List submissions with optional filters' })
  async list(
    @Query() query: ListSubmissionsQueryDto,
  ): Promise<SubmissionListResponseDto> {
    return await this.submissions.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Submit an attempt for an assignment (participant)',
  })
  async submit(
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<SubmitResponseDto> {
    // The caller may only submit their own work: the person on the token must
    // own the enrollment they are submitting through.
    return await this.submissions.submit(
      dto.assignmentId,
      dto.enrollmentId,
      user.personId,
      dto.textAnswer ?? null,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one submission with its files and grade' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubmissionResponseDto> {
    return await this.submissions.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update the text answer of a draft attempt' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubmissionDto,
  ): Promise<SubmissionResponseDto> {
    return await this.submissions.updateTextAnswer(id, dto.textAnswer ?? null);
  }

  @Post(':id/files')
  @ApiOperation({ summary: 'Attach an uploaded file to a submission' })
  async attachFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachSubmissionFileDto,
  ): Promise<SubmissionResponseDto> {
    return await this.submissions.attachFile(id, dto);
  }

  @Delete(':id/files/:storedFileId')
  @ApiOperation({ summary: 'Detach a file from a submission' })
  async detachFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('storedFileId', ParseUUIDPipe) storedFileId: string,
  ): Promise<SubmissionResponseDto> {
    return await this.submissions.detachFile(id, storedFileId);
  }

  @Post(':id/grade')
  @ApiOperation({ summary: 'Grade one attempt (educator)' })
  async grade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<SubmissionResponseDto> {
    await this.assignments.assertEducatorAuthorityBySubmission(
      id,
      user.personId,
    );
    return await this.submissions.grade(id, user.personId, dto);
  }

  @Post(':id/return')
  @ApiOperation({
    summary: 'Release a graded attempt so the participant sees the feedback',
  })
  async returnToParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<SubmissionResponseDto> {
    await this.assignments.assertEducatorAuthorityBySubmission(
      id,
      user.personId,
    );
    return await this.submissions.returnToParticipant(id);
  }
}
