import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { UserAccountStatusDto } from './user-account-status.dto';

/**
 * Query for the account directory.
 *
 * `search` matches login metadata (username/email) *and* the owner's identity
 * (full name, personnel number), because the row shows both and an operator
 * searches a person, not a column.
 */
export class ListUserAccountsQueryDto {
  @ApiPropertyOptional({
    description:
      'Matches username, account email, personnel number, or the owner full name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserAccountStatusDto })
  @IsOptional()
  @IsEnum(UserAccountStatusDto)
  status?: UserAccountStatusDto;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
