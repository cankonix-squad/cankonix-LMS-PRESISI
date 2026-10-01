'use server';

import type {
  AddRoleAssignmentScopesInput,
  CreateOrganizationInput,
  CreatePersonInput,
  CreateRoleAssignmentInput,
  CreateRoleInput,
  CreateUserAccountInput,
  Organization,
  Role,
  RoleAssignmentStatus,
  ScopeInput,
  UpdateOrganizationInput,
  UpdatePersonInput,
  UpdateRoleInput,
  UpdateUserAccountInput,
} from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient, getAdminAccessToken } from '@/lib/api';
import {
  ROLE_TEMPLATES,
  type RoleTemplate,
} from '@/lib/admin-permission-labels';

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
  revalidatePath('/organisasi');
  return {
    ok: true,
    message: `Organisasi ${result.data.name} berhasil dibuat.`,
  };
}

export async function updateOrganizationAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const id = getText(formData, 'id');
  const code = getText(formData, 'code').toUpperCase();
  const name = getText(formData, 'name');
  const organizationType = getText(formData, 'organizationType');
  const parentId = getText(formData, 'parentId');
  const status = getText(formData, 'status') as Organization['status'];

  if (!id || !code || !name) {
    return {
      ok: false,
      message: 'ID, kode organisasi, dan nama organisasi wajib diisi.',
    };
  }

  const input: UpdateOrganizationInput = {
    code,
    name,
    organizationType: organizationType || null,
    parentId: parentId || null,
    status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  };

  const result = await createAdminApiClient().organizations.update(id, input);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Organisasi gagal diperbarui.',
    };
  }

  revalidatePath('/');
  revalidatePath('/organisasi');
  return {
    ok: true,
    message: `Organisasi ${result.data.name} berhasil diperbarui.`,
  };
}

export async function updateOrganizationStatusAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const id = getText(formData, 'id');
  const name = getText(formData, 'name');
  const status = getText(formData, 'status') as Organization['status'];

  if (!id || !['ACTIVE', 'INACTIVE'].includes(status)) {
    return {
      ok: false,
      message: 'Organisasi dan status target wajib valid.',
    };
  }

  const result = await createAdminApiClient().organizations.update(id, {
    status,
  });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Status organisasi gagal diperbarui.',
    };
  }

  revalidatePath('/');
  revalidatePath('/organisasi');
  return {
    ok: true,
    message: `${name || result.data.name} berhasil ${status === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}.`,
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
        'Person berhasil dibuat. UserAccount dilewati karena username, email akun, dan ID User Keycloak kosong.',
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

export async function updatePersonAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const id = getText(formData, 'id');
  const personnelNumber = getText(formData, 'personnelNumber');
  const fullName = getText(formData, 'fullName');
  if (!id || !personnelNumber || !fullName)
    return { ok: false, message: 'ID, NRP/NIP, dan nama lengkap wajib diisi.' };
  const input: UpdatePersonInput = {
    personnelNumber,
    fullName,
    status: getText(formData, 'status') === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  };
  for (const key of ['rank', 'title', 'email', 'phone'] as const) {
    const value = getText(formData, key);
    input[key] = value || undefined;
  }
  const result = await createAdminApiClient().persons.update(id, input);
  if (!result.ok)
    return {
      ok: false,
      message: result.message || 'Data personel gagal diperbarui.',
    };
  revalidatePath('/personel');
  revalidatePath('/');
  return {
    ok: true,
    message: `Data ${result.data.fullName} berhasil diperbarui.`,
  };
}

export async function updatePersonAccountAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const personId = getText(formData, 'personId');
  if (!personId) return { ok: false, message: 'Personel akun wajib dipilih.' };
  const input: UpdateUserAccountInput = {
    username: getText(formData, 'username') || undefined,
    email: getText(formData, 'accountEmail').toLowerCase() || undefined,
    externalAuthId: getText(formData, 'externalAuthId') || undefined,
    status: getText(
      formData,
      'accountStatus',
    ) as UpdateUserAccountInput['status'],
  };
  const result = await createAdminApiClient().persons.updateAccount(
    personId,
    input,
  );
  if (!result.ok)
    return {
      ok: false,
      message: result.message || 'Akun login gagal diperbarui.',
    };
  revalidatePath('/personel');
  return { ok: true, message: 'Akun login berhasil diperbarui.' };
}

export async function createRoleAssignmentAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  if (!(await getAdminAccessToken())) {
    return {
      ok: false,
      message: 'Sesi berakhir. Masuk kembali lalu ulangi assignment.',
    };
  }
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

  const result =
    await createAdminApiClient().authorization.createAssignment(input);
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

export async function createRoleAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const code = getText(formData, 'code').toUpperCase();
  const name = getText(formData, 'name');
  const description = getText(formData, 'description');

  if (!code || !name) {
    return {
      ok: false,
      message: 'Kode role dan nama role wajib diisi.',
    };
  }

  const input: CreateRoleInput = { code, name };
  if (description) input.description = description;

  const result = await createAdminApiClient().authorization.createRole(input);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Role gagal dibuat.',
    };
  }

  revalidatePath('/');
  revalidatePath('/roles');
  return {
    ok: true,
    message: `Role ${result.data.name} berhasil dibuat.`,
  };
}

