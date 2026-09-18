import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateAssignmentDto } from './create-assignment.dto';

/**
 * `activityId` is intentionally not updatable: moving an assignment to another
 * activity would silently orphan the submissions and grades already attached to
 * it. Retire the assignment and create a new one instead.
 */
export class UpdateAssignmentDto extends PartialType(CreateAssignmentDto) {
  @ApiPropertyOptional({
    description:
      'Not accepted; the activity of an existing assignment is fixed.',
    readOnly: true,
  })
  declare activityId?: never;
}
