import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Completion report for an upload.
 *
 * The values are advisory: the service compares them with what it can confirm
 * and never trusts the client's word that the bytes arrived. `checksum` is
 * recorded for integrity checks by later tasks.
 */
export class CompleteUploadDto {
  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({ maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  checksum?: string;
}
