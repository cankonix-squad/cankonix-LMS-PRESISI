import { ReportingScopeType } from '@prisma/client';

/**
 * Drill-down hierarchy (TASK-062).
 *
 * ## The one thing this file exists to make impossible
 *
 * *"No arbitrary ID data leak."* The dangerous version of a drill-down endpoint
 * takes a level and an id from the caller and reads whatever that id names. Every
 * step of the walk would then be an independent chance to read a scope the caller
 * has no business seeing, and one forgotten check is enough to leak a branch.
 *
 * So the walk is not free-form. A request may only descend a **declared edge**,
 * and those edges are written down here — in pure functions, in the domain layer,
 * where they can be tested exhaustively without a database.
 *
 * ## The chain, in the institution's own vocabulary
 *
 * ```
 * National
 *   └─ Lembaga            ORGANIZATION   (nests: Lemdiklat → Lembaga)
 *        └─ Program       PROGRAM
 *             └─ Angkatan BATCH
 *                  └─ Kelas     CLASS
 *                       └─ Mata Pelajaran  CLASS_SUBJECT
 *                            └─ Peserta     ENROLLMENT
 * ```
 *
 * The spec writes this as *"National→Lemdiklat→Lembaga→Program→Angkatan→Kelas→Mata
 * Pelajaran→Peserta"*. Lemdiklat and Lembaga are both organizations — Lemdiklat is
 * the institution, Lembaga are its constituent academies — which is why
 * `ORGANIZATION` is the one level that may contain itself.
 *
 * ## Why the request names the *child* level
 *
 * A request says "give me the children of this node, at this level". Naming the
 * child level means each level has exactly **one** valid parent level, so the
 * parent-child rule is a single lookup rather than a matrix, and the response's
 * `level` is unambiguous — a client never has to infer what it was handed.
 *
 * ## Peserta hangs off Mata Pelajaran, not off Kelas
 *
 * The chain is `CLASS → CLASS_SUBJECT → ENROLLMENT`, matching the spec's ordering.
 * This matters, because an enrollment records a batch and a class — not a class
 * subject — so "the participants of this subject" is resolved as "the enrollments
 * in the class that teaches this subject". That is the same decision TASK-060 made
 * for a `CLASS_SUBJECT` scope's participant count (the class roster, since everyone
 * in the class is expected to sit the subject), repeated here rather than
 * re-decided.
 */

/**
 * The levels a drill-down request may name.
 *
 * Mirrors `ReportingScopeType` exactly, and a test asserts the two have not
 * drifted: a level the read model aggregates but the walk does not expose — or the
 * reverse — would be a silent hole in either the drill-down or the refresh.
 */
export type DrilldownLevel = ReportingScopeType;

/** Every level the walk exposes, top to bottom. */
export const DRILLDOWN_LEVELS: readonly ReportingScopeType[] = [
  ReportingScopeType.ORGANIZATION,
  ReportingScopeType.PROGRAM,
  ReportingScopeType.BATCH,
  ReportingScopeType.CLASS,
  ReportingScopeType.CLASS_SUBJECT,
  ReportingScopeType.ENROLLMENT,
];

/** The deepest level; nothing hangs off it. */
export const DRILLDOWN_LEAF: ReportingScopeType = ReportingScopeType.ENROLLMENT;

/** The level a request with no parent stands at, i.e. the national view. */
export const DRILLDOWN_ROOT: ReportingScopeType =
  ReportingScopeType.ORGANIZATION;

/**
 * The single level that may contain each level.
 *
 * This is *"every transition validates parent-child relationship"* in its most
 * compact form: for a request naming `level`, the `parentId` it supplies must
 * resolve to a node of `parentLevelOf(level)` — or be absent, and then only for
 * the organization level, where absence means "the roots".
 */
const PARENT_LEVEL: Readonly<
  Record<ReportingScopeType, ReportingScopeType | null>
