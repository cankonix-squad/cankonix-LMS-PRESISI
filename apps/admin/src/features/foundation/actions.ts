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
import { assignmentStatusLabel, foundationMutationError } from './display';
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
      message: foundationMutationError(result, 'Organisasi gagal dibuat.'),
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
      message: foundationMutationError(result, 'Organisasi gagal diperbarui.'),
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
      message: foundationMutationError(
        result,
        'Status organisasi gagal diperbarui.',
      ),
    };
  }

  revalidatePath('/');
  revalidatePath('/organisasi');
  return {
    ok: true,
    message: `${name || result.data.name} berhasil ${status === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}.`,
  };
}

/**
 * Create a person (Data Individu) — identity only.
 *
 * Deliberately has no account fields. A person can exist without ever logging
 * in, and creating one must not be able to create a login as a side effect.
 */
export async function createPersonAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const personnelNumber = getText(formData, 'personnelNumber');
  const fullName = getText(formData, 'fullName');
  const rank = getText(formData, 'rank');
  const title = getText(formData, 'title');
  const email = getText(formData, 'email').toLowerCase();
  const phone = getText(formData, 'phone');

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

  const result = await createAdminApiClient().persons.create(personInput);
  if (!result.ok) {
    return {
      ok: false,
      message: foundationMutationError(result, 'Data individu gagal dibuat.'),
    };
  }

  revalidatePath('/');
  revalidatePath('/data-individu');
  return {
    ok: true,
    message: `Data individu ${result.data.fullName} berhasil dibuat tanpa akun pengguna.`,
  };
}

/**
 * Link a user account to a person that is already registered.
 *
 * The person is *selected*, never re-typed: the form sends only `personId` plus
 * login metadata. That is what keeps one human from becoming two person rows
 * when they receive a second role or a first account.
 */
export async function createPersonAccountAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const personId = getText(formData, 'personId');
  const username = getText(formData, 'username');
  const accountEmail = getText(formData, 'accountEmail').toLowerCase();
  const externalAuthId = getText(formData, 'externalAuthId');
  const status = getText(
    formData,
    'accountStatus',
  ) as CreateUserAccountInput['status'];

  if (!personId) {
    return { ok: false, message: 'Data individu wajib dipilih.' };
  }

  const input: CreateUserAccountInput = {
    status: status || 'ACTIVE',
  };
  if (username) input.username = username;
  if (accountEmail) input.email = accountEmail;
  if (externalAuthId) input.externalAuthId = externalAuthId;

  const result = await createAdminApiClient().persons.createAccount(
    personId,
    input,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: foundationMutationError(result, 'Akun pengguna gagal dibuat.'),
    };
  }

  revalidatePath('/');
  revalidatePath('/akun-pengguna');
  revalidatePath(`/data-individu/${personId}`);
  return {
    ok: true,
    message: `Akun pengguna ${result.data.username ?? result.data.email ?? result.data.id} berhasil dihubungkan.`,
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
      message: foundationMutationError(
        result,
        'Data individu gagal diperbarui.',
      ),
    };
  revalidatePath('/data-individu');
  revalidatePath(`/data-individu/${id}`);
  revalidatePath('/');
  return {
    ok: true,
    message: `Data individu ${result.data.fullName} berhasil diperbarui.`,
  };
}

export async function updatePersonAccountAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  const personId = getText(formData, 'personId');
  if (!personId)
    return { ok: false, message: 'Data individu pemilik akun wajib dipilih.' };
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
      message: foundationMutationError(
        result,
        'Akun pengguna gagal diperbarui.',
      ),
    };
  revalidatePath('/akun-pengguna');
  revalidatePath(`/data-individu/${personId}`);
  return { ok: true, message: 'Akun pengguna berhasil diperbarui.' };
}

