'use server';

import type { LearningActivityStatus } from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';
export type ActivityActionState = { ok: boolean; message: string | null };
export async function createActivityAction(
  _state: ActivityActionState,
  form: FormData,
): Promise<ActivityActionState> {
  const api = createAdminApiClient();
  const result = await api.learningActivities.create({
    meetingId: text(form, 'meetingId'),
    activityTypeId: text(form, 'activityTypeId'),
    title: text(form, 'title'),
    instructions: optional(form, 'instructions'),
    required: form.get('required') === 'on',
    availableFrom: iso(form, 'availableFrom'),
    availableUntil: iso(form, 'availableUntil'),
    sequence: number(form, 'sequence'),
    status: 'DRAFT',
  });
  revalidatePath('/aktivitas');
  return result.ok
    ? { ok: true, message: 'Aktivitas berhasil dibuat.' }
    : { ok: false, message: result.message };
}
export async function updateActivityAction(
  _state: ActivityActionState,
  form: FormData,
): Promise<ActivityActionState> {
  const api = createAdminApiClient();
  const result = await api.learningActivities.update(text(form, 'id'), {
    activityTypeId: text(form, 'activityTypeId'),
    title: text(form, 'title'),
    instructions: optional(form, 'instructions'),
    required: form.get('required') === 'on',
    availableFrom: iso(form, 'availableFrom'),
    availableUntil: iso(form, 'availableUntil'),
  });
  revalidatePath('/aktivitas');
  return result.ok
    ? { ok: true, message: 'Aktivitas berhasil diperbarui.' }
    : { ok: false, message: result.message };
}
export async function updateActivityStatusAction(
  _state: ActivityActionState,
  form: FormData,
): Promise<ActivityActionState> {
  const api = createAdminApiClient();
  const result = await api.learningActivities.changeStatus(
    text(form, 'id'),
    text(form, 'status') as LearningActivityStatus,
  );
  revalidatePath('/aktivitas');
  return result.ok
    ? { ok: true, message: 'Status aktivitas berhasil diperbarui.' }
    : { ok: false, message: result.message };
}
function text(form: FormData, key: string) {
  return String(form.get(key) ?? '').trim();
}
function optional(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}
function iso(form: FormData, key: string) {
  const value = text(form, key);
  return value ? new Date(value).toISOString() : null;
}
function number(form: FormData, key: string) {
  const value = text(form, key);
  return value ? Number(value) : undefined;
}
