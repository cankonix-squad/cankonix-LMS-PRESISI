import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReportingScopeType } from '@prisma/client';
import {
  EXECUTIVE_SCOPE_GRANT_RESOLVER,
  ExecutiveScopeGrantResolver,
} from './executive-scope.resolver';
import {
  DrilldownReach,
  DrilldownRefusal,
  checkDrilldownRequest,
  isEmptyDrilldownReach,
  openableChildLevels,
  projectDrilldownReach,
  reachAtLevel,
} from './drilldown-access';
import {
  DRILLDOWN_LEAF,
  DRILLDOWN_LEVELS,
  DRILLDOWN_ROOT,
  drilldownAncestry,
  isDrilldownLevel,
  levelMayOmitParent,
} from './drilldown-hierarchy';
import { filterNodesToReach, isDrilldownDenied } from './drilldown-path';
import { DrilldownQueryDto } from './dto/drilldown-query.dto';
import {
  DrilldownChildResponseDto,
  DrilldownListResponseDto,
  DrilldownTrailEntryResponseDto,
} from './dto/drilldown-response.dto';
import { toReportingMetricsResponse } from './dto/reporting-response.dto';
import {
  DRILLDOWN_REPOSITORY,
  DrilldownChildNode,
  DrilldownRepository,
  ReportingMetricRecord,
} from './reporting.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;

/**
 * Every refusal the walk can produce, mapped to what the caller is told.
 *
 * They get deliberately different status codes, because they mean different
 * things and collapsing them would either hide a real bug or leak one:
 *
 * - `UNKNOWN_LEVEL` / `PARENT_REQUIRED` / `PARENT_NOT_ALLOWED` are 400. The
 *   request is malformed and no amount of retrying with the same shape will
 *   help. Note these are decided *before* the database is consulted, so a
 *   malformed request is a 400 even when the id it mentions does not exist.
 * - `PARENT_NOT_REACHABLE` is 404, **not** 403. If an out-of-scope id answered
 *   403 and a nonexistent id answered 404, the pair of answers would confirm
 *   which ids exist. Answering 404 for both makes the endpoint unable to be used
 *   as an id oracle — "no such place you may look at" and "no such place" are
 *   the same sentence from outside.
 * - `LEVEL_NOT_REACHABLE` is 403. The request is well-formed and the parent was
 *   found; the caller simply is not allowed to open that folder. Here the
 *   refusal is about authorization rather than existence, so saying so is honest
 *   and leaks nothing that the parent's own visibility did not already imply.
 */
const REFUSAL_STATUS: Record<DrilldownRefusal, string> = {
  UNKNOWN_LEVEL: 'Unknown drill-down level.',
  PARENT_REQUIRED:
    'parentId is required for this level: only the organization level may be listed without a parent.',
  PARENT_NOT_REACHABLE: 'No such node.',
  LEVEL_NOT_REACHABLE: 'You may not open this level.',
};

/**
 * Hierarchical drill-down over the reporting read models (TASK-062).
 *
 * ## One endpoint, not one per level
 *
 * The spec allows either "hierarchical drilldown endpoints" or "a generic scoped
 * endpoint with explicit level and parent identifiers". This is the second, and
 * the reason is the parent-child rule. Seven nested routes would be seven places
 * to remember to check that a class belongs to the batch it was asked for; the
 * eighth level added later would be an eighth place, and the one that forgot
 * would be a silent data leak. With one endpoint there is one check, and it is in
 * one function.
 *
 * ## Where the numbers and the shape come from
 *
 * Two sources, on purpose. The hierarchy — which classes exist under this batch —
 * is read from the transactional tables, because that is where it is defined. The
 * numbers attached to each node are read from the reporting read model. A branch
 * that has never been refreshed therefore still *appears*, with `metrics: null`,
 * instead of being silently dropped from a list of institutions. A drill-down that
 * hides the un-refreshed is a drill-down whose totals do not add up, and the
 * person reading it has no way to tell.
 *
 * ## The reach is recomputed per request, never cached
 *
 * The reach is an authorization decision projected onto the hierarchy. Caching it
 * would mean an access change lands at some later time of the cache's choosing,
 * which is exactly the kind of lag an authorization system must not have. It is
 * recomputed from the grant on every call.
 *
 * ## Two checks, not one
 *
 * `checkDrilldownRequest` checks the *shape* of the request before the database is
 * touched. `filterNodesToReach` then re-checks each returned node against the same
 * reach. The second look is not redundant: the repository decides which rows to
 * return, and a bug there — a forgotten `where`, a mis-joined foreign key — would
 * produce rows the first check never saw, because the first check only ever saw
 * the parent id. If the second look removes anything, this throws rather than
 * quietly returning a smaller page, because a smaller page is indistinguishable
 * from "there is less data" and the bug would ship.
 */
