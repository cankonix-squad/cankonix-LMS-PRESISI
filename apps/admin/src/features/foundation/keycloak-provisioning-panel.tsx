'use client';

import type {
  KeycloakProvisioningAction,
  KeycloakProvisioningStatus,
  KeycloakProvisioningStatusResult,
} from '@lms/api-client';
import { useActionState, useState } from 'react';
import { ActionMessage, FormField, Pill } from '@/components/admin';
import {
  type KeycloakActionState,
  linkExistingKeycloakUserAction,
  provisionKeycloakUserAction,
  refreshKeycloakStatusAction,
  requestKeycloakActivationAction,
  setKeycloakPasswordAction,
  setKeycloakUserStatusAction,
} from './keycloak-actions';

const inputClass =
  'min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950';

const ONLY: KeycloakActionState = { ok: false, message: null, result: null };

const STATUS_PRESENTATION: Record<
  KeycloakProvisioningStatus,
  { label: string; tone: 'green' | 'amber' | 'red' | 'blue' | 'slate' }
> = {
  READY: { label: 'Siap login', tone: 'green' },
  ACTIVATION_REQUIRED: { label: 'Perlu aktivasi', tone: 'amber' },
  NOT_PROVISIONED: { label: 'Belum terhubung', tone: 'slate' },
  ADOPTABLE: { label: 'Dapat dihubungkan', tone: 'blue' },
  LINK_CONFLICT: { label: 'Konflik identitas', tone: 'red' },
  STALE_LINK: { label: 'Tautan tidak valid', tone: 'red' },
  NOT_CONFIGURED: { label: 'Penghubungan akun nonaktif', tone: 'red' },
  ERROR: { label: 'Gagal / tidak diketahui', tone: 'red' },
};

export function ProvisioningBadge({
  status,
}: {
  status: KeycloakProvisioningStatus;
}) {
  const presentation = STATUS_PRESENTATION[status];
  return <Pill tone={presentation.tone}>{presentation.label}</Pill>;
}

/**
 * Keycloak provisioning panel for one account.
 *
 * The panel renders exactly what the API reported: a green badge means the API
 * verified an enabled Keycloak user with no pending activation — never a guess.
 * Every mutation goes through a server action, so no Keycloak credential ever
 * reaches the browser, and the password field is never persisted by the LMS.
 */
