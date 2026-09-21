'use server';

import type { CreateOrganizationInput } from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient } from '@/lib/api';

export type FoundationActionState = {
  ok: boolean;
  message: string | null;
};

export async function createOrganizationAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const code = getText(formData, 'code').toUpperCase();
  const name = getText(formData, 'name');
  const organizationType = getText(formData, 'organizationType');
  const parentId = getText(formData, 'parentId');

  if (!code || !name) {
    return {
      ok: false,
      message: 'Kode organisasi dan nama organisasi wajib diisi.',
    };
  }

  const input: CreateOrganizationInput = {
    code,
    name,
    status: 'ACTIVE',
  };
  if (organizationType) input.organizationType = organizationType;
  if (parentId) input.parentId = parentId;

  const result = await createAdminApiClient().organizations.create(input);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Organisasi gagal dibuat.',
    };
  }

  revalidatePath('/');
  return {
    ok: true,
    message: `Organisasi ${result.data.name} berhasil dibuat.`,
  };
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}
