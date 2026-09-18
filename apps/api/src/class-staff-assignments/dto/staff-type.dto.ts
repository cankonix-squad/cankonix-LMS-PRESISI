/**
 * Documented, non-exhaustive vocabulary for class staff. Staff type is stored as
 * a free string on purpose: the institution owns this list and must be able to
 * add a new role without a code change. These values are used for API examples
 * and client hints only.
 */
export const StaffTypeExamples = [
  'WALI_KELAS',
  'ADMIN_KELAS',
  'PEMBIMBING',
  'PENGASUH',
] as const;
