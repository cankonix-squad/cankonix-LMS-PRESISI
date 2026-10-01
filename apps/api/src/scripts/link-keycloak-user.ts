/**
 * TASK-009AN — Link an existing LMS account to its Keycloak identity.
 *
 * Operational, idempotent script for accounts that hold LMS role assignments but
 * no Keycloak subject yet (for example the educator test account
 * `ui-pengajar-01102601`). It never creates a duplicate Keycloak user: it looks
 * the user up in Keycloak by exact username and writes the returned subject into
 * `UserAccount.externalAuthId`.
 *
 * The script resolves the account by `--username`, by the person's NRP
 * (`--personnel-number`), or by an explicit `--person-id`. It reports what it
 * would do with `--dry-run` and only writes when the account has no subject yet,
 * so running it twice changes nothing.
 *
 * Credentials come from the same environment variables as the API
 * (`KEYCLOAK_ADMIN_*`), or from `--token`/`KEYCLOAK_ADMIN_TOKEN` when an
 * operator already holds an admin access token. Secrets are never logged.
 *
 * Usage (from the API container after `prisma migrate deploy`):
 *   node dist/scripts/link-keycloak-user.js --username ui-pengajar-01102601 --dry-run
 *   node dist/scripts/link-keycloak-user.js --username ui-pengajar-01102601
 *
 * Exit codes: 0 on success (including "nothing to do"), 1 on failure.
 */
import { PrismaClient } from '@prisma/client';
import { loadKeycloakAdminConfig } from '../keycloak-provisioning/keycloak-admin.config';
import { KeycloakAdminClient } from '../keycloak-provisioning/keycloak-admin-client';
import {
  KeycloakAdminError,
  KeycloakAdminPort,
} from '../keycloak-provisioning/keycloak-admin.port';
import { UnconfiguredKeycloakAdmin } from '../keycloak-provisioning/unconfigured-keycloak-admin';

type Options = {
  username?: string;
  personnelNumber?: string;
  personId?: string;
  dryRun: boolean;
  token?: string;
};

type KcUserRepresentation = {
  id?: string;
  username?: string;
  email?: string;
  enabled?: boolean;
  requiredActions?: string[];
};

function parseArgs(argv: string[]): Options {
  const options: Options = { dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case '--username':
        options.username = next;
        index += 1;
        break;
      case '--personnel-number':
        options.personnelNumber = next;
        index += 1;
        break;
      case '--person-id':
        options.personId = next;
        index += 1;
        break;
      case '--token':
        options.token = next;
        index += 1;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        break;
    }
  }
  return options;
}

/**
 * Adapter that talks to the Keycloak Admin API with a caller-supplied token.
 * Used only by this operator script; the API itself uses the service account.
 */
class StaticTokenKeycloakAdmin implements KeycloakAdminPort {
  constructor(
    private readonly baseUrl: string,
    private readonly realm: string,
    private readonly token: string,
  ) {}

  isConfigured(): boolean {
    return true;
  }

  async findUserByUsername(username: string) {
    const query = new URLSearchParams({ username, exact: 'true' });
    const users = await this.fetchList(
      `/admin/realms/${encodeURIComponent(this.realm)}/users?${query}`,
    );
    const match = users.find((user) => user.username === username);
    return match ? this.toUser(match) : null;
  }

  async findUsersByEmail(email: string) {
    const query = new URLSearchParams({ email, exact: 'true' });
    const users = await this.fetchList(
      `/admin/realms/${encodeURIComponent(this.realm)}/users?${query}`,
    );
    return users
      .filter(
        (user) => (user.email ?? '').toLowerCase() === email.toLowerCase(),
      )
      .map((user) => this.toUser(user));
  }

  async getUser(id: string) {
    try {
      const user = (await this.fetch(
        `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(id)}`,
      )) as KcUserRepresentation;
      return this.toUser(user);
    } catch (error) {
      if (error instanceof KeycloakAdminError && error.status === 404)
        return null;
      throw error;
    }
  }

  async createUser(): Promise<never> {
    throw new KeycloakAdminError(
      'REJECTED',
      'This operator script never creates users; use the API provisioning endpoint.',
    );
  }

  async updateUser(id: string, input: { enabled?: boolean }): Promise<void> {
    await this.fetch(
      `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(id)}`,
      'PUT',
      input,
    );
  }

  async deleteUser(): Promise<never> {
    throw new KeycloakAdminError('REJECTED', 'Not supported by this script');
  }

