'use server';

import type {
  CreateQuestionBankInput,
  QuestionBank,
  UpdateQuestionBankInput,
} from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';

export type QuestionBankActionState = { ok: boolean; message: string | null };

export async function createQuestionBankAction(
  _state: QuestionBankActionState,
  formData: FormData,
): Promise<QuestionBankActionState> {
  const input: CreateQuestionBankInput = {
    curriculumSubjectId: text(formData, 'curriculumSubjectId'),
    code: text(formData, 'code').toUpperCase(),
    name: text(formData, 'name'),
    status: status(formData),
  };
  const description = text(formData, 'description');
  if (description) input.description = description;

  if (!input.curriculumSubjectId || !input.code || !input.name) {
    return {
      ok: false,
      message: 'Mata pelajaran kurikulum, kode, dan nama bank soal wajib diisi.',
    };
  }

  const api = createAdminApiClient();
  const result = await api.questionBanks.create(input);
  if (!result.ok) {
    return { ok: false, message: result.message || 'Bank soal gagal dibuat.' };
  }
  revalidatePath('/bank-soal');
  return { ok: true, message: `Bank soal ${result.data.name} berhasil dibuat.` };
}

export async function updateQuestionBankAction(
  _state: QuestionBankActionState,
  formData: FormData,
): Promise<QuestionBankActionState> {
  const id = text(formData, 'id');
  if (!id) return { ok: false, message: 'Ringkasan bank soal tidak valid.' };

  const input: UpdateQuestionBankInput = {
    name: text(formData, 'name'),
    description: text(formData, 'description') || null,
    status: status(formData),
  };
  if (!input.name) {
    return { ok: false, message: 'Nama bank soal wajib diisi.' };
  }

  const api = createAdminApiClient();
  const result = await api.questionBanks.update(id, input);
  if (!result.ok) {
    return { ok: false, message: result.message || 'Bank soal gagal diperbarui.' };
  }
  revalidatePath('/bank-soal');
  return { ok: true, message: `Bank soal ${result.data.name} berhasil diperbarui.` };
}

export async function updateQuestionBankStatusAction(
  _state: QuestionBankActionState,
  formData: FormData,
): Promise<QuestionBankActionState> {
  const id = text(formData, 'id');
  const targetStatus = status(formData);
  if (!id) {
    return { ok: false, message: 'Bank soal dan status target tidak valid.' };
  }
  const api = createAdminApiClient();
  const result = await api.questionBanks.update(id, { status: targetStatus });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Status bank soal gagal diperbarui.',
    };
  }
  revalidatePath('/bank-soal');
  return {
    ok: true,
    message: `${result.data.name} berhasil ${targetStatus === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}.`,
  };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function status(formData: FormData): QuestionBank['status'] {
  return formData.get('status') === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
}