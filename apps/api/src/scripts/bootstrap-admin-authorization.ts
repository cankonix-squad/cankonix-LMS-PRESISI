/**
 * TASK-009AI — Bootstrap Admin Authorization
 *
 * Operational, idempotent script that links the `bootstrap-admin` account to the
 * `SUPER_ADMIN` role (which the TASK-009AI migration already created and loaded
 * with all seven `authorization.*` permissions).
 *
 * This script is the ONLY place that names the bootstrap account and the
 * bootstrap role. Runtime authorization (PermissionGuard, controllers, services)
 * never references these names: authorization stays Permission + Scope, and the
 * role is data. The script exists to perform the initial, reviewable grant that
 * the UI cannot perform because it is itself gated by the very permissions being
 * granted.
 *
 * Idempotency:
 * - resolves the account, role, and an existing active assignment by identity,
 *   never by assuming absence;
 * - an existing ACTIVE assignment for (account, role) is reported and left
 *   untouched; a second run creates no duplicate row.
 *
 * Usage (from the API container after `prisma migrate deploy`):
 *   node dist/scripts/bootstrap-admin-authorization.js
 *
 * Exit codes: 0 on success, 1 on failure so a pipeline can fail loudly.
 */
import { Prisma, PrismaClient } from '@prisma/client';

const BOOTSTRAP_PERSONNEL_NUMBER = 'BOOTSTRAP-ADMIN';
const BOOTSTRAP_USERNAME = 'bootstrap-admin';
const BOOTSTRAP_ROLE_CODE = 'SUPER_ADMIN';
const BOOTSTRAP_EXTERNAL_AUTH_ID =
  process.env.BOOTSTRAP_EXTERNAL_AUTH_ID?.trim() || '';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const role = await prisma.role.findUnique({
      where: { code: BOOTSTRAP_ROLE_CODE },
    });
    if (!role) {
      throw new Error(
        `Role "${BOOTSTRAP_ROLE_CODE}" not found; run the TASK-009AI migration first.`,
      );
    }

    const identityCandidates: Prisma.UserAccountWhereInput[] = [
      { username: BOOTSTRAP_USERNAME },
      { username: BOOTSTRAP_USERNAME.toUpperCase() },
      {
        person: {
          personnelNumber: BOOTSTRAP_PERSONNEL_NUMBER,
        },
      },
      {
        person: {
          personnelNumber: BOOTSTRAP_USERNAME,
        },
      },
    ];
    if (BOOTSTRAP_EXTERNAL_AUTH_ID) {
      identityCandidates.unshift({
        externalAuthId: BOOTSTRAP_EXTERNAL_AUTH_ID,
      });
    }

    const accounts = await prisma.userAccount.findMany({
      where: {
        OR: identityCandidates,
      },
      include: { person: true },
    });

    if (accounts.length === 0) {
      throw new Error(
        `No bootstrap user account found by Keycloak subject "${BOOTSTRAP_EXTERNAL_AUTH_ID || '(not provided)'}", ` +
          `username "${BOOTSTRAP_USERNAME}", or person personnel number "${BOOTSTRAP_PERSONNEL_NUMBER}".`,
      );
    }

    const results = [];
    for (const account of accounts) {
      const existing = await prisma.userRoleAssignment.findFirst({
        where: {
          userAccountId: account.id,
          roleId: role.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing?.status === 'ACTIVE' && existing.validUntil === null) {
        results.push({
          status: 'already_assigned',
          userAccountId: account.id,
          username: account.username,
          externalAuthId: account.externalAuthId,
          personnelNumber: account.person.personnelNumber,
          roleId: role.id,
          roleCode: role.code,
          assignmentId: existing.id,
        });
        continue;
      }

      if (existing) {
        const assignment = await prisma.userRoleAssignment.update({
          where: { id: existing.id },
          data: {
            status: 'ACTIVE',
            validUntil: null,
          },
        });
        results.push({
          status: 'reactivated',
          userAccountId: account.id,
          username: account.username,
          externalAuthId: account.externalAuthId,
          personnelNumber: account.person.personnelNumber,
          roleId: role.id,
          roleCode: role.code,
          assignmentId: assignment.id,
          previousStatus: existing.status,
        });
        continue;
      }

      // Unrestricted (national) access: no scopes attached, which
      // RoleAssignmentsService resolves as `isUnrestricted = true`.
      const assignment = await prisma.userRoleAssignment.create({
        data: {
          userAccountId: account.id,
          roleId: role.id,
          status: 'ACTIVE',
          validFrom: new Date(),
        },
      });

      results.push({
        status: 'assigned',
        userAccountId: account.id,
        username: account.username,
        externalAuthId: account.externalAuthId,
        personnelNumber: account.person.personnelNumber,
        roleId: role.id,
        roleCode: role.code,
        assignmentId: assignment.id,
        scopes: [],
      });
    }

    const permissionCount = await prisma.rolePermission.count({
      where: { roleId: role.id },
    });

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          matchedAccounts: accounts.length,
          keycloakSubjectProvided: Boolean(BOOTSTRAP_EXTERNAL_AUTH_ID),
          roleId: role.id,
          roleCode: role.code,
          permissionCount,
          results,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Unknown bootstrap error',
  );
  process.exitCode = 1;
});
