import { ReportingScopeType } from '@prisma/client';
import {
  DrilldownReach,
  isEmptyDrilldownReach,
  reachAtLevel,
} from './drilldown-access';
import { ExecutiveScopeGrant } from './executive-scope';
import { ExecutiveNodePath } from './reporting.types';

/**
 * Drill-down path rules (TASK-062).
 *
 * ## Why the check happens twice, in two different places
 *
 * The *step* check in `drilldown-access.ts` answers "may the caller descend into
 * this parent?". The check here answers a narrower and stronger question: "is this
 * specific node actually inside the caller's reach?".
 *
 * Both are needed because they can disagree. A caller with two institutions asks
 * for the classes of institution A; the parent is in reach, so the step passes. But
 * the repository returns *rows*, and a row is only trustworthy if the thing it
 * describes is also in reach. This module is that second look — applied to every
 * node the repository hands back, using the ancestry the repository already
 * fetched, so it costs no extra query.
 *
 * The rule the whole task turns on is *"No arbitrary ID data leak."* A single check
 * at the entrance is a promise; a check on the way out is a property.
 */

/**
 * The ids along a node's ancestry, paired with the level each belongs to.
 *
 * Empty ids are dropped rather than carried: a path axis is `null` when the level
 * does not apply, and a `null` must never be compared against a reach as though it
 * were an id.
 */
function ancestryPairs(
  path: ExecutiveNodePath,
): ReadonlyArray<[ReportingScopeType, string]> {
  const pairs: Array<[ReportingScopeType, string | null]> = [
    [ReportingScopeType.ORGANIZATION, path.organizationId],
    [ReportingScopeType.PROGRAM, path.educationProgramId],
    [ReportingScopeType.BATCH, path.educationBatchId],
    [ReportingScopeType.CLASS, path.academicClassId],
    [ReportingScopeType.CLASS_SUBJECT, path.classSubjectId],
    [ReportingScopeType.ENROLLMENT, path.enrollmentId],
  ];

  return pairs.filter((pair): pair is [ReportingScopeType, string] =>
    Boolean(pair[1]),
  );
}

/**
 * Whether a node is inside the caller's reach.
 *
 * ## At or below, never beside
 *
 * The node qualifies if **any** of its ancestor ids is one the caller was granted
 * *at or above* the node's own level. "At or above" is why the node's own axis is
 * included: a caller granted a class sees the class itself, not only its contents.
 *
 * ## Why an unrestricted reach short-circuits
 *
 * `null` means every id. Testing membership against "everything" is vacuously true,
 * so it is answered directly rather than materialised as a list — which is also
 * what stops an unrestricted caller from allocating an id list the size of the
 * institution.
 *
 * ## Why a node with no ancestry fails closed
 *
 * A path with no ids at all is not a node the walk can place in the hierarchy. It
 * fails closed, because a check whose failure mode is "grant access" is not a check.
 */
export function isNodeInReach(
  node: { level: ReportingScopeType; id: string; path: ExecutiveNodePath },
  reach: DrilldownReach,
): boolean {
  const ownReach = reachAtLevel(reach, node.level);
  if (ownReach === null) return true;
  if (ownReach.includes(node.id)) return true;

  for (const [level, id] of ancestryPairs(node.path)) {
    const ids = reachAtLevel(reach, level);
    if (ids === null) return true;
    if (ids.includes(id)) return true;
  }

  return false;
}

/**
 * Filters a page of nodes down to the ones that may be returned.
 *
 * Two conditions, and they are different kinds of thing:
 *
 * 1. **the node is inside the caller's reach** — an authorization check, and the
 *    reason this second look exists at all;
 * 2. **the node is a child of the parent that was asked for** — a correctness
 *    check, present because the first look only ever saw the parent id.
 *
 * Condition 2 is why the reach is *not* narrowed to the parent before this runs. An
 * earlier draft narrowed it, which is exact for every level except the one that
 * contains itself: a sub-institution is an organization, so replacing the
 * organization reach with "just the parent" removed the parent's own children from
 * it and the Lemdiklat → Lembaga step refused itself. Comparing the child's
 * `parentId` says what was meant, and says it for every level alike.
 *
 * Returns the removed count alongside the kept nodes, so the service can notice a
 * repository that returned something it should not have instead of silently
 * dropping it. A silent drop would make a bug look like a small page, which is
 * exactly the kind of failure that survives to production.
 */
export function filterNodesToReach<
  T extends {
    level: ReportingScopeType;
    id: string;
    path: ExecutiveNodePath;
    parentId?: string | null;
  },
>(
  nodes: readonly T[],
  reach: DrilldownReach,
  parentId: string | null = null,
): { kept: T[]; removed: number } {
  const kept: T[] = [];
  let removed = 0;

  for (const node of nodes) {
    const isChild = parentId === null || node.parentId === parentId;
    if (isChild && isNodeInReach(node, reach)) kept.push(node);
    else removed += 1;
  }

  return { kept, removed };
}

/**
 * Whether a caller may see the drill-down at all.
 *
 * The same denial the overview applies, restated for this endpoint so the two
 * cannot drift: no reach is `403`, not an empty tree.
 */
export function isDrilldownDenied(
  reach: DrilldownReach,
  grant: ExecutiveScopeGrant,
): boolean {
  return isEmptyDrilldownReach(reach, grant);
}
