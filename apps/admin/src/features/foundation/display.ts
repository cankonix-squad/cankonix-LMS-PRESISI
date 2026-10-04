import type { PersonOrganization, UserAccount } from '@lms/api-client';

/**
 * Shared display helpers for the Data Induk module.
 *
 * The vocabulary lives here so Data Individu and Akun Pengguna cannot drift into
 * two different words for the same backend value (e.g. "SUSPENDED" rendered as
 * both "Ditangguhkan" and "Suspend").
 */

/**
 * A failed account read is carried separately from `account`, because
 * `account === null` alone cannot distinguish "no account exists" from "the read
 * was denied or errored". The UI must show the reason, never a false "belum
 * memiliki akun" that would push an operator to create a duplicate account.
 */
export type AccountReadError = { message: string; status: number };

export function accountStatusLabel(status: UserAccount['status']) {
  if (status === 'ACTIVE') return 'Aktif';
  if (status === 'SUSPENDED') return 'Ditangguhkan';
  return 'Nonaktif';
}

export function accountStatusTone(status: UserAccount['status']) {
  if (status === 'ACTIVE') return 'green' as const;
  if (status === 'SUSPENDED') return 'amber' as const;
  return 'red' as const;
}

export function personStatusLabel(status: 'ACTIVE' | 'INACTIVE') {
  return status === 'ACTIVE' ? 'Aktif' : 'Nonaktif';
}

export function assignmentStatusLabel(status: string) {
  if (status === 'ACTIVE') return 'Aktif';
  if (status === 'REVOKED') return 'Dicabut';
  return 'Nonaktif';
}

export function assignmentStatusTone(status: string) {
  if (status === 'ACTIVE') return 'green' as const;
  if (status === 'REVOKED') return 'red' as const;
  return 'slate' as const;
}

export const SCOPE_TYPE_LABEL: Record<string, string> = {
  ORGANIZATION: 'Organisasi',
  PROGRAM: 'Program',
  BATCH: 'Angkatan',
  CLASS: 'Kelas',
  CLASS_SUBJECT: 'Mata Pelajaran Kelas',
};

export function scopeTypeLabel(scopeType: string) {
  return SCOPE_TYPE_LABEL[scopeType] ?? scopeType;
}

/**
 * Active placement, falling back to the most recent one so a person whose
 * placement has ended still shows where they were rather than a blank cell.
 */
export function placementLabel(placements: PersonOrganization[]) {
  const active =
    placements.find((placement) => placement.isActive) || placements[0];
  return active
    ? `${active.organization?.name || 'Unit tidak terbaca'}${
        active.positionName ? ` · ${active.positionName}` : ''
      }`
    : 'Belum ditempatkan';
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

/**
 * Keycloak provisioning status in Bahasa Indonesia.
 *
 * Kept in one map so the badge and any legend say the same thing, and so a new
 * backend status cannot be rendered as a raw enum on screen.
 */
/**
 * Identity ambiguity kinds in Bahasa Indonesia.
 *
 * The wording never says "duplikat" as a conclusion: the audit reports
 * candidates, and deciding that two rows are the same human is a business
 * decision the operator still has to make.
 */
export const IDENTITY_AMBIGUITY_LABEL: Record<string, string> = {
  DUPLICATE_EMAIL: 'Email sama',
  DUPLICATE_NAME: 'Nama lengkap sama',
  ACCOUNT_EMAIL_MISMATCH: 'Email akun berbeda',
};

export function identityAmbiguityLabel(kind: string) {
  return IDENTITY_AMBIGUITY_LABEL[kind] ?? kind;
}

export const PROVISIONING_STATUS_LABEL: Record<string, string> = {
  READY: 'Siap login',
  ACTIVATION_REQUIRED: 'Perlu aktivasi',
  NOT_PROVISIONED: 'Belum terhubung',
  ADOPTABLE: 'Dapat dihubungkan',
  LINK_CONFLICT: 'Konflik identitas',
  STALE_LINK: 'Tautan tidak valid',
  NOT_CONFIGURED: 'Provisioning nonaktif',
  ERROR: 'Gagal / tidak diketahui',
};
