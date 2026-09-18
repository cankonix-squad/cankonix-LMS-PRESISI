import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserAccountStatusDto } from './user-account-status.dto';

export class UserAccountResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) personId!: string;
  @ApiPropertyOptional({ nullable: true }) externalAuthId!: string | null;
  @ApiPropertyOptional({ nullable: true }) username!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiProperty({ enum: UserAccountStatusDto })
  status!: UserAccountStatusDto;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) lastLoginAt!:
    string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
