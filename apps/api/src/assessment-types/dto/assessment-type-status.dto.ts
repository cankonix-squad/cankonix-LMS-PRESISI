/**
 * Lifecycle of an assessment type.
 *
 * Assessment types are a controlled vocabulary, so the same ACTIVE/INACTIVE pair
 * used by `educator_types` and `learning_activity_types` is reused instead of
 * inventing a parallel scale. Deactivating retires the type for new assessments
 * while leaving historical assessments (and their audit trail) readable.
 */
export const AssessmentTypeStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type AssessmentTypeStatusDto =
  (typeof AssessmentTypeStatusDto)[keyof typeof AssessmentTypeStatusDto];
