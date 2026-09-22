'use server';

import type {
  CreateOrganizationInput,
  CreatePersonInput,
  CreateUserAccountInput,
} from '@lms/api-client';
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

export async function createPersonWithAccountAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const personnelNumber = getText(formData, 'personnelNumber');
  const fullName = getText(formData, 'fullName');
  const rank = getText(formData, 'rank');
  const title = getText(formData, 'title');
  const email = getText(formData, 'email').toLowerCase();
  const phone = getText(formData, 'phone');
  const createAccount = formData.get('createAccount') === 'on';
  const username = getText(formData, 'username');
  const accountEmail = getText(formData, 'accountEmail').toLowerCase();
  const externalAuthId = getText(formData, 'externalAuthId');

  if (!personnelNumber || !fullName) {
    return {
      ok: false,
      message: 'NRP/NIP dan nama lengkap wajib diisi.',
    };
  }

  const personInput: CreatePersonInput = {
    personnelNumber,
    fullName,
    status: 'ACTIVE',
  };
  if (rank) personInput.rank = rank;
  if (title) personInput.title = title;
  if (email) personInput.email = email;
  if (phone) personInput.phone = phone;

  const api = createAdminApiClient();
  const personResult = await api.persons.create(personInput);
  if (!personResult.ok) {
    return {
      ok: false,
      message: personResult.message || 'Person gagal dibuat.',
    };
  }

  if (!createAccount) {
    revalidatePath('/');
    return {
      ok: true,
      message: `Person ${personResult.data.fullName} berhasil dibuat tanpa UserAccount.`,
    };
  }

  const accountInput: CreateUserAccountInput = { status: 'ACTIVE' };
  if (username) accountInput.username = username;
  if (accountEmail || email) accountInput.email = accountEmail || email;
  if (externalAuthId) accountInput.externalAuthId = externalAuthId;

  if (!accountInput.username && !accountInput.email && !externalAuthId) {
    revalidatePath('/');
    return {
      ok: true,
      message:
        'Person berhasil dibuat. UserAccount dilewati karena username, email akun, dan Keycloak subject kosong.',
    };
  }

  const accountResult = await api.persons.createAccount(
    personResult.data.id,
    accountInput,
  );
  if (!accountResult.ok) {
    revalidatePath('/');
    return {
      ok: false,
      message: `Person berhasil dibuat, tetapi UserAccount gagal dibuat: ${accountResult.message}`,
    };
  }

  revalidatePath('/');
  return {
    ok: true,
    message: `Person ${personResult.data.fullName} dan UserAccount ${accountResult.data.username ?? accountResult.data.email ?? accountResult.data.id} berhasil dibuat.`,
  };
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}
