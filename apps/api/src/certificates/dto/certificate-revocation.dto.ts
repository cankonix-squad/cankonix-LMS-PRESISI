import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Withdraws an issued certificate (TASK-055).
 *
 * The reason is mandatory and length-floored. This is the one field a verifier
 * or auditor will need later and it is the only part of the record that cannot
 * be reconstructed from anything else, so it is not optional.
 */
export class RevokeCertificateDto {
  @ApiProperty({
    minLength: 8,
    maxLength: 1000,
    description:
      'Why the certificate is being withdrawn; shown in the public verification response',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'The user performing the revocation, when not the caller',
  })
  @IsOptional()
  @IsUUID()
  revokedByUserId?: string | null;
}