export async function createRoleAssignmentAction(
  _state: FoundationActionState,
  formData: FormData,
): Promise<FoundationActionState> {
  if (!(await getAdminAccessToken())) {
    return {
      ok: false,
      message: 'Sesi berakhir. Masuk kembali lalu ulangi penugasan.',
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
      message: 'Akun pengguna dan peran wajib dipilih.',
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
      message: foundationMutationError(result, 'Penugasan gagal dibuat.'),
    };
  }

  revalidatePath('/');
  revalidatePath('/penugasan');
  return {
    ok: true,
    message: `Penugasan ${result.data.role?.name ?? result.data.roleId} berhasil dibuat.`,
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
      message: 'Penugasan, tipe cakupan, dan ID cakupan wajib diisi.',
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
      message: foundationMutationError(result, 'Cakupan gagal ditambahkan.'),
    };
  }

  revalidatePath('/');
  revalidatePath('/penugasan');
  return { ok: true, message: 'Cakupan penugasan berhasil ditambahkan.' };
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
      message: 'Penugasan dan status wajib dipilih.',
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
      message: foundationMutationError(
        result,
        'Status penugasan gagal diubah.',
      ),
    };
  }

  revalidatePath('/');
  revalidatePath('/penugasan');
  return {
    ok: true,
    message: `Status penugasan diubah menjadi ${assignmentStatusLabel(status)}.`,
  };
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
      message: 'Penugasan dan cakupan wajib dipilih.',
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
      message: foundationMutationError(result, 'Cakupan gagal dihapus.'),
    };
  }

  revalidatePath('/');
  revalidatePath('/penugasan');
  return { ok: true, message: 'Cakupan penugasan berhasil dihapus.' };
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
      message: 'Kode peran dan nama peran wajib diisi.',
    };
  }

  const input: CreateRoleInput = { code, name };
  if (description) input.description = description;

  const result = await createAdminApiClient().authorization.createRole(input);
  if (!result.ok) {
    return {
      ok: false,
      message: foundationMutationError(result, 'Peran gagal dibuat.'),
    };
  }

  revalidatePath('/');
  revalidatePath('/peran-hak-akses');
  return {
    ok: true,
    message: `Peran ${result.data.name} berhasil dibuat.`,
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
      message: 'ID, kode peran, dan nama peran wajib diisi.',
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
      message: foundationMutationError(result, 'Peran gagal diperbarui.'),
    };
  }

  revalidatePath('/');
  revalidatePath('/peran-hak-akses');
  return {
    ok: true,
    message: `Peran ${result.data.name} berhasil diperbarui.`,
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
      message: 'Peran dan status target wajib valid.',
    };
  }

  const result = await createAdminApiClient().authorization.updateRole(id, {
    status,
  });
  if (!result.ok) {
    return {
      ok: false,
      message: foundationMutationError(
        result,
        'Status peran gagal diperbarui.',
      ),
    };
  }

  revalidatePath('/');
  revalidatePath('/peran-hak-akses');
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
      message: 'Peran dan hak akses wajib dipilih.',
    };
  }

  const result = await createAdminApiClient().authorization.grantPermission(
    roleId,
    permissionId,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: foundationMutationError(
        result,
        'Hak akses gagal ditambahkan ke peran.',
      ),
    };
  }

  revalidatePath('/');
  revalidatePath('/peran-hak-akses');
  return { ok: true, message: 'Hak akses berhasil ditambahkan ke peran.' };
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
      message: 'Peran dan hak akses wajib dipilih.',
    };
  }

  const result = await createAdminApiClient().authorization.revokePermission(
    roleId,
    permissionId,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: foundationMutationError(
        result,
        'Hak akses gagal dilepas dari peran.',
      ),
    };
  }

  revalidatePath('/');
  revalidatePath('/peran-hak-akses');
  return { ok: true, message: 'Hak akses berhasil dilepas dari peran.' };
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
      message: 'Peran dan templat wajib dipilih.',
    };
  }

  const template: RoleTemplate | undefined = ROLE_TEMPLATES.find(
    (item) => item.id === templateId,
  );
  if (!template) {
    return { ok: false, message: 'Templat peran tidak ditemukan.' };
  }
  if (!template.enabled) {
    return {
      ok: false,
      message: 'Templat ini belum tersedia untuk dipakai.',
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
  revalidatePath('/peran-hak-akses');

  if (failed.length > 0) {
    return {
      ok: false,
      message: `Sebagian hak akses templat gagal dipasang: ${failed.join(', ')}.`,
    };
  }

  return {
    ok: true,
    message: `Templat ${template.name} berhasil dipasang (${template.permissionCodes.length} hak akses).`,
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
