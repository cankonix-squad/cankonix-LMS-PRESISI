'use server';

import type {
  AcademicEnrollmentStatus,
  AcademicClass,
  CreateAcademicClassInput,
  CreateEducationBatchInput,
  CreateEnrollmentInput,
  CreateSubjectInput,
  Subject,
  EducationBatch,
} from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';

export type AcademicActionState = { ok: boolean; message: string | null };

export async function saveAcademicRecord(
  _state: AcademicActionState,
  formData: FormData,
): Promise<AcademicActionState> {
  const entity = text(formData, 'entity');
  const id = text(formData, 'id');
  const api = createAdminApiClient();
  let result: { ok: boolean; message?: string; data?: unknown };
  if (entity === 'subject') {
    const input: CreateSubjectInput = {
      code: text(formData, 'code'),
      name: text(formData, 'name'),
      description: text(formData, 'description'),
      status: status(formData) as Subject['status'],
    };
    result = id
      ? await api.subjects.update(id, input)
      : await api.subjects.create(input);
    revalidatePath('/mata-pelajaran');
  } else if (entity === 'batch') {
    const input: CreateEducationBatchInput = {
      educationProgramId: text(formData, 'educationProgramId'),
      curriculumId: text(formData, 'curriculumId'),
      code: text(formData, 'code'),
      name: text(formData, 'name'),
      startDate: requiredDate(formData, 'startDate'),
      endDate: requiredDate(formData, 'endDate'),
      capacity: number(formData, 'capacity'),
      status: status(formData) as EducationBatch['status'],
    };
    result = id
      ? await api.educationBatches.update(id, input)
      : await api.educationBatches.create(input);
    revalidatePath('/angkatan');
  } else if (entity === 'class') {
    const input: CreateAcademicClassInput = {
      educationBatchId: text(formData, 'educationBatchId'),
      code: text(formData, 'code'),
      name: text(formData, 'name'),
      capacity: number(formData, 'capacity') ?? undefined,
      status: status(formData) as AcademicClass['status'],
    };
    result = id
      ? await api.academicClasses.update(id, input)
      : await api.academicClasses.create(input);
    revalidatePath('/kelas');
  } else {
    const input: CreateEnrollmentInput = {
      personId: text(formData, 'personId'),
      educationBatchId: text(formData, 'educationBatchId'),
      academicClassId: text(formData, 'academicClassId') || undefined,
      enrollmentNumber: text(formData, 'enrollmentNumber') || undefined,
      enrolledAt: date(formData, 'enrolledAt'),
      status: status(formData) as AcademicEnrollmentStatus,
    };
    result = id
      ? await api.enrollments.transferClass(id, input.academicClassId ?? '')
      : await api.enrollments.create(input);
    revalidatePath('/enrollment');
  }
  return result.ok
    ? { ok: true, message: 'Perubahan berhasil disimpan.' }
    : { ok: false, message: result.message ?? 'Perubahan gagal disimpan.' };
}

function text(data: FormData, key: string) {
  return String(data.get(key) ?? '').trim();
}
function number(data: FormData, key: string) {
  const raw = text(data, key);
  return raw ? Number(raw) : null;
}
function date(data: FormData, key: string) {
  const raw = text(data, key);
  return raw ? new Date(`${raw}T00:00:00.000Z`).toISOString() : undefined;
}
function requiredDate(data: FormData, key: string) {
  return date(data, key) ?? '';
}
function status(data: FormData) {
  return text(data, 'status') || 'ACTIVE';
}
