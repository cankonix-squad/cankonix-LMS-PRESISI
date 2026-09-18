import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserAccountStatusDto } from '../../user-accounts/dto/user-account-status.dto';

/**
 * Identity of the authenticated caller.
 *
 * Roles, permissions and scopes are intentionally absent: Keycloak answers who
 * the caller is, and authorization is resolved by the LMS itself.
 */
export class CurrentUserResponseDto {
  @ApiProperty({ format: 'uuid' }) accountId!: string;
  @ApiProperty({ format: 'uuid' }) personId!: string;
  @ApiProperty({ example: '87001' }) personnelNumber!: string;
  @ApiProperty({ example: 'Budi Santoso' }) fullName!: string;
  @ApiPropertyOptional({ nullable: true }) username!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiProperty({ enum: UserAccountStatusDto })
  accountStatus!: UserAccountStatusDto;
}
