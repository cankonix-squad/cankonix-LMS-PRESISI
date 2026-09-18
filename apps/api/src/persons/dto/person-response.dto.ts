import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonStatusDto } from './person-status.dto';

export class PersonResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() personnelNumber!: string;
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional({ nullable: true }) rank!: string | null;
  @ApiPropertyOptional({ nullable: true }) title!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiProperty({ enum: PersonStatusDto }) status!: PersonStatusDto;
  @ApiPropertyOptional({ nullable: true }) metadata!: unknown;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PersonListResponseDto {
  @ApiProperty({ type: [PersonResponseDto] })
  data!: PersonResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
