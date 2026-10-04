import { ApiProperty } from '@nestjs/swagger';

/**
 * One review finding from the identity integrity audit.
 *
 * The API reports candidates; it never proposes a merge. `personIds` therefore
 * always lists every row involved so a reviewer can open each one.
 */
export class IdentityAmbiguityDto {
  @ApiProperty({
    enum: ['DUPLICATE_EMAIL', 'DUPLICATE_NAME', 'ACCOUNT_EMAIL_MISMATCH'],
  })
  kind!: string;

  @ApiProperty({ description: 'Normalized key the finding was grouped by' })
  key!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  personIds!: string[];

  @ApiProperty({ type: [String] })
  personLabels!: string[];

  @ApiProperty() message!: string;
}

export class IdentityAuditResponseDto {
  @ApiProperty() totalPersons!: number;
  @ApiProperty() personsWithAccount!: number;
  @ApiProperty() personsWithoutAccount!: number;
  @ApiProperty({
    description:
      'Accounts whose person is missing. Structurally 0 because of the foreign key; exposed so a runtime anomaly is visible instead of assumed.',
  })
  orphanedAccounts!: number;
  @ApiProperty({
    description:
      'Persons with more than one account. Structurally 0 because person_id is unique.',
  })
  personsWithMultipleAccounts!: number;
  @ApiProperty({ type: [IdentityAmbiguityDto] })
  ambiguities!: IdentityAmbiguityDto[];
}
