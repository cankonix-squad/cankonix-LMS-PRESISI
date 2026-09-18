import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PersonStatusDto } from './person-status.dto';

export class ListPersonsQueryDto {
  @ApiPropertyOptional({ description: 'Matches personnel number or full name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PersonStatusDto })
  @IsOptional()
  @IsEnum(PersonStatusDto)
  status?: PersonStatusDto;

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
