import { ReportingScopeType } from '@prisma/client';
import {
  ExecutiveScopeGrant,
  isEmptyExecutiveScopeGrant,
} from './executive-scope';
import {
  childLevelsOf,
  isDrilldownLevel,
  levelMayOmitParent,
  parentLevelOf,
} from './drilldown-hierarchy';

/**
 * Drill-down access rules (TASK-062).
 *
 * ## Why the grant is projected onto levels instead of checked per query
 *
 * A scope grant names the level it was written at — an organization, a program, a
 * batch, a class, a class subject. A drill-down asks a *different* question: "may
 * this caller stand at this level, and inside which ids?".
 *
 * Answering that by re-deriving it at each step would mean several independent
 * interpretations of the same grant, and the one that is subtly different is the
 * one that leaks. So the grant is projected once, up front, into a per-level
 * reach, and every later step is a set-membership test against that projection.
 *
 * ## The rules that make the walk safe
 *
 * 1. A caller may stand at a level only if the grant reaches at least one id
 *    there. An empty reach is a **denial**, not an empty page.
 * 2. Reach only ever narrows downward. A caller granted a class may see that class
 *    and what is taught in it; they may **not** see the batch, program or
 *    organization that contains it, because those roll-ups would disclose the
 *    existence and size of scopes they were never granted.
 * 3. `null` means unrestricted and `[]` means nothing, exactly as in TASK-061.
 *    The two are never collapsed: collapsing them turns a caller with no grants
 *    into a caller with all of them.
 */

/** The ids a caller may stand on, per level. `null` means "every id". */
export type DrilldownReach = Record<ReportingScopeType, string[] | null>;

/** Every level the reach covers, so a new level cannot be silently missed. */
const REACH_LEVELS: readonly ReportingScopeType[] = [
  ReportingScopeType.ORGANIZATION,
  ReportingScopeType.PROGRAM,
  ReportingScopeType.BATCH,
  ReportingScopeType.CLASS,
  ReportingScopeType.CLASS_SUBJECT,
  ReportingScopeType.ENROLLMENT,
];

/**
 * The order reach propagates, shallowest first.
 *
 * Load-bearing: `ENROLLMENT` is reached from `CLASS_SUBJECT`, whose own reach must
 * already be computed by the time it is expanded.
 */
const PROPAGATION_ORDER: readonly ReportingScopeType[] = [
  ReportingScopeType.ORGANIZATION,
  ReportingScopeType.PROGRAM,
  ReportingScopeType.BATCH,
  ReportingScopeType.CLASS,
  ReportingScopeType.CLASS_SUBJECT,
];

function emptyReach(): DrilldownReach {
  return {
    [ReportingScopeType.ORGANIZATION]: [],
    [ReportingScopeType.PROGRAM]: [],
    [ReportingScopeType.BATCH]: [],
    [ReportingScopeType.CLASS]: [],
    [ReportingScopeType.CLASS_SUBJECT]: [],
    [ReportingScopeType.ENROLLMENT]: [],
  };
}

function addUnique(target: string[] | null, ids: readonly string[]): void {
  if (target === null) return;
  for (const id of ids) {
    if (!target.includes(id)) target.push(id);
  }
}

/**
 * Projects a grant onto a per-level reach.
 *
 * The grant's own seeds are taken as given — the resolver already expanded
 * organization descendants — and `expand` is then applied one level at a time
 * until the deepest level is reached. Expanding a single step rather than asking
 * for a whole subtree is what keeps every intermediate level populated, which is
 * what makes an intermediate step reachable at all: a caller granted a batch can
 * open that batch's class *because* the batch → class step was expanded, not
 * because the class was found by some other route.
 *
 * Awaiting in `PROPAGATION_ORDER` is required rather than merely tidy: each level's
 * children are computed from that level's own reach, so `CLASS_SUBJECT` must be
 * finished before `ENROLLMENT` can be derived from it.
 */
export async function projectDrilldownReach(
  grant: ExecutiveScopeGrant,
  expand: (
    level: ReportingScopeType,
    ids: readonly string[],
  ) => Promise<readonly string[]>,
): Promise<DrilldownReach> {
  const reach = emptyReach();

  if (grant.unrestricted) {
    for (const level of REACH_LEVELS) reach[level] = null;
    return reach;
  }

  const seeds: ReadonlyArray<[ReportingScopeType, readonly string[]]> = [
    [ReportingScopeType.ORGANIZATION, grant.organizationIds],
    [ReportingScopeType.PROGRAM, grant.programIds],
    [ReportingScopeType.BATCH, grant.batchIds],
    [ReportingScopeType.CLASS, grant.classIds],
    [ReportingScopeType.CLASS_SUBJECT, grant.classSubjectIds],
  ];

  for (const [level, ids] of seeds) {
    addUnique(reach[level], ids);
  }

  for (const level of PROPAGATION_ORDER) {
    const from = reach[level];
    if (from === null || from.length === 0) continue;

    for (const childLevel of childLevelsOf(level)) {
      addUnique(reach[childLevel], await expand(childLevel, from));
    }
  }

  return reach;
}

