import { ApiProperty } from '@nestjs/swagger';
import { PersonStatusDto } from '../../persons/dto/person-status.dto';
import { UserAccountResponseDto } from './user-account-response.dto';

/**
 * Owner identity as read from `Person`.
 *
 * Read-only projection: an account form must never collect these again. The
 * person status travels with it so the UI can show "identitas Nonaktif" beside
 * "akun Aktif" without implying the two move together.
 */
export class UserAccountPersonResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() personnelNumber!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ nullable: true }) rank!: string | null;
  @ApiProperty({ nullable: true }) title!: string | null;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ enum: PersonStatusDto }) status!: PersonStatusDto;
}

export class UserAccountWithPersonResponseDto extends UserAccountResponseDto {
  @ApiProperty({ type: UserAccountPersonResponseDto })
  person!: UserAccountPersonResponseDto;
}

export class UserAccountListResponseDto {
  @ApiProperty({ type: [UserAccountWithPersonResponseDto] })
  data!: UserAccountWithPersonResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