export function KeycloakProvisioningPanel({
  personId,
  provisioning,
}: {
  personId: string;
  provisioning: KeycloakProvisioningStatusResult;
}) {
  const [provisionState, provisionAction, provisionPending] = useActionState(
    provisionKeycloakUserAction,
    ONLY,
  );
  const [linkState, linkAction, linkPending] = useActionState(
    linkExistingKeycloakUserAction,
    ONLY,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    setKeycloakPasswordAction,
    ONLY,
  );
  const [activationState, activationAction, activationPending] = useActionState(
    requestKeycloakActivationAction,
    ONLY,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    setKeycloakUserStatusAction,
    ONLY,
  );
  const [refreshState, refreshAction, refreshPending] = useActionState(
    refreshKeycloakStatusAction,
    ONLY,
  );
  const [showPassword, setShowPassword] = useState(false);

  // The freshest server answer across every action drives the badge, so a failed
  // call cannot leave a stale "ready to log in" on screen.
  const current =
    statusState.result?.provisioning ??
    passwordState.result?.provisioning ??
    activationState.result?.provisioning ??
    refreshState.result?.provisioning ??
    provisionState.result?.provisioning ??
    linkState.result?.provisioning ??
    provisioning;

  const pending =
    provisionPending ||
    linkPending ||
    passwordPending ||
    activationPending ||
    statusPending ||
    refreshPending;
  const can = (action: KeycloakProvisioningAction) =>
    current.availableActions.includes(action);

  const messages = [
    provisionState,
    linkState,
    activationState,
    statusState,
    refreshState,
  ].filter((state) => state.message);

  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Identitas Keycloak
          </p>
          <p className="text-xs text-slate-500">
            Hanya identitas login yang dibuat di Keycloak. Peran dan cakupan
            kewenangan tetap dikelola LMS.
          </p>
        </div>
        <ProvisioningBadge status={current.status} />
      </div>

      <p className="text-xs leading-5 text-slate-700">{current.summary}</p>

      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-slate-400">Nama pengguna Keycloak</dt>
          <dd className="mt-0.5 truncate font-medium text-slate-700">
            {current.keycloakUsername || '-'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Subject (externalAuthId)</dt>
          <dd className="mt-0.5 truncate font-medium text-slate-700">
            {current.externalAuthId || '-'}
          </dd>
        </div>
      </dl>

      {!current.provisioningConfigured ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          API belum memiliki kredensial Admin Keycloak. Hubungi administrator
          untuk menyetel <code>KEYCLOAK_ADMIN_*</code>.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {can('PROVISION') || can('RETRY') ? (
          <form action={provisionAction}>
            <input type="hidden" name="personId" value={personId} />
            <button
              type="submit"
              disabled={pending}
              className="min-h-10 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {can('PROVISION') ? 'Buat akun Keycloak' : 'Coba hubungkan ulang'}
            </button>
          </form>
        ) : null}

        {can('LINK_EXISTING') ? (
          <form action={linkAction}>
            <input type="hidden" name="personId" value={personId} />
            <button
              type="submit"
              disabled={pending}
              className="min-h-10 rounded-md border border-sky-300 bg-white px-4 text-sm font-semibold text-sky-700 disabled:opacity-60"
            >
              Hubungkan pengguna Keycloak yang ada
            </button>
          </form>
        ) : null}

        {can('ENABLE') ? (
          <form action={statusAction}>
            <input type="hidden" name="personId" value={personId} />
            <input type="hidden" name="enabled" value="true" />
            <button
              type="submit"
              disabled={pending}
              className="min-h-10 rounded-md border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 disabled:opacity-60"
            >
              Aktifkan login Keycloak
            </button>
          </form>
        ) : null}

        {current.status === 'ACTIVATION_REQUIRED' ? (
          <form action={activationAction}>
            <input type="hidden" name="personId" value={personId} />
            <button
              type="submit"
              disabled={pending}
              className="min-h-10 rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 disabled:opacity-60"
            >
              Periksa aktivasi Keycloak
            </button>
          </form>
        ) : null}

        {current.status === 'READY' ? (
          <form action={statusAction}>
            <input type="hidden" name="personId" value={personId} />
            <input type="hidden" name="enabled" value="false" />
            <button
              type="submit"
              disabled={pending}
              className="min-h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Nonaktifkan login Keycloak
            </button>
          </form>
        ) : null}

        <form action={refreshAction}>
          <input type="hidden" name="personId" value={personId} />
          <button
            type="submit"
            disabled={pending}
            className="min-h-10 rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700 disabled:opacity-60"
          >
            Muat ulang status login
          </button>
        </form>
      </div>

      <div className="grid gap-3 border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          className="w-fit text-sm font-semibold text-sky-700"
        >
          {showPassword
            ? 'Tutup formulir kata sandi'
            : 'Setel / reset kata sandi Keycloak'}
        </button>
        {showPassword ? (
          <form
            action={passwordAction}
            className="grid gap-3"
            key={passwordState.message ?? 'fresh'}
          >
            <input type="hidden" name="personId" value={personId} />
            <FormField label="Kata sandi baru" required>
              <input
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                className={inputClass}
              />
            </FormField>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" name="temporary" defaultChecked />
              Jadikan kredensial sementara (pengguna wajib mengganti saat login
              pertama)
            </label>
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              Password dikirim ke Keycloak dan tidak disimpan di database LMS.
            </p>
            <button
              type="submit"
              disabled={passwordPending}
              className="w-fit min-h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {passwordPending ? 'Menyimpan...' : 'Simpan kata sandi'}
            </button>
            {passwordState.message ? (
              <ActionMessage
                state={{ ok: passwordState.ok, message: passwordState.message }}
              />
            ) : null}
          </form>
        ) : null}
        {activationState.message ? (
          <ActionMessage
            state={{
              ok: activationState.ok,
              message: activationState.message,
            }}
          />
        ) : null}
      </div>

      {messages.map((state, index) => (
        <ActionMessage
          key={index}
          state={{ ok: state.ok, message: state.message }}
        />
      ))}

      <p className="text-xs leading-5 text-slate-500">
        Password tidak pernah disimpan di LMS. Agar personel dapat login, user
        harus ada di Keycloak dan perannya diberikan melalui Assignment &amp;
        Scope.
      </p>
    </section>
  );
}
