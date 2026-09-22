'use server';

import type {
  AddRoleAssignmentScopesInput,
  CreateOrganizationInput,
  CreatePersonInput,
  CreateRoleAssignmentInput,
  CreateUserAccountInput,
  RoleAssignmentStatus,
  ScopeInput,
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

export async function createRoleAssignmentAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const userAccountId = getText(formData, 'userAccountId');
  const roleId = getText(formData, 'roleId');
  const validFrom = getText(formData, 'validFrom');
  const validUntil = getText(formData, 'validUntil');
  const scope = getScopeInput(formData);

  if (!userAccountId || !roleId) {
    return {
      ok: false,
      message: 'UserAccount dan role wajib dipilih.',
    };
  }

  const input: CreateRoleAssignmentInput = { userAccountId, roleId };
  if (validFrom) input.validFrom = new Date(validFrom).toISOString();
  if (validUntil) input.validUntil = new Date(validUntil).toISOString();
  if (scope) input.scopes = [scope];

  const result = await createAdminApiClient().authorization.createAssignment(
    input,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Role assignment gagal dibuat.',
    };
  }

  revalidatePath('/');
  revalidatePath('/assignments');
  return {
    ok: true,
    message: `Assignment ${result.data.role?.name ?? result.data.roleId} berhasil dibuat.`,
  };
}

export async function addAssignmentScopeAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const assignmentId = getText(formData, 'assignmentId');
  const scope = getScopeInput(formData);

  if (!assignmentId || !scope) {
    return {
      ok: false,
      message: 'Assignment, scope type, dan scope ID wajib diisi.',
    };
  }

  const input: AddRoleAssignmentScopesInput = { scopes: [scope] };
  const result = await createAdminApiClient().authorization.addAssignmentScopes(
    assignmentId,
    input,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Scope gagal ditambahkan.',
    };
  }

  revalidatePath('/');
  revalidatePath('/assignments');
  return { ok: true, message: 'Scope assignment berhasil ditambahkan.' };
}

export async function updateAssignmentStatusAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const assignmentId = getText(formData, 'assignmentId');
  const status = getText(formData, 'status') as RoleAssignmentStatus;

  if (!assignmentId || !isRoleAssignmentStatus(status)) {
    return {
      ok: false,
      message: 'Assignment dan status wajib dipilih.',
    };
  }

  const result =
    await createAdminApiClient().authorization.updateAssignmentStatus(
      assignmentId,
      status,
    );
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Status assignment gagal diubah.',
    };
  }

  revalidatePath('/');
  revalidatePath('/assignments');
  return { ok: true, message: `Status assignment diubah menjadi ${status}.` };
}

export async function removeAssignmentScopeAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const assignmentId = getText(formData, 'assignmentId');
  const scopeId = getText(formData, 'scopeRecordId');

  if (!assignmentId || !scopeId) {
    return {
      ok: false,
      message: 'Assignment dan scope wajib dipilih.',
    };
  }

  const result =
    await createAdminApiClient().authorization.removeAssignmentScope(
      assignmentId,
      scopeId,
    );
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Scope gagal dihapus.',
    };
  }

  revalidatePath('/');
  revalidatePath('/assignments');
  return { ok: true, message: 'Scope assignment berhasil dihapus.' };
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function getScopeInput(formData: FormData): ScopeInput | null {
  const scopeType = getText(formData, 'scopeType') as ScopeInput['scopeType'];
  const scopeId = getText(formData, 'scopeId');
  if (!scopeType || !scopeId) return null;
  if (!isScopeType(scopeType)) return null;
  return { scopeType, scopeId };
}

function isScopeType(value: string): value is ScopeInput['scopeType'] {
  return ['ORGANIZATION', 'PROGRAM', 'BATCH', 'CLASS', 'CLASS_SUBJECT'].includes(
    value,
  );
}

function isRoleAssignmentStatus(
  value: string,
): value is RoleAssignmentStatus {
  return ['ACTIVE', 'INACTIVE', 'REVOKED'].includes(value);
}
