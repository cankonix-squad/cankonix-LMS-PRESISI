import {
  IdentityAmbiguity,
  PersonIdentityCandidateRecord,
} from './person-identity.types';

/**
 * Identity integrity audit.
 *
 * Pure function over already-read rows, so the rules are unit-testable without a
 * database and cannot accidentally write anything.
 *
 * What this deliberately does NOT do: merge, rename, null out, or deactivate a
 * single row. Duplicate names and duplicate emails are *reported* for review.
 * Two people can legitimately share a name, an email alias can be reused by an
 * unrelated unit, and a wrong conclusion here would silently destroy a person's
 * education history — so the audit only ever produces findings.
 */
export function findIdentityAmbiguities(
  candidates: PersonIdentityCandidateRecord[],
): IdentityAmbiguity[] {
  const ambiguities: IdentityAmbiguity[] = [];

  ambiguities.push(...duplicateGroups(candidates, 'DUPLICATE_EMAIL', emailKey));
  ambiguities.push(...duplicateGroups(candidates, 'DUPLICATE_NAME', nameKey));
  ambiguities.push(...accountEmailMismatches(candidates));

  return ambiguities;
}

type GroupKey = (candidate: PersonIdentityCandidateRecord) => string | null;

/**
 * Group by a normalized key and report any group with more than one person.
 *
 * Rows with no usable key (blank email) are skipped: "every person without an
 * email looks alike" is a finding that would drown the real ones.
 */
function duplicateGroups(
  candidates: PersonIdentityCandidateRecord[],
  kind: 'DUPLICATE_EMAIL' | 'DUPLICATE_NAME',
  keyOf: GroupKey,
): IdentityAmbiguity[] {
  const groups = new Map<string, PersonIdentityCandidateRecord[]>();
  for (const candidate of candidates) {
    const key = keyOf(candidate);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(candidate);
    else groups.set(key, [candidate]);
  }

  const findings: IdentityAmbiguity[] = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    findings.push({
      kind,
      key,
      personIds: group.map((person) => person.id),
      personLabels: group.map(labelOf),
      message:
        kind === 'DUPLICATE_EMAIL'
          ? `${group.length} data individu memiliki email yang sama. Tinjau apakah ini orang yang sama atau email bersama (misalnya email unit).`
          : `${group.length} data individu memiliki nama lengkap yang sama. Tinjau apakah ini orang yang sama; jangan digabung otomatis.`,
    });
  }
  return findings.sort((left, right) => left.key.localeCompare(right.key));
}

/**
 * An account whose stored login email differs from the owner's person email.
 *
 * Reported as a finding rather than corrected, because the account email may be
 * the one Keycloak actually uses for login while the person email is the
 * organizational mailbox. Neither is "wrong" without a business ruling.
 */
function accountEmailMismatches(
  candidates: PersonIdentityCandidateRecord[],
): IdentityAmbiguity[] {
  const findings: IdentityAmbiguity[] = [];
  for (const candidate of candidates) {
    const personEmail = normalizeEmail(candidate.email);
    const accountEmail = normalizeEmail(candidate.userAccount?.email ?? null);
    if (!personEmail || !accountEmail) continue;
    if (personEmail === accountEmail) continue;
    findings.push({
      kind: 'ACCOUNT_EMAIL_MISMATCH',
      key: candidate.personnelNumber,
      personIds: [candidate.id],
      personLabels: [labelOf(candidate)],
      message: `Email akun (${accountEmail}) berbeda dari email data individu (${personEmail}). Konfirmasi alamat mana yang menjadi identitas login.`,
    });
  }
  return findings;
}

function emailKey(candidate: PersonIdentityCandidateRecord): string | null {
  return normalizeEmail(candidate.email);
}

function nameKey(candidate: PersonIdentityCandidateRecord): string | null {
  const normalized = candidate.fullName.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized || null;
}

function normalizeEmail(value: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function labelOf(candidate: PersonIdentityCandidateRecord): string {
  return `${candidate.fullName} (${candidate.personnelNumber})`;
}
