import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum CertificateStatusDto {
  ISSUED = 'ISSUED',
  REVOKED = 'REVOKED',
}

/**
 * Issues a certificate from an approved graduation decision.
 *
 * Note what is *not* accepted here: holder name, program, batch, issue date, and
 * the certificate number. The holder is derived from the decision's enrollment,
 * and the number and verification code are generated server-side with a CSPRNG.
 * A certificate is a consequence of a decision, not an arbitrary write, so a
 * caller cannot mint one for a person of their choosing.
 */
export class IssueCertificateDto {
  @ApiProperty({
    format: 'uuid',
    description: 'An approved PASS graduation decision',
  })
  @IsUUID()
  decisionId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'An ACTIVE certificate template',
  })
  @IsUUID()
  templateId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  issuedByUserId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'A confirmed stored file (TASK-022) to attach as the rendered document',
  })
  @IsOptional()
  @IsUUID()
  fileId?: string | null;
}

export class AttachCertificateFileDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fileId!: string;
}

export class ListCertificatesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ enum: CertificateStatusDto })
  @IsOptional()
  @IsEnum(CertificateStatusDto)
  status?: CertificateStatusDto;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class VerifyCertificateQueryDto {
  @ApiProperty({
    maxLength: 128,
    description: 'Verification code printed on the certificate',
  })
  @IsString()
  @MaxLength(128)
  code!: string;
}
