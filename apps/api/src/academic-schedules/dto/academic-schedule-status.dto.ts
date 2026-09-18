/**
 * Decision: one file per concern. `academic-schedule-status.dto.ts` owns the two
 * closed vocabularies a schedule carries (its lifecycle status and its delivery
 * mode) plus the rule about which statuses occupy a calendar slot.
 */

export const AcademicScheduleStatusDto = {
  SCHEDULED: 'SCHEDULED',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type AcademicScheduleStatusDto =
  (typeof AcademicScheduleStatusDto)[keyof typeof AcademicScheduleStatusDto];

export const AcademicScheduleModeDto = {
  FACE_TO_FACE: 'FACE_TO_FACE',
  ONLINE: 'ONLINE',
  BLENDED: 'BLENDED',
} as const;

export type AcademicScheduleModeDto =
  (typeof AcademicScheduleModeDto)[keyof typeof AcademicScheduleModeDto];

/**
 * Statuses that occupy a slot in the calendar. A `CANCELLED` schedule frees its
 * period, so it never blocks a replacement entry and never produces a conflict.
 * The list excludes `CANCELLED` deliberately: a cancelled slot is available.
 */
export const OCCUPYING_SCHEDULE_STATUSES: AcademicScheduleStatusDto[] = [
  AcademicScheduleStatusDto.SCHEDULED,
  AcademicScheduleStatusDto.ONGOING,
  AcademicScheduleStatusDto.COMPLETED,
];

export function isOccupyingStatus(status: AcademicScheduleStatusDto): boolean {
  return OCCUPYING_SCHEDULE_STATUSES.includes(status);
}