export async function updateRoleAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const id = getText(formData, 'id');
  const code = getText(formData, 'code').toUpperCase();
  const name = getText(formData, 'name');
  const description = getText(formData, 'description');

  if (!id || !code || !name) {
    return {
      ok: false,
      message: 'ID, kode role, dan nama role wajib diisi.',
    };
  }

  const input: UpdateRoleInput = { code, name };
  if (description) {
    input.description = description;
  } else {
    input.description = null;
  }

  const result = await createAdminApiClient().authorization.updateRole(
    id,
    input,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Role gagal diperbarui.',
    };
  }

  revalidatePath('/');
  revalidatePath('/roles');
  return {
    ok: true,
    message: `Role ${result.data.name} berhasil diperbarui.`,
  };
}

export async function updateRoleStatusAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const id = getText(formData, 'id');
  const name = getText(formData, 'name');
  const status = getText(formData, 'status') as Role['status'];

  if (!id || !['ACTIVE', 'INACTIVE'].includes(status)) {
    return {
      ok: false,
      message: 'Role dan status target wajib valid.',
    };
  }

  const result = await createAdminApiClient().authorization.updateRole(id, {
    status,
  });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Status role gagal diperbarui.',
    };
  }

  revalidatePath('/');
  revalidatePath('/roles');
  return {
    ok: true,
    message: `${name || result.data.name} berhasil ${status === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}.`,
  };
}

export async function grantPermissionAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const roleId = getText(formData, 'roleId');
  const permissionId = getText(formData, 'permissionId');

  if (!roleId || !permissionId) {
    return {
      ok: false,
      message: 'Role dan permission wajib dipilih.',
    };
  }

  const result = await createAdminApiClient().authorization.grantPermission(
    roleId,
    permissionId,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Permission gagal ditambahkan ke role.',
    };
  }

  revalidatePath('/');
  revalidatePath('/roles');
  return { ok: true, message: 'Permission berhasil ditambahkan ke role.' };
}

export async function revokePermissionAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const roleId = getText(formData, 'roleId');
  const permissionId = getText(formData, 'permissionId');

  if (!roleId || !permissionId) {
    return {
      ok: false,
      message: 'Role dan permission wajib dipilih.',
    };
  }

  const result = await createAdminApiClient().authorization.revokePermission(
    roleId,
    permissionId,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Permission gagal dilepas dari role.',
    };
  }

  revalidatePath('/');
  revalidatePath('/roles');
  return { ok: true, message: 'Permission berhasil dilepas dari role.' };
}

/**
 * Apply a role template: grant every recommended permission of the template
 * to the target role. This is a UI convenience that reuses the ordinary
 * `grantPermission` endpoint — it does not introduce a new authorization
 * branch, nor does it hardcode any role. Permission codes stay the source of
 * truth. Idempotent: already-granted permissions are simply skipped by the API.
 */
export async function applyTemplateAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const roleId = getText(formData, 'roleId');
  const templateId = getText(formData, 'templateId');

  if (!roleId || !templateId) {
    return {
      ok: false,
      message: 'Role dan template wajib dipilih.',
    };
  }

  const template: RoleTemplate | undefined = ROLE_TEMPLATES.find(
    (item) => item.id === templateId,
  );
  if (!template) {
    return { ok: false, message: 'Template role tidak ditemukan.' };
  }
  if (!template.enabled) {
    return {
      ok: false,
      message: 'Template ini belum tersedia untuk dipakai.',
    };
  }

  const authorization = createAdminApiClient().authorization;
  const failed: string[] = [];

  for (const permissionCode of template.permissionCodes) {
    // Resolve the permission id by code through the catalogue. We query with
    // an exact search and match on `code` to keep this idempotent and robust
    // against id changes between environments.
    let permission: { id: string; code: string } | undefined;
    try {
      const lookup = await authorization.permissions({
        search: permissionCode,
        page: 1,
        limit: 20,
      });
      permission = lookup.data.find((p) => p.code === permissionCode);
    } catch {
      permission = undefined;
    }
    if (!permission) {
      failed.push(permissionCode);
      continue;
    }

    const result = await authorization.grantPermission(roleId, permission.id);
    if (!result.ok) {
      failed.push(permissionCode);
    }
  }

  revalidatePath('/');
  revalidatePath('/roles');

  if (failed.length > 0) {
    return {
      ok: false,
      message: `Sebagian permission template gagal dipasang: ${failed.join(', ')}.`,
    };
  }

  return {
    ok: true,
    message: `Template ${template.name} berhasil dipasang (${template.permissionCodes.length} permission).`,
  };
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
  return [
    'ORGANIZATION',
    'PROGRAM',
    'BATCH',
    'CLASS',
    'CLASS_SUBJECT',
  ].includes(value);
}

function isRoleAssignmentStatus(value: string): value is RoleAssignmentStatus {
  return ['ACTIVE', 'INACTIVE', 'REVOKED'].includes(value);
}