/**
 * The ids a caller may stand on at a level.
 *
 * `null` means unrestricted; an empty array means denied. Returning the reach
 * rather than a boolean is what keeps the next query honest: the ids that authorise
 * the step are the ids the step then filters by.
 *
 * The `undefined` check is written out rather than folded into a `??` because `??`
 * also catches `null` — and `null` is the *unrestricted* case. `reach[level] ?? []`
 * reads as "nothing" for a caller who was granted everything, which is the single
 * most dangerous one-character mistake available in this file. It was in an earlier
 * draft, and the `null` vs `[]` test is what caught it.
 */
export function reachAtLevel(
  reach: DrilldownReach,
  level: ReportingScopeType,
): string[] | null {
  const ids: string[] | null | undefined = reach[level];
  return ids === undefined ? [] : ids;
}

/** Whether the caller may stand at this level at all. */
export function canStandAtLevel(
  reach: DrilldownReach,
  level: ReportingScopeType,
): boolean {
  const ids = reachAtLevel(reach, level);
  return ids === null || ids.length > 0;
}

/** The levels, among the children of `level`, that the caller may open. */
export function openableChildLevels(
  reach: DrilldownReach,
  level: ReportingScopeType,
): readonly ReportingScopeType[] {
  return childLevelsOf(level).filter((child) => canStandAtLevel(reach, child));
}

/** Whether no level is reachable, i.e. the caller may see nothing at all. */
export function isEmptyDrilldownReach(
  reach: DrilldownReach,
  grant: ExecutiveScopeGrant,
): boolean {
  if (grant.unrestricted) return false;
  if (isEmptyExecutiveScopeGrant(grant)) return true;
  return REACH_LEVELS.every((level) => {
    const ids = reach[level];
    return ids !== null && ids.length === 0;
  });
}

/**
 * The parent level a request for this level must name.
 *
 * `null` means the parent is *optional* here rather than forbidden — which is true
 * only for the organization level. A top institution has no parent, so listing the
 * roots is well-formed; a sub-institution does, so narrowing to one is well-formed
 * too. That single level is why the parent is optional instead of required: the
 * spec's walk goes Lemdiklat → Lembaga, and both of those are organizations.
 */
export function requiredParentLevel(
  level: ReportingScopeType,
): ReportingScopeType | null {
  return levelMayOmitParent(level) ? null : parentLevelOf(level);
}

/** Why a request was refused, so the caller is told which rule failed. */
export type DrilldownRefusal =
  | 'UNKNOWN_LEVEL'
  | 'PARENT_REQUIRED'
  | 'PARENT_NOT_REACHABLE'
  | 'LEVEL_NOT_REACHABLE';

export type DrilldownRequestCheck =
  | { ok: true; parentLevel: ReportingScopeType | null }
  | { ok: false; reason: DrilldownRefusal };

/**
 * Validates the *shape* of a drill-down request against the caller's reach.
 *
 * The parent level is **derived** from the requested level rather than supplied by
 * the caller. That is deliberate: if the caller named both, they could name a
 * combination the hierarchy does not have, and every such combination would be
 * another thing to validate. Deriving it means there is exactly one parent level per
 * level, so the parent-child rule cannot even be expressed incorrectly.
 *
 * Checked in a deliberate order, because the order decides which fact the caller is
 * told and therefore what they can probe:
 *
 * 1. **is this a level at all** — an invented level is a malformed request, and
 *    rejecting it here means a misspelled level cannot be used to probe scope
 *    membership;
 * 2. **is a parent required** — the request's shape, answered without consulting
 *    the reach;
 * 3. **is the parent reachable** — the dynamic half;
 * 4. **is the requested level reachable** — the decision itself.
 *
 * Steps 3 and 4 reveal only membership in the caller's own reach, never whether an id
 * exists, so an out-of-scope id and a non-existent id are indistinguishable from the
 * outside. That indistinguishability is what stops the endpoint from becoming an id
 * oracle.
 *
 * Note what this function does *not* do: it never asks whether the parent exists. It
 * cannot, because it is pure. Existence is checked by the service, and only *after*
 * this function has said the parent is in reach — so a caller cannot learn whether an
 * id exists by asking about one they are not allowed to see.
 */
export function checkDrilldownRequest(
  reach: DrilldownReach,
  level: unknown,
  parentId: string | null,
): DrilldownRequestCheck {
  if (!isDrilldownLevel(level)) {
    return { ok: false, reason: 'UNKNOWN_LEVEL' };
  }

  const parentLevel = parentLevelOf(level);

  if (parentId === null) {
    // The entry points: the top of the walk. Only the organization level has a
    // well-formed parentless form — "the institutions I may enter".
    if (!levelMayOmitParent(level)) {
      return { ok: false, reason: 'PARENT_REQUIRED' };
    }
    return canStandAtLevel(reach, level)
      ? { ok: true, parentLevel: null }
      : { ok: false, reason: 'LEVEL_NOT_REACHABLE' };
  }

  const parentIds = reachAtLevel(reach, parentLevel ?? level);
  if (parentIds !== null && !parentIds.includes(parentId)) {
    return { ok: false, reason: 'PARENT_NOT_REACHABLE' };
  }

  // A reachable parent authorizes its children even when the branch is empty.
  return { ok: true, parentLevel: parentLevel ?? level };
}
