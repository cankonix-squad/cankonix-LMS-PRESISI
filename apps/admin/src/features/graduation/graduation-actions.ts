'use server';

import type {
  GraduationRuleStatus,
} from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';

export type GraduationActionState = { ok: boolean; message: string | null };

export async function changeGraduationRuleStatusAction(
  _state: GraduationActionState,
  formData: FormData,
): Promise<GraduationActionState> {
  const id = text(formData, 'id');
  const status = text(formData, 'status') as GraduationRuleStatus;
  if (!id || !status) {
    return { ok: false, message: 'Data aturan kelulusan tidak valid.' };
  }
  const api = createAdminApiClient();
  const result = await api.graduation.changeRuleStatus(id, status);
  if (!result.ok) {
    return { ok: false, message: result.message || 'Status aturan gagal diubah.' };
  }
  revalidatePath('/kelulusan');
  return { ok: true, message: `Status aturan diubah menjadi ${statusLabelLocal(status)}.` };
}

export async function createGraduationDecisionAction(
  _state: GraduationActionState,
  formData: FormData,
): Promise<GraduationActionState> {
  const graduationEvaluationId = text(formData, 'graduationEvaluationId');
  const decision = text(formData, 'decision') as 'PASS' | 'FAIL' | 'REMEDIAL' | 'WITHDRAWN';
  if (!graduationEvaluationId || !decision) {
    return { ok: false, message: 'Evaluasi dan keputusan wajib diisi.' };
  }
  const api = createAdminApiClient();
  const result = await api.graduationDecisions.create({
    graduationEvaluationId,
    decision,
    note: text(formData, 'note') || null,
  });
  if (!result.ok) {
    return { ok: false, message: result.message || 'Keputusan kelulusan gagal dibuat.' };
  }
  revalidatePath('/keputusan-kelulusan');
  revalidatePath('/kelulusan');
  return { ok: true, message: 'Keputusan kelulusan berhasil dicatat.' };
}

export async function approveGraduationDecisionAction(
  _state: GraduationActionState,
  formData: FormData,
): Promise<GraduationActionState> {
  const id = text(formData, 'id');
  if (!id) return { ok: false, message: 'Data keputusan tidak valid.' };
  const api = createAdminApiClient();
  const result = await api.graduationDecisions.approve(id);
  if (!result.ok) {
    return { ok: false, message: result.message || 'Keputusan gagal disetujui.' };
  }
  revalidatePath('/keputusan-kelulusan');
  return { ok: true, message: 'Keputusan kelulusan disetujui.' };
}

export async function revokeGraduationDecisionAction(
  _state: GraduationActionState,
  formData: FormData,
): Promise<GraduationActionState> {
  const id = text(formData, 'id');
  const reason = text(formData, 'reason') || 'Dicabut oleh operator';
  if (!id) return { ok: false, message: 'Data keputusan tidak valid.' };
  const api = createAdminApiClient();
  const result = await api.graduationDecisions.revoke(id, reason);
  if (!result.ok) {
    return { ok: false, message: result.message || 'Keputusan gagal dicabut.' };
  }
  revalidatePath('/keputusan-kelulusan');
  return { ok: true, message: 'Keputusan kelulusan dicabut.' };
}

export async function issueCertificateAction(
  _state: GraduationActionState,
  formData: FormData,
): Promise<GraduationActionState> {
  const decisionId = text(formData, 'decisionId');
  const templateId = text(formData, 'templateId');
  if (!decisionId || !templateId) {
    return { ok: false, message: 'Keputusan dan template sertifikat wajib diisi.' };
  }
  const api = createAdminApiClient();
  const result = await api.certificates.issue({ decisionId, templateId });
  if (!result.ok) {
    return { ok: false, message: result.message || 'Sertifikat gagal diterbitkan.' };
  }
  revalidatePath('/sertifikat');
  return { ok: true, message: `Sertifikat ${result.data.certificateNumber} berhasil diterbitkan.` };
}

export async function revokeCertificateAction(
  _state: GraduationActionState,
  formData: FormData,
): Promise<GraduationActionState> {
  const id = text(formData, 'id');
  const reason = text(formData, 'reason') || 'Dicabut oleh operator';
  if (!id) return { ok: false, message: 'Data sertifikat tidak valid.' };
  const api = createAdminApiClient();
  const result = await api.certificates.revoke(id, reason);
  if (!result.ok) {
    return { ok: false, message: result.message || 'Sertifikat gagal dicabut.' };
  }
  revalidatePath('/sertifikat');
  return { ok: true, message: 'Sertifikat berhasil dicabut.' };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function statusLabelLocal(s: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    PUBLISHED: 'Diterbitkan',
    ARCHIVED: 'Arsip',
  };
  return map[s] ?? s;
}