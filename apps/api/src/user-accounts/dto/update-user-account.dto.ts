import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserAccountStatusDto } from './user-account-status.dto';

/**
 * Lifecycle update only: no password, and login timestamps stay server-owned.
 */
export class UpdateUserAccountDto {
  @ApiPropertyOptional({
    description: 'External identity provider subject identifier',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  externalAuthId?: string | null;

  @ApiPropertyOptional({ example: 'budi.santoso', nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  username?: string | null;

  @ApiPropertyOptional({
    example: 'budi.santoso@polri.go.id',
    nullable: true,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ enum: UserAccountStatusDto })
  @IsOptional()
  @IsEnum(UserAccountStatusDto)
  status?: UserAccountStatusDto;
}