> = {
  [ReportingScopeType.ORGANIZATION]: ReportingScopeType.ORGANIZATION,
  [ReportingScopeType.PROGRAM]: ReportingScopeType.ORGANIZATION,
  [ReportingScopeType.BATCH]: ReportingScopeType.PROGRAM,
  [ReportingScopeType.CLASS]: ReportingScopeType.BATCH,
  [ReportingScopeType.CLASS_SUBJECT]: ReportingScopeType.CLASS,
  [ReportingScopeType.ENROLLMENT]: ReportingScopeType.CLASS_SUBJECT,
};

/**
 * The levels that may sit directly beneath a level.
 *
 * `ORGANIZATION` lists two — itself, for the Lemdiklat → Lembaga nesting, and
 * `PROGRAM` — which is why this is a list rather than a single value. The caller
 * picks between them by naming the child level, so the ambiguity is resolved by
 * the request rather than guessed from an id.
 */
const CHILD_LEVELS: Readonly<
  Record<ReportingScopeType, readonly ReportingScopeType[]>
> = {
  [ReportingScopeType.ORGANIZATION]: [
    ReportingScopeType.ORGANIZATION,
    ReportingScopeType.PROGRAM,
  ],
  [ReportingScopeType.PROGRAM]: [ReportingScopeType.BATCH],
  [ReportingScopeType.BATCH]: [ReportingScopeType.CLASS],
  [ReportingScopeType.CLASS]: [ReportingScopeType.CLASS_SUBJECT],
  [ReportingScopeType.CLASS_SUBJECT]: [ReportingScopeType.ENROLLMENT],
  [ReportingScopeType.ENROLLMENT]: [],
};

/** The level whose children a request names, or `null` at the top. */
export function parentLevelOf(
  level: ReportingScopeType,
): ReportingScopeType | null {
  return PARENT_LEVEL[level] ?? null;
}

/** The levels that may sit directly beneath a level. */
export function childLevelsOf(
  level: ReportingScopeType,
): readonly ReportingScopeType[] {
  return CHILD_LEVELS[level] ?? [];
}

/**
 * Whether `child` may sit directly beneath `parent`.
 *
 * The pure form of the parent-child rule, expressed over declared edges rather
 * than over a database probe, so an invalid combination is refused *identically*
 * whether or not a row happens to exist — which is what keeps the endpoint from
 * becoming an existence oracle.
 */
export function isValidDrilldownEdge(
  parent: ReportingScopeType,
  child: ReportingScopeType,
): boolean {
  return childLevelsOf(parent).includes(child);
}

/**
 * Whether a request naming this level may omit `parentId`.
 *
 * Only the organization level may: a root institution has no parent, so listing
 * the roots is a legitimate request. Every other level is defined by the node that
 * contains it, and a request without one is not "all programs" — it is a request
 * that has not said what it is asking about.
 */
export function levelMayOmitParent(level: ReportingScopeType): boolean {
  return level === DRILLDOWN_ROOT;
}

/** Whether a level is one the walk exposes at all. */
export function isDrilldownLevel(value: unknown): value is ReportingScopeType {
  return (
    typeof value === 'string' &&
    (DRILLDOWN_LEVELS as readonly string[]).includes(value)
  );
}

/** Whether anything hangs off a level. */
export function hasDrilldownChildren(level: ReportingScopeType): boolean {
  return childLevelsOf(level).length > 0;
}

/**
 * The root-to-level chain, inclusive.
 *
 * Used to build the breadcrumb a client shows, and — more importantly — to state
 * the ancestry a node claims so the service can check that a supplied parent id is
 * genuinely the parent of the child being requested.
 */
export function drilldownAncestry(
  level: ReportingScopeType,
): readonly ReportingScopeType[] {
  const chain: ReportingScopeType[] = [];
  const seen = new Set<ReportingScopeType>();
  let current: ReportingScopeType | null = level;
  while (current !== null && !seen.has(current)) {
    seen.add(current);
    chain.unshift(current);
    current = parentLevelOf(current);
  }
  return chain;
}
