import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { RolePermissionWorkspace } from '@/features/foundation/role-permission-management';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Role & Permission — Admin LMS PRESISI',
};

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const roleSearch = value(params.roleSearch);
  const permissionSearch = value(params.permissionSearch);
  const roleStatus =
    params.roleStatus === 'ACTIVE' || params.roleStatus === 'INACTIVE'
      ? params.roleStatus
      : undefined;
  const rolePage = positiveInt(params.rolePage);
  const permissionPage = positiveInt(params.permissionPage);
  const roleLimit = clamp(positiveInt(params.roleLimit, 25), 10, 50);
  const permissionLimit = clamp(
    positiveInt(params.permissionLimit, 25),
    10,
    50,
  );
  const api = createAdminApiClient();
  const [roles, permissions] = await Promise.all([
    getOrEmpty(() =>
      api.authorization.roles({
        search: roleSearch,
        status: roleStatus,
        page: rolePage,
        limit: roleLimit,
      }),
    ),
    getOrEmpty(() =>
      api.authorization.permissions({
        search: permissionSearch,
        page: permissionPage,
        limit: permissionLimit,
      }),
    ),
  ]);
  const rolePermissions = Object.fromEntries(
    await Promise.all(
      (roles.data?.data ?? []).map(async (role) => [
        role.id,
        await getOrEmpty(() => api.authorization.rolePermissions(role.id)),
      ]),
    ),
  );

  return (
    <AdminShell>
      <RolePermissionWorkspace
        roles={roles}
        permissions={permissions}
        roleFilters={{
          search: roleSearch,
          status: roleStatus,
          page: rolePage,
          limit: roleLimit,
        }}
        permissionFilters={{
          search: permissionSearch,
          page: permissionPage,
          limit: permissionLimit,
        }}
        rolePermissions={rolePermissions}
      />
    </AdminShell>
  );
}

function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}

function positiveInt(input: string | string[] | undefined, fallback = 1) {
  if (typeof input !== 'string') return fallback;
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
