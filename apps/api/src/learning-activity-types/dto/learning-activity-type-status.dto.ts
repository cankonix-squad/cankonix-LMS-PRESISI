/**
 * Lifecycle of a learning activity type.
 *
 * Activity types are a controlled vocabulary, so the same ACTIVE/INACTIVE pair
 * used by `educator_types` is reused instead of inventing a parallel scale.
 * Deactivating retires the type for new activities while leaving historical
 * activities (and their audit trail) readable.
 */
export const LearningActivityTypeStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type LearningActivityTypeStatusDto =
  (typeof LearningActivityTypeStatusDto)[keyof typeof LearningActivityTypeStatusDto];
