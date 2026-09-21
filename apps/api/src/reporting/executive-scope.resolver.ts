import { Inject, Injectable } from '@nestjs/common';
import { OrganizationsService } from '../organizations/organizations.service';
import {
  ExecutiveScopeGrant,
  ScopeGrantSource,
  collectExecutiveScopeGrant,
  emptyExecutiveScopeGrant,
  expandOrganizationDescendants,
} from './executive-scope';
import { REPORTING_PERMISSIONS } from './reporting-permissions';

/**
 * The narrow surface the resolver needs from the authorization module.
 *
 * Declared here rather than importing `PermissionEvaluator` so the reporting
 * domain depends on the contract it consumes. The evaluator satisfies this
 * structurally, which is what lets the same binding serve both the guard and the
 * resolver — and what lets a test supply a fixture without touching the guard.
 */
export interface ExecutivePermissionSource {
  getUserEffectivePermissions(userAccountId: string): Promise<{
    permissions: ScopeGrantSource[];
  }>;
}

export const EXECUTIVE_PERMISSION_SOURCE = Symbol(
  'EXECUTIVE_PERMISSION_SOURCE',
);

/**
 * The narrow surface the overview service depends on.
 *
 * Bound to a token rather than to the class so the HTTP composition root can
 * substitute a deterministic resolver in tests. Like the permission evaluator,
 * a substitute can only *report* a scope set — it cannot widen enforcement,
 * because the service derives every query from whatever it is handed.
 */
export interface ExecutiveScopeGrantResolver {
  resolveGrant(userAccountId: string): Promise<ExecutiveScopeGrant>;
}

export const EXECUTIVE_SCOPE_GRANT_RESOLVER = Symbol(
  'EXECUTIVE_SCOPE_GRANT_RESOLVER',
);

/**
 * Resolves how far a caller's reporting reach extends (TASK-061).
 *
 * This is the "scope resolver" the spec requires, and it answers the question
 * *before* any report is assembled: the overview service is handed a grant and
 * cannot read outside it, because every query it issues is derived from that
 * grant rather than from the request.
 *
 * ## Why it reads scopes rather than roles
 *
 * The caller's reach comes from the **scopes attached to their permission
 * grant**. No role code is inspected anywhere on this path, so renaming a role or
 * adding a new one cannot silently widen a report. A caller holding
 * `reporting.executive.read` with no scope is national; the same permission
 * scoped to one institution is that institution only.
 *
 * ## Why descendants are expanded here
 *
 * `docs/04-authorization-model.md` states descendant access follows the
 * organization hierarchy, so a grant on a parent institution reaches the
 * institutions beneath it. Expansion is done once, up front, so the query
 * predicate is a plain id list instead of a recursive walk on every request.
 *
 * A caller with no grant at all resolves to an empty grant, and an empty grant
 * matches nothing. That is deliberate: the failure mode of a resolver is to
 * under-report, never to fall back to "show everything".
 */
@Injectable()
export class ExecutiveScopeResolver implements ExecutiveScopeGrantResolver {
  constructor(
    @Inject(EXECUTIVE_PERMISSION_SOURCE)
    private readonly permissions: ExecutivePermissionSource | null,
    private readonly organizations: OrganizationsService,
  ) {}

  /**
   * Resolves the grant for one account.
   *
   * The descendant walk is bounded by the number of organizations the caller was
   * granted, not by the size of the organization tree, so a national caller (who
   * is unrestricted and therefore skips the walk entirely) costs nothing.
   */
  async resolveGrant(userAccountId: string): Promise<ExecutiveScopeGrant> {
    // No permission source means the composition root did not say where scopes
    // come from. That resolves to an empty grant, which matches nothing, so a
    // missing binding denies instead of raising — an unconfigured deployment
    // must not become an open one.
    if (!this.permissions) return emptyExecutiveScopeGrant();

    const effective =
      await this.permissions.getUserEffectivePermissions(userAccountId);

    const grant = collectExecutiveScopeGrant(
      effective.permissions,
      REPORTING_PERMISSIONS.EXECUTIVE_READ,
    );

    // An unrestricted grant already covers everything; walking the tree would
    // cost a query per organization to compute a set the caller does not need.
    if (grant.unrestricted) return grant;
    if (grant.organizationIds.length === 0) return grant;

    const descendants = new Map<string, readonly string[]>();
    for (const organizationId of grant.organizationIds) {
      descendants.set(
        organizationId,
        await this.organizations.getDescendantIds(organizationId),
      );
    }

    return expandOrganizationDescendants(
      grant,
      (organizationId) => descendants.get(organizationId) ?? [],
    );
  }

  /**
   * A grant that reaches nothing.
   *
   * Exposed so a caller can fail closed explicitly instead of relying on an
   * empty result set to mean the same thing — the two are different statements,
   * and only one of them is true.
   */
  static emptyGrant(): ExecutiveScopeGrant {
    return emptyExecutiveScopeGrant();
  }
}
