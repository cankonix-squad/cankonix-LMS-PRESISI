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
import { PrismaClient } from '@prisma/client';

const BOOTSTRAP_PERSONNEL_NUMBER = 'BOOTSTRAP-ADMIN';
const BOOTSTRAP_ROLE_CODE = 'SUPER_ADMIN';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const person = await prisma.person.findUnique({
      where: { personnelNumber: BOOTSTRAP_PERSONNEL_NUMBER },
    });
    if (!person) {
      throw new Error(
        `Bootstrap person "${BOOTSTRAP_PERSONNEL_NUMBER}" not found; ` +
          'provision the person/user account first, then re-run this script.',
      );
    }

    const account = await prisma.userAccount.findUnique({
      where: { personId: person.id },
    });
    if (!account) {
      throw new Error(
        `No user account for person "${BOOTSTRAP_PERSONNEL_NUMBER}" (personId=${person.id}).`,
      );
    }

    const role = await prisma.role.findUnique({
      where: { code: BOOTSTRAP_ROLE_CODE },
    });
    if (!role) {
      throw new Error(
        `Role "${BOOTSTRAP_ROLE_CODE}" not found; run the TASK-009AI migration first.`,
      );
    }

    const existing = await prisma.userRoleAssignment.findFirst({
      where: {
        userAccountId: account.id,
        roleId: role.id,
        status: 'ACTIVE',
      },
    });
    if (existing) {
      // Idempotent: the bootstrap account already holds this role.
      console.log(
        JSON.stringify(
          {
            status: 'already_assigned',
            userAccountId: account.id,
            roleId: role.id,
            roleCode: role.code,
            assignmentId: existing.id,
          },
          null,
          2,
        ),
      );
      return;
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

    console.log(
      JSON.stringify(
        {
          status: 'assigned',
          userAccountId: account.id,
          roleId: role.id,
          roleCode: role.code,
          assignmentId: assignment.id,
          scopes: [],
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
