import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { FILE_NAMESPACES } from '../object-key';
import { StoredFileStatusDto } from './stored-file-status.dto';

export class ListStoredFilesQueryDto {
  @ApiPropertyOptional({ enum: FILE_NAMESPACES })
  @IsOptional()
  @IsEnum(FILE_NAMESPACES)
  namespace?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @ApiPropertyOptional({ enum: StoredFileStatusDto })
  @IsOptional()
  @IsEnum(StoredFileStatusDto)
  status?: StoredFileStatusDto;

  @ApiPropertyOptional({ description: 'Search by original filename' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
