import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateEducatorTypeDto } from './create-educator-type.dto';

export class UpdateEducatorTypeDto extends PartialType(CreateEducatorTypeDto) {
  @ApiPropertyOptional({
    description:
      'Code is a stable integration key; change it only when the vocabulary itself changes.',
    example: 'GADIK',
  })
  code?: string;
}
