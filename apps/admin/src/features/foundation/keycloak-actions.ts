'use server';

import type { KeycloakProvisioningOperationResult } from '@lms/api-client';
import { revalidatePath } from 'next/cache';
import { createAdminApiClient, getAdminAccessToken } from '@/lib/api';

export type KeycloakActionState = {
  ok: boolean;
  message: string | null;
  /** Server-reported provisioning state after the call, when available. */
  result: KeycloakProvisioningOperationResult | null;
};

const EMPTY: KeycloakActionState = { ok: false, message: null, result: null };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

async function run(
  formData: FormData,
  operation: (
    api: ReturnType<typeof createAdminApiClient>,
    personId: string,
  ) => Promise<
    | { ok: true; data: KeycloakProvisioningOperationResult }
    | { ok: false; status: number; message: string }
  >,
): Promise<KeycloakActionState> {
  if (!(await getAdminAccessToken())) {
    return {
      ...EMPTY,
      message: 'Sesi berakhir. Masuk kembali lalu ulangi provisioning.',
    };
  }
  const personId = field(formData, 'personId');
  if (!personId) return { ...EMPTY, message: 'Personel wajib dipilih.' };

  const result = await operation(createAdminApiClient(), personId);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || 'Permintaan provisioning gagal.',
      result: null,
    };
  }
  revalidatePath('/personel');
  revalidatePath('/');
  return {
    ok: result.data.success,
    message: result.data.message ?? null,
    result: result.data,
  };
}

/**
 * Create (or adopt) the Keycloak identity for this account.
 *
 * The API is authoritative for the outcome: `success` is `false` when the link
 * could not be established, so the UI never shows a false "ready to log in".
 */
export async function provisionKeycloakUserAction(
  _state: KeycloakActionState,
  formData: FormData,
): Promise<KeycloakActionState> {
  return run(formData, (api, personId) =>
    api.persons.provisionKeycloakUser(personId),
  );
}

/** Link an existing same-username Keycloak user without creating a duplicate. */
export async function linkExistingKeycloakUserAction(
  _state: KeycloakActionState,
  formData: FormData,
): Promise<KeycloakActionState> {
  return run(formData, (api, personId) =>
    api.persons.linkExistingKeycloakUser(personId),
  );
}

/**
 * Set or reset the Keycloak password.
 *
 * The password is read from the form, forwarded to the API (which forwards it to
 * Keycloak) and never stored in or returned by the LMS.
 */
export async function setKeycloakPasswordAction(
  _state: KeycloakActionState,
  formData: FormData,
): Promise<KeycloakActionState> {
  const password = field(formData, 'password');
  const temporary = formData.get('temporary') !== 'off';
  if (password.length < 8) {
    return {
      ...EMPTY,
      message: 'Password minimal 8 karakter dan tidak disimpan di LMS.',
    };
  }
  return run(formData, (api, personId) =>
    api.persons.setKeycloakPassword(personId, { password, temporary }),
  );
}

/** Report the Keycloak activation state (Keycloak owns the activation email). */
export async function requestKeycloakActivationAction(
  _state: KeycloakActionState,
  formData: FormData,
): Promise<KeycloakActionState> {
  return run(formData, (api, personId) =>
    api.persons.requestKeycloakActivation(personId),
  );
}

/** Enable or disable the Keycloak login for this account. */
export async function setKeycloakUserStatusAction(
  _state: KeycloakActionState,
  formData: FormData,
): Promise<KeycloakActionState> {
  const enabled = field(formData, 'enabled') === 'true';
  return run(formData, (api, personId) =>
    api.persons.setKeycloakUserStatus(personId, enabled),
  );
}

/**
 * Read-only refresh of the provisioning status.
 *
 * Presented as an action so an operator can re-check after changing something
 * directly in Keycloak (for example enrolling the user in an LDAP directory)
 * without leaving the drawer.
 */
export async function refreshKeycloakStatusAction(
  _state: KeycloakActionState,
  formData: FormData,
): Promise<KeycloakActionState> {
  if (!(await getAdminAccessToken())) {
    return {
      ...EMPTY,
      message: 'Sesi berakhir. Masuk kembali lalu ulangi.',
    };
  }
  const personId = field(formData, 'personId');
  if (!personId) return { ...EMPTY, message: 'Personel wajib dipilih.' };
  try {
    const status =
      await createAdminApiClient().persons.getKeycloakProvisioning(personId);
    return {
      ok: status.readyToLogin,
      message: status.summary,
      result: { success: status.readyToLogin, provisioning: status },
    };
  } catch (error) {
    return {
      ...EMPTY,
      message:
        error instanceof Error
          ? error.message
          : 'Status provisioning tidak dapat dimuat.',
    };
  }
}