  async resetPassword(): Promise<never> {
    throw new KeycloakAdminError('REJECTED', 'Not supported by this script');
  }

  private toUser(user: KcUserRepresentation) {
    return {
      id: user.id ?? '',
      username: user.username ?? '',
      email: user.email ?? null,
      enabled: user.enabled !== false,
      requiredActions: user.requiredActions ?? [],
    };
  }

  private async fetchList(path: string): Promise<KcUserRepresentation[]> {
    return ((await this.fetch(path)) ?? []) as KcUserRepresentation[];
  }

  private async fetch(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      throw new KeycloakAdminError(
        response.status >= 500 ? 'UNAVAILABLE' : 'REJECTED',
        `Keycloak Admin API ${method} ${path} failed: ${response.status}`,
        response.status,
      );
    }
    if (response.status === 204) return undefined as never;
    const text = await response.text();
    return text ? JSON.parse(text) : (undefined as never);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    if (!options.username && !options.personnelNumber && !options.personId) {
      throw new Error(
        'Provide --username, --personnel-number, or --person-id to select the account.',
      );
    }

    const account = await prisma.userAccount.findFirst({
      where: options.personId
        ? { id: options.personId }
        : options.username
          ? { username: options.username }
          : { person: { personnelNumber: options.personnelNumber! } },
      include: { person: true },
    });
    if (!account) {
      throw new Error('No matching UserAccount found.');
    }

    const username = account.username?.trim() || account.email?.trim();
    if (!username) {
      throw new Error(
        `UserAccount ${account.id} has no username/email, so it cannot be mapped to Keycloak.`,
      );
    }

    if (account.externalAuthId) {
      console.log(
        JSON.stringify(
          {
            status: 'already_linked',
            userAccountId: account.id,
            personnelNumber: account.person.personnelNumber,
            externalAuthId: account.externalAuthId,
          },
          null,
          2,
        ),
      );
      return;
    }

    const token = options.token ?? process.env.KEYCLOAK_ADMIN_TOKEN?.trim();
    let keycloak: KeycloakAdminPort;
    if (token) {
      const { config } = loadKeycloakAdminConfig();
      const baseUrl =
        process.env.KEYCLOAK_ADMIN_BASE_URL?.trim() || config?.baseUrl || '';
      const realm =
        process.env.KEYCLOAK_ADMIN_REALM?.trim() || config?.realm || '';
      if (!baseUrl || !realm) {
        throw new Error(
          'KEYCLOAK_ADMIN_BASE_URL and KEYCLOAK_ADMIN_REALM are required with an explicit token.',
        );
      }
      keycloak = new StaticTokenKeycloakAdmin(baseUrl, realm, token);
    } else {
      const { config, errors } = loadKeycloakAdminConfig();
      if (!config) {
        throw new Error(
          `Keycloak Admin configuration is incomplete: ${errors.join('; ')}`,
        );
      }
      keycloak = new KeycloakAdminClient(config);
    }
    if (keycloak instanceof UnconfiguredKeycloakAdmin) {
      throw new Error('Keycloak Admin configuration is not available.');
    }

    const existing = await keycloak.findUserByUsername(username);
    if (!existing) {
      throw new Error(
        `No Keycloak user found with exact username "${username}". Create it in Keycloak (or via the API provisioning endpoint) first.`,
      );
    }

    const linkedElsewhere = await prisma.userAccount.findUnique({
      where: { externalAuthId: existing.id },
    });
    if (linkedElsewhere && linkedElsewhere.id !== account.id) {
      throw new Error(
        `Keycloak user "${username}" (${existing.id}) is already linked to UserAccount ${linkedElsewhere.id}.`,
      );
    }

    if (options.dryRun) {
      console.log(
        JSON.stringify(
          {
            status: 'dry_run',
            action: 'would_link',
            userAccountId: account.id,
            personnelNumber: account.person.personnelNumber,
            username,
            externalAuthId: existing.id,
            keycloakEnabled: existing.enabled,
          },
          null,
          2,
        ),
      );
      return;
    }

    const updated = await prisma.userAccount.update({
      where: { id: account.id },
      data: { externalAuthId: existing.id },
    });
    console.log(
      JSON.stringify(
        {
          status: 'linked',
          userAccountId: updated.id,
          personnelNumber: account.person.personnelNumber,
          username,
          externalAuthId: updated.externalAuthId,
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
    error instanceof Error ? error.message : 'Unknown link-keycloak-user error',
  );
  process.exitCode = 1;
});
