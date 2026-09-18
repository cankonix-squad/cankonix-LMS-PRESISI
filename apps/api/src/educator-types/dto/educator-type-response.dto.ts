import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EducatorTypeStatusDto } from './educator-type-status.dto';

export class EducatorTypeResponseDto {
  @ApiProperty({ example: '88888888-8888-8888-8888-888888888888' })
  id!: string;

  @ApiProperty({ example: 'GADIK' })
  code!: string;

  @ApiProperty({ example: 'Gadik (Pendidik)' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: EducatorTypeStatusDto, example: 'ACTIVE' })
  status!: EducatorTypeStatusDto;

  @ApiProperty({ example: '2026-09-22T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-22T00:00:00.000Z' })
  updatedAt!: string;
}

export class EducatorTypeListResponseDto {
  @ApiProperty({ type: () => [EducatorTypeResponseDto] })
  data!: EducatorTypeResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 4 })
  total!: number;
}
