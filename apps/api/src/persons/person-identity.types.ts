import { PersonStatusDto } from './dto/person-status.dto';

/**
 * Candidate row for the identity integrity audit.
 *
 * Deliberately narrow: the audit must be able to run on every person without
 * pulling education history, placements, or files. `userAccount` is included
 * only as linkage metadata.
 */
export type PersonIdentityCandidateRecord = {
  id: string;
  personnelNumber: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: PersonStatusDto;
  userAccount: {
    id: string;
    username: string | null;
    email: string | null;
    status: string;
  } | null;
};

export type IdentityAmbiguityKind =
  'DUPLICATE_EMAIL' | 'DUPLICATE_NAME' | 'ACCOUNT_EMAIL_MISMATCH';

/**
 * A finding that needs a human decision.
 *
 * `personIds` is always more than one for a duplicate finding: the audit reports
 * candidates and never picks a survivor, because deciding two rows are the same
 * human is a business decision, not a data-cleaning step.
 */
export type IdentityAmbiguity = {
  kind: IdentityAmbiguityKind;
  key: string;
  personIds: string[];
  personLabels: string[];
  message: string;
};

export type IdentityAuditReport = {
  totalPersons: number;
  personsWithAccount: number;
  personsWithoutAccount: number;
  /** Accounts whose `person_id` matches no row. Must be 0 — the FK guarantees it. */
  orphanedAccounts: number;
  /** Persons with more than one account. Must be 0 — `person_id` is unique. */
  personsWithMultipleAccounts: number;
  ambiguities: IdentityAmbiguity[];
};
