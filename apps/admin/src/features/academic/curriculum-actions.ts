'use server';

import type {
  CreateCurriculumInput,
  Curriculum,
  UpdateCurriculumInput,
} from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';

export type CurriculumActionState = { ok: boolean; message: string | null };

export async function createCurriculumAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const input: CreateCurriculumInput = {
    educationProgramId: text(formData, 'educationProgramId'),
    version: text(formData, 'version'),
    name: text(formData, 'name'),
    effectiveFrom: date(formData),
    status: status(formData),
  };
  if (!input.educationProgramId || !input.version || !input.name)
    return { ok: false, message: 'Program, versi, dan nama wajib diisi.' };
  const result = await createAdminApiClient().curricula.create(input);
  if (!result.ok)
    return { ok: false, message: result.message || 'Kurikulum gagal dibuat.' };
  revalidatePath('/kurikulum');
  return {
    ok: true,
    message: `Kurikulum ${result.data.name} berhasil dibuat.`,
  };
}

export async function updateCurriculumAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const id = text(formData, 'id');
  const input: UpdateCurriculumInput = {
    educationProgramId: text(formData, 'educationProgramId'),
    version: text(formData, 'version'),
    name: text(formData, 'name'),
    effectiveFrom: date(formData),
    status: status(formData),
  };
  if (!id || !input.educationProgramId || !input.version || !input.name)
    return { ok: false, message: 'Program, versi, dan nama wajib diisi.' };
  const result = await createAdminApiClient().curricula.update(id, input);
  if (!result.ok)
    return {
      ok: false,
      message: result.message || 'Kurikulum gagal diperbarui.',
    };
  revalidatePath('/kurikulum');
  return {
    ok: true,
    message: `Kurikulum ${result.data.name} berhasil diperbarui.`,
  };
}

export async function updateCurriculumStatusAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const id = text(formData, 'id');
  if (!id) return { ok: false, message: 'Kurikulum tidak valid.' };
  const targetStatus = status(formData);
  const result = await createAdminApiClient().curricula.update(id, {
    status: targetStatus,
  });
  if (!result.ok)
    return {
      ok: false,
      message: result.message || 'Status kurikulum gagal diperbarui.',
    };
  revalidatePath('/kurikulum');
  return {
    ok: true,
    message: `${text(formData, 'name') || result.data.name} berhasil ${targetStatus === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}.`,
  };
}

function text(data: FormData, key: string) {
  return String(data.get(key) ?? '').trim();
}
function date(data: FormData) {
  const value = text(data, 'effectiveFrom');
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;
}
function status(data: FormData): Curriculum['status'] {
  return data.get('status') === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
}
