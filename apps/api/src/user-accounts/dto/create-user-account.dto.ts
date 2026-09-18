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
 * Deliberately contains no password field. Credentials live in Keycloak; the
 * LMS database stores identity linkage and lifecycle only.
 */
export class CreateUserAccountDto {
  @ApiPropertyOptional({
    description: 'External identity provider subject identifier',
    example: 'a1b2c3d4-0000-0000-0000-000000000000',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  externalAuthId?: string;

  @ApiPropertyOptional({ example: 'budi.santoso' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  username?: string;

  @ApiPropertyOptional({ example: 'budi.santoso@polri.go.id' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    enum: UserAccountStatusDto,
    default: UserAccountStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserAccountStatusDto)
  status?: UserAccountStatusDto;
}
