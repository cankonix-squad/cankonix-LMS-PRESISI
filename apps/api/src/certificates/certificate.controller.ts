import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { AuthenticatedPrincipal } from '../auth/auth.types';
import { CurrentUser, Public } from '../auth/auth.decorators';
import { CertificateService } from './certificate.service';
import { CERTIFICATE_PERMISSIONS } from './certificate-permissions';
import {
  ChangeCertificateTemplateStatusDto,
  CreateCertificateTemplateDto,
  CreateCertificateTemplateVersionDto,
  ListCertificateTemplatesQueryDto,
  UpdateCertificateTemplateDto,
} from './dto/certificate-template.dto';
import {
  AttachCertificateFileDto,
  CertificateStatusDto,
  IssueCertificateDto,
  ListCertificatesQueryDto,
  VerifyCertificateQueryDto,
} from './dto/certificate.dto';
import { RevokeCertificateDto } from './dto/certificate-revocation.dto';
import {
  CertificateListResponseDto,
  CertificateResponseDto,
  CertificateTemplateListResponseDto,
  CertificateTemplateResponseDto,
  PublicCertificateResponseDto,
} from './dto/certificate-response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Certificate templates (TASK-054).
 *
 * Template authoring is separated from issuance (`certificate.template.*` vs
 * `certificate.issue`) because designing a document and minting one are
 * different authorities. The version is never taken from the body: it is
 * assigned by the service, so a client cannot claim a version number that would
 * reinterpret certificates already in circulation.
 */
@ApiTags('certificate-templates')
@Controller('certificate-templates')
export class CertificateTemplatesController {
  constructor(private readonly certificates: CertificateService) {}

