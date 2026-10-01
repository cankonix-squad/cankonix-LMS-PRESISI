import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;

/**
 * Change the Keycloak password for a linked account.
 *
 * The password is a transient argument: the API forwards it to Keycloak and never
 * writes it to the LMS database or the audit trail (the audit redaction pass
 * would mask a `password` field in any case, but the value is simply not part of
 * the snapshot).
 */
export class SetKeycloakPasswordDto {
  @ApiPropertyOptional({
    minLength: PASSWORD_MIN_LENGTH,
    description:
      'New password. Omit to trigger a Keycloak activation/reset email instead.',
  })
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password?: string;

  @ApiPropertyOptional({
    default: true,
    description:
      'When true the password is a one-time credential the user must change at first login.',
  })
  @IsOptional()
  @IsBoolean()
  temporary?: boolean;
}
