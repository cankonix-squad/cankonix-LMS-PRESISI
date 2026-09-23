'use server';

import type {
  CreateEducationProgramInput,
  EducationProgram,
  UpdateEducationProgramInput,
} from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';

export type ProgramActionState = { ok: boolean; message: string | null };

export async function createProgramAction(
  _state: ProgramActionState,
  formData: FormData,
): Promise<ProgramActionState> {
  const input: CreateEducationProgramInput = {
    organizationId: text(formData, 'organizationId'),
    code: text(formData, 'code').toUpperCase(),
    name: text(formData, 'name'),
    status: status(formData),
  };
  const description = text(formData, 'description');
  if (description) input.description = description;
  if (!input.organizationId || !input.code || !input.name) {
    return {
      ok: false,
      message: 'Organisasi, kode, dan nama program wajib diisi.',
    };
  }

  const result = await createAdminApiClient().educationPrograms.create(input);
  if (!result.ok) {
    return { ok: false, message: result.message || 'Program gagal dibuat.' };
  }
  revalidatePath('/program');
  revalidatePath('/');
  return { ok: true, message: `Program ${result.data.name} berhasil dibuat.` };
}

export async function updateProgramAction(
  _state: ProgramActionState,
  formData: FormData,
): Promise<ProgramActionState> {
  const id = text(formData, 'id');
  const input: UpdateEducationProgramInput = {
    organizationId: text(formData, 'organizationId'),
    code: text(formData, 'code').toUpperCase(),
    name: text(formData, 'name'),
    description: text(formData, 'description') || null,
    status: status(formData),
  };
  if (!id || !input.organizationId || !input.code || !input.name) {
    return {
      ok: false,
      message: 'Organisasi, kode, dan nama program wajib diisi.',
    };
  }

  const result = await createAdminApiClient().educationPrograms.update(
    id,
    input,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Program gagal diperbarui.',
    };
  }
  revalidatePath('/program');
  return {
    ok: true,
    message: `Program ${result.data.name} berhasil diperbarui.`,
  };
}

export async function updateProgramStatusAction(
  _state: ProgramActionState,
  formData: FormData,
): Promise<ProgramActionState> {
  const id = text(formData, 'id');
  const targetStatus = status(formData);
  if (!id)
    return { ok: false, message: 'Program dan status target wajib valid.' };

  const result = await createAdminApiClient().educationPrograms.update(id, {
    status: targetStatus,
  });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Status program gagal diperbarui.',
    };
  }
  revalidatePath('/program');
  return {
    ok: true,
    message: `${text(formData, 'name') || result.data.name} berhasil ${targetStatus === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}.`,
  };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function status(formData: FormData): EducationProgram['status'] {
  return formData.get('status') === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
}
