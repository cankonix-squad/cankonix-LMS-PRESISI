'use server';

import type {
  LearningActivityContentType,
  LearningActivityContent,
} from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';

export type MaterialActionState = { ok: boolean; message: string | null };

export async function createMaterialAction(
  _state: MaterialActionState,
  form: FormData,
): Promise<MaterialActionState> {
  const api = createAdminApiClient();
  const result = await api.learningActivities.createContent(
    text(form, 'activityId'),
    {
      contentType: text(form, 'contentType') as LearningActivityContentType,
      title: text(form, 'title'),
      objectKey: optional(form, 'objectKey'),
      externalUrl: optional(form, 'externalUrl'),
      mimeType: optional(form, 'mimeType'),
    },
  );
  revalidatePath('/materi');
  return result.ok
    ? { ok: true, message: 'Materi berhasil dibuat sebagai draft.' }
    : { ok: false, message: result.message };
}

export async function updateMaterialAction(
  _state: MaterialActionState,
  form: FormData,
): Promise<MaterialActionState> {
  const api = createAdminApiClient();
  const result = await api.learningActivityContents.update(text(form, 'id'), {
    title: text(form, 'title'),
    objectKey: optional(form, 'objectKey'),
    externalUrl: optional(form, 'externalUrl'),
    mimeType: optional(form, 'mimeType'),
  });
  revalidatePath('/materi');
  return result.ok
    ? { ok: true, message: 'Materi berhasil diperbarui.' }
    : { ok: false, message: result.message };
}

export async function updateMaterialStatusAction(
  _state: MaterialActionState,
  form: FormData,
): Promise<MaterialActionState> {
  const api = createAdminApiClient();
  const result = await api.learningActivityContents.update(text(form, 'id'), {
    status: text(form, 'status') as LearningActivityContent['status'],
  });
  revalidatePath('/materi');
  return result.ok
    ? { ok: true, message: 'Status materi berhasil diperbarui.' }
    : { ok: false, message: result.message };
}
function text(form: FormData, key: string) {
  return String(form.get(key) ?? '').trim();
}
function optional(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}
