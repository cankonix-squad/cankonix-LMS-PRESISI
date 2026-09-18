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
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedPrincipal } from '../auth/auth.types';
import { AllowAuthenticated } from '../authorization/authorization.decorators';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { ListStoredFilesQueryDto } from './dto/list-stored-files-query.dto';
import {
  DownloadUrlResponseDto,
  InitiateUploadResponseDto,
  StoredFileListResponseDto,
  StoredFileResponseDto,
  UploadPolicyResponseDto,
} from './dto/stored-file-response.dto';
import { FilesService } from './files.service';

/**
 * File routes (TASK-022).
 *
 * Authorization shape: the routes carry `@AllowAuthenticated()` as the
 * foundation baseline (documented carry-forward risk, identical to the other
 * education-domain controllers). The authorization decision that actually
 * matters for confidentiality is the one taken *before* a download URL is
 * minted: a signed URL is a bearer capability, so by the time this controller
 * returns one the caller must already be entitled to the file. That check
 * belongs to the owning domain (submission, content, certificate) and is
 * enforced there; this controller never signs a URL for an unowned id.
 */
@ApiTags('files')
@AllowAuthenticated()
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  /**
   * Declared before `:id` so the literal path wins.
   */
  @Get('upload-policy')
  @ApiOkResponse({ type: UploadPolicyResponseDto })
  getUploadPolicy(): UploadPolicyResponseDto {
    return this.files.getUploadPolicy();
  }

  @Post('uploads')
  @ApiCreatedResponse({ type: InitiateUploadResponseDto })
  initiateUpload(
    @Body() dto: InitiateUploadDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<InitiateUploadResponseDto> {
    return this.files.initiateUpload(user.accountId, dto);
  }

  @Post(':id/complete')
  @ApiOkResponse({ type: StoredFileResponseDto })
  completeUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteUploadDto,
  ): Promise<StoredFileResponseDto> {
    return this.files.completeUpload(id, dto);
  }

  @Get()
  @ApiOkResponse({ type: StoredFileListResponseDto })
  list(
    @Query() query: ListStoredFilesQueryDto,
  ): Promise<StoredFileListResponseDto> {
    return this.files.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: StoredFileResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StoredFileResponseDto> {
    return this.files.findOne(id);
  }

  @Get(':id/download-url')
  @ApiOkResponse({ type: DownloadUrlResponseDto })
  createDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<DownloadUrlResponseDto> {
    return this.files.createDownloadUrl(id, user.accountId);
  }

  @Patch(':id/activate')
  @ApiOkResponse({ type: StoredFileResponseDto })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StoredFileResponseDto> {
    return this.files.activate(id);
  }

  @Patch(':id/archive')
  @ApiOkResponse({ type: StoredFileResponseDto })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StoredFileResponseDto> {
    return this.files.archive(id);
  }
}