@Injectable()
export class DrilldownService {
  constructor(
    @Inject(DRILLDOWN_REPOSITORY)
    private readonly repo: DrilldownRepository,
    // Injected through its token, not its type: `ExecutiveScopeGrantResolver` is an
    // interface, and an interface has no runtime representation for Nest to look up.
    // Injecting by type compiles and then fails at boot, which is why the TASK-061
    // service does the same thing.
    @Inject(EXECUTIVE_SCOPE_GRANT_RESOLVER)
    private readonly scopeResolver: ExecutiveScopeGrantResolver,
  ) {}

  /**
   * Lists the children of a node, or this caller's entry points at the root.
   *
   * @param userAccountId the authenticated account, resolved to a grant
   * @param query the requested child level and its parent
   */
  async list(
    userAccountId: string,
    query: DrilldownQueryDto,
  ): Promise<DrilldownListResponseDto> {
    const level = query.level as unknown as ReportingScopeType;
    const parentId = query.parentId ?? null;
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    if (!isDrilldownLevel(level)) this.refuse('UNKNOWN_LEVEL');
    if (parentId === null && !levelMayOmitParent(level)) {
      this.refuse('PARENT_REQUIRED');
    }

    const reach = await this.resolveReach(userAccountId);

    const check = checkDrilldownRequest(reach, level, parentId);
    if (!check.ok) {
      this.refuse(check.reason);
    }

    const { parentLevel } = check;

    if (parentId !== null && parentLevel !== null) {
      await this.assertParentEdge(parentLevel, parentId, level);
    }

    const childLevels = openableChildLevels(reach, level);

    const { data, total } = await this.repo.listChildren({
      level,
      parentId,
      rootOrganizationIds:
        level === DRILLDOWN_ROOT ? reachAtLevel(reach, DRILLDOWN_ROOT) : null,
      page,
      limit,
    });

    const { kept, removed } = filterNodesToReach(data, reach, parentId);
    if (removed > 0) {
      // The repository returned nodes the shape check could not have seen. That is
      // a bug on this side of the boundary, not a permission the caller lacked.
      throw new ForbiddenException(
        'Drill-down refused rows outside the caller scope.',
      );
    }

    return {
      level: level as never,
      parentId,
      parentLevel: parentLevel as never,
      trail: this.trailFor(level),
      openableLevels: childLevels as never,
      data: kept.map((node) => this.toChildResponse(node)),
      total,
      page,
      limit,
    };
  }

  /**
   * Rejects a request whose parent id is not a node of the expected parent level.
   *
   * *"Invalid parent-child rejected"* is this function and nothing else. The shape
   * check in `checkDrilldownRequest` is pure and cannot know what a UUID names, so
   * without this a caller could pass a class id as a batch's parent and be handed an
   * empty page — technically safe, but the wrong answer to a question that has a
   * right one: the id is not a batch, and saying so is the difference between a
   * client that retries with a valid id and one that reports "no classes found".
   *
   * ## Why the expected level is tried first, and only then the whole tree
   *
   * `resolveNodePath(expected, id)` is one query and answers the common case. Only
   * when it comes back empty — a wrong-level id, or no id at all — is it worth
   * asking `identifyNodeLevel` what the id actually is, which costs up to six. So a
   * well-formed request pays one query for this check and a malformed one pays more
   * to be told precisely what it got wrong.
   *
   * ## Why the caller learns the real level only when they were allowed the id
   *
   * This runs *after* `checkDrilldownRequest` has already confirmed the parent is
   * in the caller's reach. A caller asking about an id they may not see is refused
   * there, with a 404, before anything here can distinguish "wrong level" from
   * "does not exist". So the precision this function buys cannot be spent probing
   * for ids.
   */
  private async assertParentEdge(
    expectedLevel: ReportingScopeType,
    parentId: string,
    requestedLevel: ReportingScopeType,
  ): Promise<void> {
    const path = await this.repo.resolveNodePath(expectedLevel, parentId);
    if (path) return;

    const actual = await this.repo.identifyNodeLevel(parentId);
    if (actual === null) {
      // In reach but not in the database: a granted id whose row has since been
      // deleted. Reporting "not found" is the honest answer, and it is the same
      // answer the reach check gives, so the two are consistent.
      throw new NotFoundException('No such node.');
    }

    throw new BadRequestException(
      `parentId names a ${actual}, but level ${requestedLevel} sits under a ${expectedLevel}.`,
    );
  }

