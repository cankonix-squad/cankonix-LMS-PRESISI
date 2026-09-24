'use server';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';
export type AssignmentActionState = { ok: boolean; message: string | null };
export async function createAdminAssignmentAction(
  _state: AssignmentActionState,
  form: FormData,
): Promise<AssignmentActionState> {
  const api = createAdminApiClient();
  const result = await api.assignments.create({
    activityId: text(form, 'activityId'),
    title: text(form, 'title'),
    instructions: optional(form, 'instructions'),
    dueAt: iso(form, 'dueAt'),
    maxScore: number(form, 'maxScore') ?? undefined,
    attemptsAllowed: number(form, 'attemptsAllowed') ?? undefined,
  });
  revalidatePath('/tugas');
  return result.ok
    ? { ok: true, message: 'Tugas berhasil dibuat.' }
    : { ok: false, message: result.message };
}
export async function updateAdminAssignmentAction(
  _state: AssignmentActionState,
  form: FormData,
): Promise<AssignmentActionState> {
  const api = createAdminApiClient();
  const result = await api.assignments.update(text(form, 'id'), {
    title: text(form, 'title'),
    instructions: optional(form, 'instructions'),
    dueAt: iso(form, 'dueAt'),
    maxScore: number(form, 'maxScore') ?? undefined,
    attemptsAllowed: number(form, 'attemptsAllowed') ?? undefined,
  });
  revalidatePath('/tugas');
  return result.ok
    ? { ok: true, message: 'Tugas berhasil diperbarui.' }
    : { ok: false, message: result.message };
}
export async function updateAdminAssignmentStatusAction(
  _state: AssignmentActionState,
  form: FormData,
): Promise<AssignmentActionState> {
  const api = createAdminApiClient();
  const result = await api.assignments.changeStatus(
    text(form, 'id'),
    text(form, 'status') as 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED',
  );
  revalidatePath('/tugas');
  return result.ok
    ? { ok: true, message: 'Status tugas berhasil diperbarui.' }
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
  return value ? Number(value) : null;
}
