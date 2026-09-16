import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatusDto } from './organization-status.dto';

export class OrganizationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) parentId!:
    string | null;
  @ApiPropertyOptional({ nullable: true }) organizationType!: string | null;
  @ApiProperty({ enum: OrganizationStatusDto }) status!: OrganizationStatusDto;
  @ApiPropertyOptional({ nullable: true }) metadata!: unknown;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class OrganizationTreeResponseDto extends OrganizationResponseDto {
  @ApiProperty({ type: () => [OrganizationTreeResponseDto] })
  children!: OrganizationTreeResponseDto[];
}

export class OrganizationListResponseDto {
  @ApiProperty({ type: [OrganizationResponseDto] })
  data!: OrganizationResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