  /**
   * Reports the drill-down's own reach, for diagnostics and tests.
   *
   * Returning the reach rather than the grant keeps the shape of the answer the
   * same as the shape used to make decisions: if this says `null` at a level, the
   * walk will not narrow there.
   */
  async reach(userAccountId: string): Promise<DrilldownReach> {
    return this.resolveReach(userAccountId);
  }

  /**
   * Projects the caller's grant onto the hierarchy.
   *
   * The grant says which nodes were handed out. The reach says which nodes those
   * imply, because a grant on a program has to reach the batches under it or the
   * program could never be opened. The expansion is done by the repository —
   * `expandOneStep` — so the domain layer stays free of Prisma while still
   * deciding *what* to expand and in what order.
   */
  private async resolveReach(userAccountId: string): Promise<DrilldownReach> {
    const grant = await this.scopeResolver.resolveGrant(userAccountId);
    return projectDrilldownReach(grant, (level, ids) =>
      this.repo.expandOneStep(level, ids),
    );
  }

  /**
   * Turns a refusal into the status code it deserves.
   *
   * The malformed refusals are decided before any query runs, so a request that is
   * both malformed and for a nonexistent node reports the malformed part. That is
   * the useful answer: fixing the id would not make the request valid.
   */
  private refuse(reason: DrilldownRefusal): never {
    switch (reason) {
      case 'UNKNOWN_LEVEL':
      case 'PARENT_REQUIRED':
        throw new BadRequestException(REFUSAL_STATUS[reason]);
      case 'PARENT_NOT_REACHABLE':
        throw new NotFoundException(REFUSAL_STATUS[reason]);
      case 'LEVEL_NOT_REACHABLE':
        throw new ForbiddenException(REFUSAL_STATUS[reason]);
    }
  }

  /**
   * Builds the breadcrumb for a level.
   *
   * The trail names levels, not nodes. This endpoint is "the children of X", so
   * the entry it would put a node in is the one being listed, and it has no node
   * yet — an id there would be a link to the page the caller is already on. The
   * levels above carry no ids for the same reason the level being listed does not:
   * the walk does not need them, and emitting ids the client did not ask for is
   * how a response starts leaking things it should not.
   */
  private trailFor(
    level: ReportingScopeType,
  ): DrilldownTrailEntryResponseDto[] {
    return drilldownAncestry(level).map((ancestor) => ({
      level: ancestor as never,
      id: null,
    }));
  }

  private toChildResponse(node: DrilldownChildNode): DrilldownChildResponseDto {
    return {
      level: node.level as never,
      id: node.id,
      name: node.name,
      code: node.code,
      parentId: node.parentId,
      childCount: node.childCount,
      // Derived from the count rather than from the level, because the level only
      // says that a level *exists* below this one. A program with no batches is
      // not expandable, and answering "yes" would offer the caller a door onto an
      // empty room — and, in a UI, an expand arrow that does nothing.
      hasChildren: node.childCount > 0,
      metrics: node.metrics ? toReportingMetricsResponse(node.metrics) : null,
      recalculatedAt: node.metrics
        ? node.metrics.recalculatedAt.toISOString()
        : null,
    };
  }
}

/** The levels this endpoint understands, for documentation and tests. */
export const DRILLDOWN_SERVICE_LEVELS: readonly ReportingScopeType[] =
  DRILLDOWN_LEVELS;

/** The leaf of the walk, re-exported so callers need not reach into the domain. */
export const DRILLDOWN_SERVICE_LEAF: ReportingScopeType = DRILLDOWN_LEAF;

/**
 * The status code a refusal becomes, exposed so the HTTP tests can assert the
 * mapping without duplicating it.
 */
export function refusalStatus(reason: DrilldownRefusal): 400 | 403 | 404 {
  switch (reason) {
    case 'UNKNOWN_LEVEL':
    case 'PARENT_REQUIRED':
      return 400;
    case 'PARENT_NOT_REACHABLE':
      return 404;
    case 'LEVEL_NOT_REACHABLE':
      return 403;
  }
}

/** Re-exported so a test can assert the denial short-circuit without a request. */
export { isDrilldownDenied, isEmptyDrilldownReach };

/** Re-exported so callers can compare a node's stored metrics without a lookup. */
export type { ReportingMetricRecord };
