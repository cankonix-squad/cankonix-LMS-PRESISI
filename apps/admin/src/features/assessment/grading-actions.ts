'use server';

import type {
  CreateGradingSchemeInput,
  GradingSchemeStatus,
} from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';

export type GradingActionState = { ok: boolean; message: string | null };

export async function createGradingSchemeAction(
  _state: GradingActionState,
  formData: FormData,
): Promise<GradingActionState> {
  const input: CreateGradingSchemeInput = {
    classSubjectId: text(formData, 'classSubjectId'),
    name: text(formData, 'name'),
    status: status(formData),
  };

  if (!input.classSubjectId || !input.name) {
    return {
      ok: false,
      message: 'Class subject dan nama skema penilaian wajib diisi.',
    };
  }

  const api = createAdminApiClient();
  const result = await api.gradingSchemes.create(input);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Skema penilaian gagal dibuat.',
    };
  }
  revalidatePath('/grading');
  return {
    ok: true,
    message: `Skema penilaian ${result.data.name} berhasil dibuat.`,
  };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function status(formData: FormData): GradingSchemeStatus {
  const value = text(formData, 'status');
  return value === 'PUBLISHED' || value === 'ARCHIVED' ? value : 'DRAFT';
}