'use server';

import type {
  AssessmentStatus,
  CreateAssessmentInput,
  UpdateAssessmentInput,
} from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';
import { statusLabel } from './assessment-labels';

export type AssessmentActionState = { ok: boolean; message: string | null };

export async function createAssessmentAction(
  _state: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const input: CreateAssessmentInput = {
    classSubjectId: text(formData, 'classSubjectId'),
    assessmentTypeId: text(formData, 'assessmentTypeId'),
    title: text(formData, 'title'),
    maxScore: Number(text(formData, 'maxScore')) || 100,
    status: status(formData),
  };
  const description = text(formData, 'description');
  if (description) input.description = description;
  const weightStr = text(formData, 'weight');
  if (weightStr) input.weight = Number(weightStr);
  const availableFrom = text(formData, 'availableFrom');
  if (availableFrom) input.availableFrom = new Date(availableFrom).toISOString();
  const availableUntil = text(formData, 'availableUntil');
  if (availableUntil) input.availableUntil = new Date(availableUntil).toISOString();

  if (!input.classSubjectId || !input.assessmentTypeId || !input.title) {
    return {
      ok: false,
      message: 'Class subject, tipe assessment, dan judul wajib diisi.',
    };
  }

  const api = createAdminApiClient();
  const result = await api.assessments.create(input);
  if (!result.ok) {
    return { ok: false, message: result.message || 'Assessment gagal dibuat.' };
  }
  revalidatePath('/assessment');
  return { ok: true, message: `Assessment ${result.data.title} berhasil dibuat.` };
}

export async function updateAssessmentAction(
  _state: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const id = text(formData, 'id');
  if (!id) return { ok: false, message: 'Ringkasan assessment tidak valid.' };

  const input: UpdateAssessmentInput = {
    assessmentTypeId: text(formData, 'assessmentTypeId'),
    title: text(formData, 'title'),
    description: text(formData, 'description') || null,
    maxScore: Number(text(formData, 'maxScore')) || 100,
    status: status(formData),
  };
  const weightStr = text(formData, 'weight');
  if (weightStr) input.weight = Number(weightStr);
  const availableFrom = text(formData, 'availableFrom');
  if (availableFrom) input.availableFrom = new Date(availableFrom).toISOString();
  const availableUntil = text(formData, 'availableUntil');
  if (availableUntil) input.availableUntil = new Date(availableUntil).toISOString();

  if (!input.assessmentTypeId || !input.title) {
    return {
      ok: false,
      message: 'Tipe assessment dan judul wajib diisi.',
    };
  }

  const api = createAdminApiClient();
  const result = await api.assessments.update(id, input);
  if (!result.ok) {
    return { ok: false, message: result.message || 'Assessment gagal diperbarui.' };
  }
  revalidatePath('/assessment');
  return { ok: true, message: `Assessment ${result.data.title} berhasil diperbarui.` };
}

export async function changeAssessmentStatusAction(
  _state: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const id = text(formData, 'id');
  const targetStatus = text(formData, 'status') as AssessmentStatus;
  if (!id || !targetStatus) {
    return { ok: false, message: 'Assessment dan status target tidak valid.' };
  }
  const api = createAdminApiClient();
  const result = await api.assessments.changeStatus(id, { status: targetStatus });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Status assessment gagal diperbarui.',
    };
  }
  revalidatePath('/assessment');
  const label = statusLabel(targetStatus);
  return {
    ok: true,
    message: `Status assessment diubah menjadi ${label}.`,
  };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function status(formData: FormData): AssessmentStatus {
  const value = text(formData, 'status');
  return value === 'PUBLISHED' || value === 'CLOSED' || value === 'ARCHIVED'
    ? value
    : 'DRAFT';
}