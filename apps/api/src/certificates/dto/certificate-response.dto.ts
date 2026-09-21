import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CertificateStatusDto } from './certificate.dto';
import { CertificateTemplateStatusDto } from './certificate-template.dto';

export class CertificateTemplateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ description: 'Monotonic version within `code`' })
  version!: number;

  @ApiProperty({ enum: CertificateTemplateStatusDto })
  status!: CertificateTemplateStatusDto;

  @ApiPropertyOptional({ nullable: true })
  templateObjectKey?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  config?: Record<string, unknown> | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class CertificateTemplateListResponseDto {
  @ApiProperty({ type: [CertificateTemplateResponseDto] })
  data!: CertificateTemplateResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

/**
 * An issued certificate as returned to authenticated callers.
 *
 * This still omits the verification code: a reader who can list certificates
 * should not automatically be able to hand out public-verification keys.
 */
export class CertificateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  decisionId!: string;

  @ApiProperty({ format: 'uuid' })
  templateId!: string;

  @ApiProperty()
  certificateNumber!: string;

  @ApiProperty({ enum: CertificateStatusDto })
  status!: CertificateStatusDto;

  @ApiProperty({ format: 'date-time' })
  issuedAt!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  issuedByUserId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  fileId?: string | null;

  @ApiProperty({ description: 'Holder name as recorded on the document' })
  holderName!: string;

  @ApiProperty()
  programName!: string;

  @ApiProperty()
  batchName!: string;

  @ApiProperty()
  templateName!: string;

  @ApiProperty()
  templateVersion!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class CertificateListResponseDto {
  @ApiProperty({ type: [CertificateResponseDto] })
  data!: CertificateResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

/**
 * The public verification projection.
 *
 * Every field here is served to an unauthenticated caller. See
 * `PUBLIC_CERTIFICATE_FIELDS` in `certificate-rules.ts`: the shape is fixed and a
 * test asserts it, so internal fields cannot be added to the response by
 * accident.
 */
export class PublicCertificateResponseDto {
  @ApiProperty({ description: 'True only while the certificate is ISSUED' })
  valid!: boolean;

  @ApiProperty({ enum: CertificateStatusDto })
  status!: CertificateStatusDto;

  @ApiProperty()
  certificateNumber!: string;

  @ApiProperty()
  holderName!: string;

  @ApiProperty()
  programName!: string;

  @ApiProperty()
  batchName!: string;

  @ApiProperty()
  templateName!: string;

  @ApiProperty()
  templateVersion!: number;

  @ApiProperty({ format: 'date-time' })
  issuedAt!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Present when revoked' })
  revokedReason?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Present when revoked' })
  revokedAt?: string | null;
}