  @Post()
  @RequirePermissions(CERTIFICATE_PERMISSIONS.TEMPLATE_MANAGE)
  @ApiCreatedResponse({ type: CertificateTemplateResponseDto })
  async create(
    @Body() dto: CreateCertificateTemplateDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<CertificateTemplateResponseDto> {
    return toTemplateResponse(
      await this.certificates.createTemplate(dto, user.accountId),
    );
  }

  @Get()
  @RequirePermissions(CERTIFICATE_PERMISSIONS.TEMPLATE_READ)
  @ApiOkResponse({ type: CertificateTemplateListResponseDto })
  async list(
    @Query() query: ListCertificateTemplatesQueryDto,
  ): Promise<CertificateTemplateListResponseDto> {
    const result = await this.certificates.listTemplates(query);
    return {
      data: result.data.map(toTemplateResponse),
      total: result.total,
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
    };
  }

  @Get(':id')
  @RequirePermissions(CERTIFICATE_PERMISSIONS.TEMPLATE_READ)
  @ApiOkResponse({ type: CertificateTemplateResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CertificateTemplateResponseDto> {
    return toTemplateResponse(await this.certificates.findTemplate(id));
  }

  @Patch(':id')
  @RequirePermissions(CERTIFICATE_PERMISSIONS.TEMPLATE_MANAGE)
  @ApiOkResponse({ type: CertificateTemplateResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCertificateTemplateDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<CertificateTemplateResponseDto> {
    return toTemplateResponse(
      await this.certificates.updateTemplate(id, dto, user.accountId),
    );
  }

  @Patch(':id/status')
  @RequirePermissions(CERTIFICATE_PERMISSIONS.TEMPLATE_MANAGE)
  @ApiOkResponse({ type: CertificateTemplateResponseDto })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeCertificateTemplateStatusDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<CertificateTemplateResponseDto> {
    return toTemplateResponse(
      await this.certificates.changeTemplateStatus(id, dto, user.accountId),
    );
  }

  @Post(':id/versions')
  @RequirePermissions(CERTIFICATE_PERMISSIONS.TEMPLATE_MANAGE)
  @ApiCreatedResponse({ type: CertificateTemplateResponseDto })
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCertificateTemplateVersionDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<CertificateTemplateResponseDto> {
    return toTemplateResponse(
      await this.certificates.createTemplateVersion(id, dto, user.accountId),
    );
  }
}

/**
 * Issued certificates (TASK-054).
 *
 * `verify` deliberately lives on this controller but is annotated `@Public()`.
 * The service gates every other route with permissions, and `PermissionGuard`
 * passes a route through untouched once `@Public()` is present, so placing the
 * open route alongside the guarded ones keeps the two behaviours visible in one
 * place rather than hiding the exception in a separate controller.
 */
@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificateService) {}

  @Post()
  @RequirePermissions(CERTIFICATE_PERMISSIONS.ISSUE)
  @ApiCreatedResponse({ type: CertificateResponseDto })
  async issue(
    @Body() dto: IssueCertificateDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<CertificateResponseDto> {
    return toCertificateResponse(
      await this.certificates.issueCertificate(dto, user.accountId),
    );
  }

  @Get()
  @RequirePermissions(CERTIFICATE_PERMISSIONS.READ)
  @ApiOkResponse({ type: CertificateListResponseDto })
  async list(
    @Query() query: ListCertificatesQueryDto,
  ): Promise<CertificateListResponseDto> {
    const result = await this.certificates.list(query);
    return {
      data: result.data.map(toCertificateResponse),
      total: result.total,
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
    };
  }

  /**
   * Public verification by printed code.
   *
   * No authentication and no permission: whoever holds the document must be able
   * to check it. The response is a fixed minimal projection (see
   * `PUBLIC_CERTIFICATE_FIELDS`), and an unknown code yields `valid: false`
   * rather than a 404, so the endpoint cannot be used to discover which codes
   * exist.
   */
  @Get('verify')
  @Public()
  @ApiOkResponse({ type: PublicCertificateResponseDto })
  @ApiNotFoundResponse({ description: 'No certificate matches this code' })
  async verify(
    @Query() query: VerifyCertificateQueryDto,
  ): Promise<PublicCertificateResponseDto> {
    const projection = await this.certificates.verifyByCode(query.code);
    if (!projection) {
      throw new NotFoundException(
        'No certificate matches the verification code',
      );
    }
    return {
      valid: projection.valid,
      status: projection.status as CertificateStatusDto,
      certificateNumber: projection.certificateNumber,
      holderName: projection.holderName,
      programName: projection.programName,
      batchName: projection.batchName,
      templateName: projection.templateName,
      templateVersion: projection.templateVersion,
      issuedAt: projection.issuedAt,
      revokedReason: projection.revokedReason,
      revokedAt: projection.revokedAt,
    };
  }

  @Get(':id')
  @RequirePermissions(CERTIFICATE_PERMISSIONS.READ)
  @ApiOkResponse({ type: CertificateResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CertificateResponseDto> {
    return toCertificateResponse(await this.certificates.findOne(id));
  }

  @Patch(':id/file')
  @RequirePermissions(CERTIFICATE_PERMISSIONS.ISSUE)
  @ApiOkResponse({ type: CertificateResponseDto })
  async attachFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachCertificateFileDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<CertificateResponseDto> {
    return toCertificateResponse(
      await this.certificates.attachFile(id, dto, user.accountId),
    );
  }

  /**
   * Withdraws an issued certificate (TASK-055).
   *
   * Guarded by `certificate.revoke` rather than `certificate.issue`: the ability
   * to invalidate a document an institution already put its name to should be
   * separately grantable from the ability to create one.
   */
  @Patch(':id/revoke')
  @RequirePermissions(CERTIFICATE_PERMISSIONS.REVOKE)
  @ApiOkResponse({ type: CertificateResponseDto })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeCertificateDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<CertificateResponseDto> {
    return toCertificateResponse(
      await this.certificates.revokeCertificate(id, dto, user.accountId),
    );
  }
}

function toTemplateResponse(template: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  version: number;
  status: string;
  templateObjectKey: string | null;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}): CertificateTemplateResponseDto {
  return {
    id: template.id,
    code: template.code,
    name: template.name,
    description: template.description,
    version: template.version,
    status: template.status as never,
    templateObjectKey: template.templateObjectKey,
    config: (template.config ?? null) as Record<string, unknown> | null,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function toCertificateResponse(certificate: {
  id: string;
  decisionId: string;
  templateId: string;
  certificateNumber: string;
  status: string;
  issuedAt: Date;
  issuedByUserId: string | null;
  fileId: string | null;
  holderFullName: string;
  educationProgramName: string;
  educationBatchName: string;
  templateName: string;
  templateVersion: number;
  createdAt: Date;
}): CertificateResponseDto {
  return {
    id: certificate.id,
    decisionId: certificate.decisionId,
    templateId: certificate.templateId,
    certificateNumber: certificate.certificateNumber,
    status: certificate.status as never,
    issuedAt: certificate.issuedAt.toISOString(),
    issuedByUserId: certificate.issuedByUserId,
    fileId: certificate.fileId,
    holderName: certificate.holderFullName,
    programName: certificate.educationProgramName,
    batchName: certificate.educationBatchName,
    templateName: certificate.templateName,
    templateVersion: certificate.templateVersion,
    createdAt: certificate.createdAt.toISOString(),
  };
}
