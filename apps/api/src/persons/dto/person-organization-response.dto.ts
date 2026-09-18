import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonOrganizationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) personId!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiPropertyOptional({ nullable: true }) positionName!: string | null;
  @ApiProperty({ format: 'date' }) startDate!: string;
  @ApiPropertyOptional({ format: 'date', nullable: true }) endDate!:
    string | null;
  @ApiProperty() isPrimary!: boolean;
  @ApiProperty({
    description: 'True while the placement has no end date',
  })
  isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
