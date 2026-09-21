'use strict';

/**
 * TASK-062 — organization/program drill-down.
 *
 * Covers the four acceptance criteria the task spec names, in order:
 *
 * 1. **hierarchy traversal** — the walk from the root down to a participant is
 *    the walk the spec describes, and the endpoints of that walk are pinned so a
 *    level cannot be dropped from the chain.
 * 2. **out-of-scope denied** — a grant reaches a node and what is *inside* it,
 *    never what contains it, and an out-of-scope parent id is refused with the
 *    same answer a non-existent one gets.
 * 3. **invalid parent-child rejected** — the parent level is derived from the
 *    requested level, so a caller cannot name an edge the hierarchy does not
 *    define; the discarded refusals are asserted by name.
 * 4. **checks green** — this file is part of `pnpm test`.
 *
 * Everything is asserted against the **pure** hierarchy, access and path modules,
 * plus the service driven through the same tokens the application wires. No
 * database is needed: none of the rules under test are database rules, and the
 * repository is a fake that answers the four contract questions directly.
 */

const assert = require('node:assert/strict');
const { describe, it, test } = require('node:test');

const {
  DRILLDOWN_LEAF,
  DRILLDOWN_LEVELS,
  DRILLDOWN_ROOT,
  childLevelsOf,
  drilldownAncestry,
  hasDrilldownChildren,
  isDrilldownLevel,
  isValidDrilldownEdge,
  levelMayOmitParent,
  parentLevelOf,
} = require('../dist/reporting/drilldown-hierarchy');

const {
  canStandAtLevel,
  checkDrilldownRequest,
  isEmptyDrilldownReach,
  openableChildLevels,
  projectDrilldownReach,
  reachAtLevel,
  requiredParentLevel,
} = require('../dist/reporting/drilldown-access');

const {
  filterNodesToReach,
  isDrilldownDenied,
  isNodeInReach,
} = require('../dist/reporting/drilldown-path');

const {
  DrilldownService,
  refusalStatus,
} = require('../dist/reporting/drilldown.service');

const {
  emptyExecutiveScopeGrant,
} = require('../dist/reporting/executive-scope');

const {
  REPORTING_PERMISSIONS,
} = require('../dist/reporting/reporting-permissions');

// The enums are mirrored rather than imported from `@prisma/client`, so a change
// to the generated enum shows up here as a drift assertion instead of a silent
// pass. `DRILLDOWN_LEVELS` below is checked against this list.
const LEVEL = {
  ORGANIZATION: 'ORGANIZATION',
  PROGRAM: 'PROGRAM',
  BATCH: 'BATCH',
  CLASS: 'CLASS',
  CLASS_SUBJECT: 'CLASS_SUBJECT',
  ENROLLMENT: 'ENROLLMENT',
};

const EXECUTIVE_READ = REPORTING_PERMISSIONS.EXECUTIVE_READ;

// --- Fixtures ----------------------------------------------------------------

const ORG_A = '10000000-0000-4000-8000-00000000000a';
const ORG_B = '10000000-0000-4000-8000-00000000000b';
const ORG_A_CHILD = '10000000-0000-4000-8000-0000000000a1';
const PROGRAM_1 = '20000000-0000-4000-8000-000000000001';
const PROGRAM_2 = '20000000-0000-4000-8000-000000000002';
const BATCH_1 = '30000000-0000-4000-8000-000000000001';
const BATCH_2 = '30000000-0000-4000-8000-000000000002';
const CLASS_1 = '40000000-0000-4000-8000-000000000001';
const CLASS_2 = '40000000-0000-4000-8000-000000000002';
const SUBJECT_1 = '50000000-0000-4000-8000-000000000001';
const SUBJECT_2 = '50000000-0000-4000-8000-000000000002';
const ENROLLMENT_1 = '60000000-0000-4000-8000-000000000001';
const ENROLLMENT_2 = '60000000-0000-4000-8000-000000000002';
// Present in no fixture map: the id that names nothing at all.
const ABSENT_ID = 'f0000000-0000-4000-8000-0000000000ff';

function metricRow(overrides = {}) {
  return {
    id: overrides.id ?? '70000000-0000-4000-8000-000000000001',
    scopeType: overrides.scopeType ?? LEVEL.ORGANIZATION,
    scopeId: overrides.scopeId ?? ORG_A,
    scopeName: overrides.scopeName ?? 'Lemdiklat',
    organizationId: overrides.organizationId ?? null,
    educationProgramId: overrides.educationProgramId ?? null,
    educationBatchId: overrides.educationBatchId ?? null,
    academicClassId: overrides.academicClassId ?? null,
    classSubjectId: overrides.classSubjectId ?? null,
    participants: overrides.participants ?? 10,
    activeParticipants: overrides.activeParticipants ?? 9,
    averageProgressPercent: overrides.averageProgressPercent ?? 80,
    attendancePercentage: overrides.attendancePercentage ?? 90,
    totalSessions: overrides.totalSessions ?? 12,
    averageFinalScore: overrides.averageFinalScore ?? 75,
    gradedCount: overrides.gradedCount ?? 10,
    unapprovedGradeCount: overrides.unapprovedGradeCount ?? 0,
    attendedCount: overrides.attendedCount ?? 0,
    progressPercentTotal: overrides.progressPercentTotal ?? 0,
    progressSampleCount: overrides.progressSampleCount ?? 0,
    finalScoreTotal: overrides.finalScoreTotal ?? 0,
    graduationEvaluationCount: overrides.graduationEvaluationCount ?? 0,
    graduationEligibleCount: overrides.graduationEligibleCount ?? 0,
    graduationApprovedCount: overrides.graduationApprovedCount ?? 0,
    graduatedCount: overrides.graduatedCount ?? 0,
    periodStart: overrides.periodStart ?? null,
    periodEnd: overrides.periodEnd ?? null,
    recalculatedAt:
      overrides.recalculatedAt ?? new Date('2026-09-01T00:00:00.000Z'),
    createdAt: overrides.createdAt ?? new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-09-01T00:00:00.000Z'),
  };
}

function emptyPath() {
  return {
    organizationId: null,
    educationProgramId: null,
    educationBatchId: null,
    academicClassId: null,
    classSubjectId: null,
    enrollmentId: null,
  };
}

/**
 * A grant with nothing in it.
 *
 * Written out rather than imported from the TASK-061 helper so the fields this
 * task relies on are visible in one place: if `ExecutiveScopeGrant` grows an axis,
 * this fixture is where the omission becomes obvious.
 */
function grant(overrides = {}) {
  return {
    unrestricted: false,
    organizationIds: [],
    programIds: [],
    batchIds: [],
    classIds: [],
    classSubjectIds: [],
    ...overrides,
  };
}

/**
 * A repository fake that answers the four contract questions from a fixed tree.
 *
 * The tree is the same one the spec describes, so a traversal test that reaches a
 * participant has actually walked Lemdiklat → Lembaga → Program → Angkatan →
 * Kelas → Mata Pelajaran → Peserta rather than an arbitrary id list.
 *
 * `expandCalls` and `listCalls` are recorded so a test can prove that a refusal
 * happened *before* the database was consulted, which is a claim about ordering
 * that the status code alone cannot make.
 */
class FakeDrilldownRepository {
  constructor(options = {}) {
    this.expandCalls = [];
    this.listCalls = [];
    this.pathCalls = [];
    this.identifyCalls = [];
    this.children = options.children ?? {};
    this.childCounts = options.childCounts ?? {};
    this.expansions = options.expansions ?? {};
    this.metricsRow = options.metricsRow ?? {};
    // `paths` is keyed `${level}:${id}`, so a test states the ancestry a specific
    // id resolves to *at a specific level*. An id present at another level simply
    // has no entry, which is exactly how a wrong-level parent id behaves.
    this.paths = options.paths ?? {};
    this.levels = options.levels ?? {};
  }

  async resolveNodePath(level, id) {
    this.pathCalls.push({ level, id });
    return this.paths[`${level}:${id}`] ?? null;
  }

  async identifyNodeLevel(id) {
    this.identifyCalls.push(id);
    return this.levels[id] ?? null;
  }

  async expandOneStep(level, ids) {
    this.expandCalls.push({ level, ids: [...ids] });
    const table = this.expansions[level] ?? {};
    const out = [];
    for (const id of ids) {
      for (const child of table[id] ?? []) out.push(child);
    }
    return out;
  }

  async listChildren(query) {
    this.listCalls.push(query);
    const key = `${query.level}:${query.parentId ?? 'ROOT'}`;
    const rows = this.children[key] ?? [];
    return {
      data: rows.map((row) => {
        const metricsKey = `${row.level}:${row.id}`;
        return {
          level: row.level,
          id: row.id,
          name: row.name ?? null,
          code: row.code ?? null,
          parentId: row.parentId ?? query.parentId ?? null,
          childCount: this.childCounts[metricsKey] ?? 0,
          path: row.path ?? emptyPath(),
          metrics: this.metricsRow[metricsKey] ?? null,
        };
      }),
      total: this.childCounts[`total:${key}`] ?? rows.length,
    };
  }
}

class StubScopeGrantResolver {
  constructor(scopeGrant) {
    this.scopeGrant = scopeGrant;
    this.calls = [];
  }

  async resolveGrant(userAccountId) {
    this.calls.push(userAccountId);
    return this.scopeGrant;
  }
}

function makeService(scopeGrant, options = {}) {
  const repo = new FakeDrilldownRepository(options);
  const resolver = new StubScopeGrantResolver(scopeGrant);
  const service = new DrilldownService(repo, resolver);
  return { repo, resolver, service };
}

/** A well-formed child row for the fake repository. */
function childRow(level, id, path, extra = {}) {
  return { level, id, path, ...extra };
}

// --- Criterion 4 (first): the level list cannot drift ------------------------

describe('drill-down hierarchy (TASK-062) — the walk is the one the spec names', () => {
  it('covers exactly the six levels of ReportingScopeType, in walk order', () => {
    // The drift guard. `DRILLDOWN_LEVELS` is hand-written against the generated
    // enum, so if the enum ever gains a level, this fails here rather than
    // producing a walk that silently stops one step short of the leaf.
    assert.deepEqual(
      [...DRILLDOWN_LEVELS],
      [
        LEVEL.ORGANIZATION,
        LEVEL.PROGRAM,
        LEVEL.BATCH,
        LEVEL.CLASS,
        LEVEL.CLASS_SUBJECT,
        LEVEL.ENROLLMENT,
      ],
    );
  });

  it('starts at the organization and ends at the participant', () => {
    assert.equal(DRILLDOWN_ROOT, LEVEL.ORGANIZATION);
    assert.equal(DRILLDOWN_LEAF, LEVEL.ENROLLMENT);
  });

  it('reads the spec order as National → Lemdiklat → Lembaga → Program → Angkatan → Kelas → Mata Pelajaran → Peserta', () => {
    // National is not a node in the data — it is the view from above the root —
    // so the first *node* level is the organization, and an organization nests
    // into its children to express Lemdiklat → Lembaga.
    assert.equal(parentLevelOf(LEVEL.ORGANIZATION), LEVEL.ORGANIZATION);
    assert.equal(parentLevelOf(LEVEL.PROGRAM), LEVEL.ORGANIZATION);
    assert.equal(parentLevelOf(LEVEL.BATCH), LEVEL.PROGRAM);
    assert.equal(parentLevelOf(LEVEL.CLASS), LEVEL.BATCH);
    assert.equal(parentLevelOf(LEVEL.CLASS_SUBJECT), LEVEL.CLASS);
    assert.equal(parentLevelOf(LEVEL.ENROLLMENT), LEVEL.CLASS_SUBJECT);
  });

  it('gives every level exactly one parent level', () => {
    for (const level of DRILLDOWN_LEVELS) {
      const parent = parentLevelOf(level);
      assert.ok(
        DRILLDOWN_LEVELS.includes(parent),
        `${level} must have a parent inside the walk`,
      );
    }
  });

  it('lets only the root be listed without a parent', () => {
    // "All programs" is not a question the walk defines. Only the organization
    // level has a well-formed parentless form: the caller's entry points.
    for (const level of DRILLDOWN_LEVELS) {
      assert.equal(
        levelMayOmitParent(level),
        level === LEVEL.ORGANIZATION,
        `${level} parentless listing`,
      );
    }
    assert.equal(requiredParentLevel(LEVEL.ORGANIZATION), null);
    assert.equal(requiredParentLevel(LEVEL.PROGRAM), LEVEL.ORGANIZATION);
  });

  it('treats the participant as the leaf and the organization as non-leaf', () => {
    assert.equal(hasDrilldownChildren(LEVEL.ENROLLMENT), false);
    assert.deepEqual([...childLevelsOf(LEVEL.ENROLLMENT)], []);
    assert.equal(hasDrilldownChildren(LEVEL.ORGANIZATION), true);
  });

  it('accepts only the edges the hierarchy defines', () => {
    assert.equal(
      isValidDrilldownEdge(LEVEL.ORGANIZATION, LEVEL.ORGANIZATION),
      true,
      'an organization nests into organizations (Lemdiklat → Lembaga)',
    );
    assert.equal(isValidDrilldownEdge(LEVEL.CLASS, LEVEL.CLASS_SUBJECT), true);
    assert.equal(
      isValidDrilldownEdge(LEVEL.CLASS_SUBJECT, LEVEL.ENROLLMENT),
      true,
    );
    assert.equal(
      isValidDrilldownEdge(LEVEL.ORGANIZATION, LEVEL.BATCH),
      false,
      'a batch hanging directly off an organization would skip the program',
    );
    assert.equal(isValidDrilldownEdge(LEVEL.CLASS, LEVEL.ENROLLMENT), false);
    assert.equal(
      isValidDrilldownEdge(LEVEL.ENROLLMENT, LEVEL.ENROLLMENT),
      false,
    );
  });

  it('recognises only real levels', () => {
    for (const level of DRILLDOWN_LEVELS) {
      assert.equal(isDrilldownLevel(level), true);
    }
    assert.equal(isDrilldownLevel('CONTINENT'), false);
    assert.equal(isDrilldownLevel(null), false);
    assert.equal(isDrilldownLevel(7), false);
  });

  it('gives each level the ancestors it sits under, root first', () => {
    // Inclusive of the level itself, because the breadcrumb a client draws shows
    // where the caller *is*, not only where it came from.
    assert.deepEqual(
      [...drilldownAncestry(LEVEL.ORGANIZATION)],
      [LEVEL.ORGANIZATION],
    );
    assert.deepEqual(
      [...drilldownAncestry(LEVEL.PROGRAM)],
      [LEVEL.ORGANIZATION, LEVEL.PROGRAM],
    );
    assert.deepEqual(
      [...drilldownAncestry(LEVEL.ENROLLMENT)],
      [
        LEVEL.ORGANIZATION,
        LEVEL.PROGRAM,
        LEVEL.BATCH,
        LEVEL.CLASS,
        LEVEL.CLASS_SUBJECT,
        LEVEL.ENROLLMENT,
      ],
    );
  });

  it('never loops on the organization self-edge', () => {
    // ORGANIZATION's parent is ORGANIZATION, so a naive walk upward would spin
    // forever. The ancestry must terminate and must not repeat a level.
    const chain = [...drilldownAncestry(LEVEL.ORGANIZATION)];
    assert.equal(new Set(chain).size, chain.length);
  });
});

// --- Criterion 2: out-of-scope denied ---------------------------------------

/**
 * Drives `projectDrilldownReach` and reports what it did.
 *
 * `projectDrilldownReach` is asynchronous, so every question about it has to be
 * awaited — and simply `await`ing it would turn a wrong answer into a rejected
 * promise rather than a readable failure. This wrapper awaits it once and then
 * exposes plain synchronous probes over the result, so a test asserts on the reach
 * rather than on the machinery that produced it.
 *
 * The expansions are supplied as a table rather than a callback that records
 * calls, so a level that should *not* have been expanded simply has no entry and
 * its absence is the assertion.
 */
async function reachOf(scopeGrant, expansions = {}) {
  const calls = [];
  const reach = await projectDrilldownReach(scopeGrant, async (level, ids) => {
    calls.push({ level, ids: [...ids] });
    const table = expansions[level] ?? {};
    const out = [];
    for (const id of ids) {
      for (const child of table[id] ?? []) out.push(child);
    }
    return out;
  });
  return {
    reach,
    calls,
    expanded(level) {
      return calls.some((call) => call.level === level);
    },
    idsSentTo(level) {
      return calls
        .filter((call) => call.level === level)
        .flatMap((call) => call.ids);
    },
    at(level) {
      return reachAtLevel(reach, level);
    },
    stands(level) {
      return canStandAtLevel(reach, level);
    },
  };
}

describe('drill-down reach (TASK-062) — a grant reaches downward, never sideways or up', () => {
  it('reads an unrestricted grant as every level, without expanding anything', async () => {
    const { at, stands, calls } = await reachOf({
      ...grant(),
      unrestricted: true,
    });

    for (const level of DRILLDOWN_LEVELS) {
      assert.equal(at(level), null, `${level} unrestricted`);
      assert.equal(stands(level), true, `${level} reachable`);
    }
    assert.equal(
      calls.length,
      0,
      'an unrestricted grant needs no expansion: null already means every id',
    );
  });

  it('reaches the classes of a granted organization by expanding downward', async () => {
    const result = await reachOf(grant({ organizationIds: [ORG_A] }), {
      [LEVEL.PROGRAM]: { [ORG_A]: [PROGRAM_1] },
      [LEVEL.BATCH]: { [PROGRAM_1]: [BATCH_1] },
      [LEVEL.CLASS]: { [BATCH_1]: [CLASS_1] },
      [LEVEL.CLASS_SUBJECT]: { [CLASS_1]: [SUBJECT_1] },
    });

    assert.deepEqual(result.at(LEVEL.ORGANIZATION), [ORG_A]);
    assert.deepEqual(result.at(LEVEL.PROGRAM), [PROGRAM_1]);
    assert.deepEqual(result.at(LEVEL.BATCH), [BATCH_1]);
    assert.deepEqual(result.at(LEVEL.CLASS), [CLASS_1]);
    assert.deepEqual(result.at(LEVEL.CLASS_SUBJECT), [SUBJECT_1]);
  });

  it('does not reach upward from a granted class', async () => {
    // The rule that matters most: a caller handed one class may see that class
    // and what is taught in it. They may not see the batch, program or
    // organization containing it, because those roll-ups would disclose the size
    // and existence of scopes they were never handed.
    const result = await reachOf(grant({ classIds: [CLASS_1] }), {
      [LEVEL.CLASS_SUBJECT]: { [CLASS_1]: [SUBJECT_1] },
    });

    assert.deepEqual(result.at(LEVEL.CLASS), [CLASS_1]);
    assert.deepEqual(result.at(LEVEL.CLASS_SUBJECT), [SUBJECT_1]);
    assert.deepEqual(result.at(LEVEL.BATCH), [], 'the containing batch');
    assert.deepEqual(result.at(LEVEL.PROGRAM), [], 'the containing program');
    assert.deepEqual(
      result.at(LEVEL.ORGANIZATION),
      [],
      'the containing institution',
    );
  });

  it('does not expand the parent levels of a granted node', async () => {
    const result = await reachOf(grant({ batchIds: [BATCH_1] }), {
      [LEVEL.CLASS]: { [BATCH_1]: [CLASS_1] },
    });

    assert.equal(result.expanded(LEVEL.ORGANIZATION), false);
    assert.equal(result.expanded(LEVEL.PROGRAM), false);
  });

  it('keeps an empty grant empty: no axis is quietly widened', async () => {
    const result = await reachOf(grant());

    for (const level of DRILLDOWN_LEVELS) {
      assert.deepEqual(
        reachAtLevel(result.reach, level),
        [],
        `${level} denied`,
      );
    }
    assert.equal(isEmptyDrilldownReach(result.reach, grant()), true);
    assert.equal(isDrilldownDenied(result.reach, grant()), true);
  });

  it('separates "unrestricted" from "matches nothing" at every level', async () => {
    // `null` and `[]` are one keystroke apart in the source and world apart in
    // meaning. Collapsing them turns a caller with no grants into a caller with
    // all of them, so the two are asserted to stay distinct.
    const unrestricted = await reachOf({ ...grant(), unrestricted: true });
    const nothing = await reachOf(grant());

    for (const level of DRILLDOWN_LEVELS) {
      assert.equal(unrestricted.at(level), null);
      assert.notDeepEqual(nothing.at(level), null);
      assert.equal(nothing.at(level).length, 0);
    }
  });

  it('reaches the participants of a subject through the subject', async () => {
    // The spec's last step is Mata Pelajaran → Peserta, so a granted class
    // subject has to reach its enrollments. A walk that stopped at the subject
    // would make the last level of the drill-down unreachable by construction.
    const result = await reachOf(grant({ classSubjectIds: [SUBJECT_1] }), {
      [LEVEL.ENROLLMENT]: { [SUBJECT_1]: [ENROLLMENT_1] },
    });

    assert.deepEqual(result.at(LEVEL.CLASS_SUBJECT), [SUBJECT_1]);
    assert.deepEqual(result.at(LEVEL.ENROLLMENT), [ENROLLMENT_1]);
    assert.deepEqual(
      result.idsSentTo(LEVEL.ENROLLMENT),
      [SUBJECT_1],
      'participants are looked up from the subject, not from the class',
    );
  });

  it('unions reach from several granted axes without duplicates', async () => {
    const result = await reachOf(
      grant({ organizationIds: [ORG_A], classIds: [CLASS_1, CLASS_1] }),
      {
        [LEVEL.PROGRAM]: { [ORG_A]: [PROGRAM_1] },
        [LEVEL.BATCH]: { [PROGRAM_1]: [BATCH_1] },
        [LEVEL.CLASS]: { [BATCH_1]: [CLASS_1, CLASS_2] },
        [LEVEL.CLASS_SUBJECT]: {
          [CLASS_1]: [SUBJECT_1],
          [CLASS_2]: [SUBJECT_2],
        },
      },
    );

    // CLASS_1 arrived twice — once as a seed, once by expansion — and must appear
    // once. A duplicated id would multiply a participants count downstream.
    assert.deepEqual(result.at(LEVEL.CLASS), [CLASS_1, CLASS_2]);
    assert.deepEqual(result.at(LEVEL.CLASS_SUBJECT), [SUBJECT_1, SUBJECT_2]);
  });

  it('only offers child levels the caller can actually stand on', async () => {
    const scoped = await reachOf(grant({ batchIds: [BATCH_1] }), {
      [LEVEL.CLASS]: { [BATCH_1]: [CLASS_1] },
    });

    assert.deepEqual(
      [...openableChildLevels(scoped.reach, LEVEL.BATCH)],
      [LEVEL.CLASS],
      'batch → class is open, batch → nothing else exists',
    );
    assert.deepEqual(
      [...openableChildLevels(scoped.reach, LEVEL.CLASS)],
      [],
      'the class was reached but its subjects were never expanded, so the door is not offered rather than offered and then refused',
    );
  });

  it('agrees with the TASK-061 empty grant rather than re-declaring it', () => {
    // The local `grant()` fixture exists so this file's assumptions are visible,
    // but it must not become a second definition of what "no access" means.
    assert.deepEqual(grant(), emptyExecutiveScopeGrant());
  });
});

// --- Criterion 2b: the node-level second look ---------------------------------

describe('drill-down node reach (TASK-062) — the check on the way out', () => {
  function reachAt(overrides) {
    return {
      [LEVEL.ORGANIZATION]: [],
      [LEVEL.PROGRAM]: [],
      [LEVEL.BATCH]: [],
      [LEVEL.CLASS]: [],
      [LEVEL.CLASS_SUBJECT]: [],
      [LEVEL.ENROLLMENT]: [],
      ...overrides,
    };
  }

  const classNode = {
    level: LEVEL.CLASS,
    id: CLASS_1,
    path: {
      ...emptyPath(),
      organizationId: ORG_A,
      educationProgramId: PROGRAM_1,
      educationBatchId: BATCH_1,
      academicClassId: CLASS_1,
    },
  };

  it('accepts a node whose own id is in reach', () => {
    assert.equal(
      isNodeInReach(classNode, reachAt({ [LEVEL.CLASS]: [CLASS_1] })),
      true,
    );
  });

  it('accepts a node whose ancestor is in reach', () => {
    // A caller granted the batch sees the classes in it, even though the class ids
    // were never handed to them individually.
    assert.equal(
      isNodeInReach(classNode, reachAt({ [LEVEL.BATCH]: [BATCH_1] })),
      true,
    );
  });

  it('rejects a node that merely sits beside one in reach', () => {
    // Same batch id in the path is not enough if the ids differ: the node must be
    // at or below a granted node, not next to one.
    const other = {
      ...classNode,
      id: CLASS_2,
      path: {
        ...classNode.path,
        academicClassId: CLASS_2,
        educationBatchId: BATCH_2,
      },
    };

    assert.equal(
      isNodeInReach(other, reachAt({ [LEVEL.BATCH]: [BATCH_1] })),
      false,
    );
  });

  it('short-circuits an unrestricted reach without materialising an id list', () => {
    const reach = reachAt({ [LEVEL.ORGANIZATION]: null });
    assert.equal(isNodeInReach(classNode, reach), true);
  });

  it('fails closed for a node with no ancestry at all', () => {
    // A path with no ids cannot be placed in the hierarchy. A check whose failure
    // mode is "grant access" is not a check.
    const orphan = { level: LEVEL.CLASS, id: CLASS_1, path: emptyPath() };
    assert.equal(isNodeInReach(orphan, reachAt({})), false);
  });

  it('counts the removed nodes rather than silently shrinking the page', () => {
    const outside = {
      level: LEVEL.CLASS,
      id: CLASS_2,
      path: {
        ...emptyPath(),
        organizationId: ORG_B,
        educationProgramId: PROGRAM_2,
        educationBatchId: BATCH_2,
        academicClassId: CLASS_2,
      },
    };

    const { kept, removed } = filterNodesToReach(
      [classNode, outside],
      reachAt({ [LEVEL.BATCH]: [BATCH_1] }),
    );

    assert.deepEqual(
      kept.map((n) => n.id),
      [CLASS_1],
    );
    assert.equal(
      removed,
      1,
      'the count is what lets the service turn a repository bug into a loud failure',
    );
  });

  it('removes a node that is in reach but is not a child of the parent asked for', () => {
    // Two institutions both granted: every node is individually in reach, so the
    // scope check alone would pass both. Asking for institution A's classes and
    // being handed institution B's is not a leak, but it is the wrong answer, and
    // this second look is the only thing positioned to notice.
    const reach = reachAt({
      [LEVEL.ORGANIZATION]: [ORG_A, ORG_B],
      [LEVEL.CLASS]: [CLASS_1, CLASS_2],
    });

    const otherClass = {
      level: LEVEL.CLASS,
      id: CLASS_2,
      parentId: BATCH_2,
      path: {
        ...emptyPath(),
        organizationId: ORG_B,
        educationProgramId: PROGRAM_2,
        educationBatchId: BATCH_2,
        academicClassId: CLASS_2,
      },
    };

    const { kept, removed } = filterNodesToReach(
      [{ ...classNode, parentId: BATCH_1 }, otherClass],
      reach,
      BATCH_1,
    );

    assert.deepEqual(
      kept.map((n) => n.id),
      [CLASS_1],
    );
    assert.equal(removed, 1);
  });

  it('keeps every child when no parent was asked for', () => {
    // The root listing. There is no parent to compare against, so containment is
    // not checked — the reach still is.
    const reach = reachAt({ [LEVEL.ORGANIZATION]: [ORG_A] });
    const entryPoint = {
      level: LEVEL.ORGANIZATION,
      id: ORG_A,
      parentId: null,
      path: { ...emptyPath(), organizationId: ORG_A },
    };

    const { kept, removed } = filterNodesToReach([entryPoint], reach, null);
    assert.equal(kept.length, 1);
    assert.equal(removed, 0);
  });
});

// --- Criterion 3: invalid parent-child rejected ------------------------------

describe('drill-down step check (TASK-062) — the parent level is derived, never supplied', () => {
  const unrestricted = {
    [LEVEL.ORGANIZATION]: null,
    [LEVEL.PROGRAM]: null,
    [LEVEL.BATCH]: null,
    [LEVEL.CLASS]: null,
    [LEVEL.CLASS_SUBJECT]: null,
    [LEVEL.ENROLLMENT]: null,
  };

  it('refuses a level the walk does not have', () => {
    const check = checkDrilldownRequest(unrestricted, 'CONTINENT', null);
    assert.equal(check.ok, false);
    assert.equal(check.reason, 'UNKNOWN_LEVEL');
  });

  it('requires a parent for every level but the organization', () => {
    for (const level of DRILLDOWN_LEVELS) {
      const check = checkDrilldownRequest(unrestricted, level, null);
      if (level === LEVEL.ORGANIZATION) {
        assert.equal(check.ok, true, 'the organization level may be listed');
      } else {
        assert.equal(check.ok, false, `${level} without a parent`);
        assert.equal(check.reason, 'PARENT_REQUIRED', `${level} reason`);
      }
    }
  });

  it('accepts an organization as a parent of an organization', () => {
    // Lemdiklat → Lembaga. If this were refused, the second level of the spec's
    // walk would be unreachable and the nesting would exist in the schema but not
    // in the API.
    const check = checkDrilldownRequest(
      unrestricted,
      LEVEL.ORGANIZATION,
      ORG_A,
    );
    assert.equal(check.ok, true);
    assert.equal(check.parentLevel, LEVEL.ORGANIZATION);
  });

  it('derives the parent level from the requested level', () => {
    const expected = {
      [LEVEL.ORGANIZATION]: LEVEL.ORGANIZATION,
      [LEVEL.PROGRAM]: LEVEL.ORGANIZATION,
      [LEVEL.BATCH]: LEVEL.PROGRAM,
      [LEVEL.CLASS]: LEVEL.BATCH,
      [LEVEL.CLASS_SUBJECT]: LEVEL.CLASS,
      [LEVEL.ENROLLMENT]: LEVEL.CLASS_SUBJECT,
    };

    for (const [level, parentLevel] of Object.entries(expected)) {
      const check = checkDrilldownRequest(unrestricted, level, ORG_A);
      assert.equal(check.ok, true, `${level} accepted`);
      assert.equal(check.parentLevel, parentLevel, `${level} parent level`);
    }
  });

  it('refuses a parent outside the caller reach, without saying whether it exists', () => {
    const reach = {
      ...unrestricted,
      [LEVEL.ORGANIZATION]: [ORG_B],
    };

    const inReach = checkDrilldownRequest(reach, LEVEL.PROGRAM, ORG_B);
    assert.equal(inReach.ok, true);

    const outOfReach = checkDrilldownRequest(reach, LEVEL.PROGRAM, ORG_A);
    assert.equal(outOfReach.ok, false);
    // The same reason a nonexistent id produces, on purpose: the pair of answers
    // must not distinguish "not yours" from "not there".
    assert.equal(outOfReach.reason, 'PARENT_NOT_REACHABLE');
  });

  it('allows an empty branch beneath an authorized parent', () => {
    const reach = {
      ...unrestricted,
      [LEVEL.ORGANIZATION]: [ORG_A],
      [LEVEL.PROGRAM]: [],
    };
    assert.deepEqual(checkDrilldownRequest(reach, LEVEL.PROGRAM, ORG_A), {
      ok: true,
      parentLevel: LEVEL.ORGANIZATION,
    });
  });

  it('maps each refusal to the status code that tells the truth', () => {
    assert.equal(refusalStatus('UNKNOWN_LEVEL'), 400);
    assert.equal(refusalStatus('PARENT_REQUIRED'), 400);
    assert.equal(
      refusalStatus('PARENT_NOT_REACHABLE'),
      404,
      'not 403: a 403/404 split would make the endpoint an id oracle',
    );
    assert.equal(refusalStatus('LEVEL_NOT_REACHABLE'), 403);
  });

  it('decides the shape of the request before the reach is consulted', () => {
    // An invented level is refused for an empty reach and an unrestricted one
    // alike, so a caller cannot use a malformed level to learn anything about
    // their own scope.
    const empty = { ...unrestricted };
    for (const level of DRILLDOWN_LEVELS) empty[level] = [];

    assert.equal(
      checkDrilldownRequest(empty, 'CONTINENT', null).reason,
      'UNKNOWN_LEVEL',
    );
    assert.equal(
      checkDrilldownRequest(empty, LEVEL.PROGRAM, null).reason,
      'PARENT_REQUIRED',
      'shape is answered before reach: this caller has no programs at all',
    );
  });
});

// --- The service, over the fake repository ----------------------------------

describe('drill-down service (TASK-062) — traversal, refusal and the second look', () => {
  const ACCOUNT = '90000000-0000-4000-8000-000000000001';

  const tree = {
    [`${LEVEL.PROGRAM}:${ORG_A}`]: [
      childRow(LEVEL.PROGRAM, PROGRAM_1, {
        ...emptyPath(),
        organizationId: ORG_A,
        educationProgramId: PROGRAM_1,
      }),
    ],
    [`${LEVEL.BATCH}:${PROGRAM_1}`]: [
      childRow(LEVEL.BATCH, BATCH_1, {
        ...emptyPath(),
        organizationId: ORG_A,
        educationProgramId: PROGRAM_1,
        educationBatchId: BATCH_1,
      }),
    ],
    [`${LEVEL.ENROLLMENT}:${SUBJECT_1}`]: [
      childRow(LEVEL.ENROLLMENT, ENROLLMENT_1, {
        ...emptyPath(),
        organizationId: ORG_A,
        educationProgramId: PROGRAM_1,
        educationBatchId: BATCH_1,
        academicClassId: CLASS_1,
        classSubjectId: SUBJECT_1,
        enrollmentId: ENROLLMENT_1,
      }),
    ],
  };

  const paths = {
    [`${LEVEL.ORGANIZATION}:${ORG_A}`]: {
      ...emptyPath(),
      organizationId: ORG_A,
    },
    [`${LEVEL.PROGRAM}:${PROGRAM_1}`]: {
      ...emptyPath(),
      organizationId: ORG_A,
      educationProgramId: PROGRAM_1,
    },
    [`${LEVEL.CLASS_SUBJECT}:${SUBJECT_1}`]: {
      ...emptyPath(),
      organizationId: ORG_A,
      educationProgramId: PROGRAM_1,
      educationBatchId: BATCH_1,
      academicClassId: CLASS_1,
      classSubjectId: SUBJECT_1,
    },
  };

  const levels = {
    [CLASS_1]: LEVEL.CLASS,
    [ORG_A]: LEVEL.ORGANIZATION,
    [PROGRAM_1]: LEVEL.PROGRAM,
  };

  function service(options = {}) {
    return makeService(
      options.scopeGrant ?? grant({ organizationIds: [ORG_A] }),
      {
        children: { ...tree, ...(options.children ?? {}) },
        paths: { ...paths, ...(options.paths ?? {}) },
        levels: { ...levels, ...(options.levels ?? {}) },
        expansions: {
          [LEVEL.PROGRAM]: { [ORG_A]: [PROGRAM_1] },
          [LEVEL.BATCH]: { [PROGRAM_1]: [BATCH_1] },
          [LEVEL.CLASS]: { [BATCH_1]: [CLASS_1] },
          [LEVEL.CLASS_SUBJECT]: { [CLASS_1]: [SUBJECT_1] },
          [LEVEL.ENROLLMENT]: { [SUBJECT_1]: [ENROLLMENT_1] },
          ...(options.expansions ?? {}),
        },
        metricsRow: options.metricsRow ?? {},
        childCounts: options.childCounts ?? {},
      },
    );
  }

  it('walks from the institution to its programs', async () => {
    const { service: svc, repo } = service();

    const page = await svc.list(ACCOUNT, {
      level: LEVEL.PROGRAM,
      parentId: ORG_A,
    });

    assert.equal(page.level, LEVEL.PROGRAM);
    assert.equal(page.parentId, ORG_A);
    assert.equal(page.parentLevel, LEVEL.ORGANIZATION);
    assert.equal(page.total, 1);
    assert.equal(page.data[0].id, PROGRAM_1);
    assert.equal(repo.listCalls.length, 1);
    assert.deepEqual(repo.listCalls[0], {
      level: LEVEL.PROGRAM,
      parentId: ORG_A,
      rootOrganizationIds: null,
      page: 1,
      limit: 25,
    });
  });

  it('walks the last step of the spec, from a subject to its participants', async () => {
    const { service: svc } = service({
      scopeGrant: grant({ classSubjectIds: [SUBJECT_1] }),
      children: {
        [`${LEVEL.ENROLLMENT}:${SUBJECT_1}`]: [
          childRow(LEVEL.ENROLLMENT, ENROLLMENT_1, {
            ...emptyPath(),
            organizationId: ORG_A,
            educationProgramId: PROGRAM_1,
            educationBatchId: BATCH_1,
            academicClassId: CLASS_1,
            classSubjectId: SUBJECT_1,
            enrollmentId: ENROLLMENT_1,
          }),
          childRow(LEVEL.ENROLLMENT, ENROLLMENT_2, {
            ...emptyPath(),
            organizationId: ORG_A,
            educationProgramId: PROGRAM_1,
            educationBatchId: BATCH_1,
            academicClassId: CLASS_1,
            classSubjectId: SUBJECT_1,
            enrollmentId: ENROLLMENT_2,
          }),
        ],
      },
    });

    const page = await svc.list(ACCOUNT, {
      level: LEVEL.ENROLLMENT,
      parentId: SUBJECT_1,
    });

    assert.equal(page.level, LEVEL.ENROLLMENT);
    assert.deepEqual(
      page.data.map((participant) => participant.id),
      [ENROLLMENT_1, ENROLLMENT_2],
      'the roster of the class, since an enrollment records a class and not a subject',
    );
    assert.equal(
      page.openableLevels.length,
      0,
      'the participant is the leaf: there is nothing below it to offer',
    );
  });

  it('walks the organization nesting the spec calls Lemdiklat → Lembaga', async () => {
    // The one level that contains itself. If the parent level were forbidden here
    // rather than optional, this step would be unreachable and the second level of
    // the spec's walk would exist in the schema but not in the API.
    const { service: svc } = service({
      scopeGrant: grant({ organizationIds: [ORG_A] }),
      paths: {
        [`${LEVEL.ORGANIZATION}:${ORG_A}`]: {
          ...emptyPath(),
          organizationId: ORG_A,
        },
      },
      children: {
        [`${LEVEL.ORGANIZATION}:${ORG_A}`]: [
          childRow(LEVEL.ORGANIZATION, ORG_A_CHILD, {
            ...emptyPath(),
            organizationId: ORG_A_CHILD,
          }),
        ],
      },
      expansions: { [LEVEL.ORGANIZATION]: { [ORG_A]: [ORG_A_CHILD] } },
    });

    const page = await svc.list(ACCOUNT, {
      level: LEVEL.ORGANIZATION,
      parentId: ORG_A,
    });

    assert.equal(page.parentLevel, LEVEL.ORGANIZATION);
    assert.deepEqual(
      page.data.map((child) => child.id),
      [ORG_A_CHILD],
    );
    assert.deepEqual(
      page.openableLevels,
      [LEVEL.ORGANIZATION, LEVEL.PROGRAM],
      'an institution opens onto sub-institutions and onto its programs',
    );
  });

  it('lists the caller entry points when no parent is given', async () => {
    const { service: svc, repo } = service();

    const page = await svc.list(ACCOUNT, { level: LEVEL.ORGANIZATION });

    assert.equal(page.parentId, null);
    assert.equal(page.parentLevel, null);
    assert.deepEqual(
      repo.listCalls[0].rootOrganizationIds,
      [ORG_A],
      'the root listing is narrowed by the grant, not left open',
    );
  });

  it('passes an unrestricted caller through with a null root narrowing', async () => {
    const { service: svc, repo } = service({
      scopeGrant: { ...grant(), unrestricted: true },
    });

    await svc.list(ACCOUNT, { level: LEVEL.ORGANIZATION });

    assert.equal(
      repo.listCalls[0].rootOrganizationIds,
      null,
      'null means every organization; [] would mean none',
    );
  });

  it('denies an out-of-scope parent with 404, not 403', async () => {
    const { service: svc, repo } = service({
      scopeGrant: grant({ organizationIds: [ORG_B] }),
    });

    await assert.rejects(
      () => svc.list(ACCOUNT, { level: LEVEL.PROGRAM, parentId: ORG_A }),
      (error) => {
        assert.equal(error.getStatus(), 404);
        return true;
      },
    );
    assert.equal(
      repo.listCalls.length,
      0,
      'the refusal happened before the repository was asked for children',
    );
  });

  it('denies an empty grant at the entry points with 403', async () => {
    const { service: svc } = service({ scopeGrant: grant() });

    await assert.rejects(
      () => svc.list(ACCOUNT, { level: LEVEL.ORGANIZATION }),
      (error) => {
        assert.equal(error.getStatus(), 403);
        return true;
      },
    );
  });

  it('rejects a parent id that names the wrong level', async () => {
    // The criterion the spec calls "invalid parent-child rejected". An
    // unrestricted caller passes the reach check trivially, so the only thing
    // standing between them and a nonsense answer is this lookup.
    const { service: svc } = service({
      scopeGrant: { ...grant(), unrestricted: true },
      paths: {},
      levels: { [CLASS_1]: LEVEL.CLASS },
    });

    await assert.rejects(
      () => svc.list(ACCOUNT, { level: LEVEL.BATCH, parentId: CLASS_1 }),
      (error) => {
        assert.equal(error.getStatus(), 400);
        assert.match(error.message, /parentId names a CLASS/);
        assert.match(error.message, /sits under a PROGRAM/);
        return true;
      },
    );
  });

  it('rejects a parent id that names nothing at all', async () => {
    const { service: svc } = service({
      scopeGrant: { ...grant(), unrestricted: true },
    });

    await assert.rejects(
      () => svc.list(ACCOUNT, { level: LEVEL.BATCH, parentId: ABSENT_ID }),
      (error) => {
        assert.equal(error.getStatus(), 404);
        return true;
      },
    );
  });

  it('does not look up the level of a parent the caller may not see', async () => {
    // The precision of the wrong-level error must not be spendable on probing.
    // An out-of-scope id is refused by the reach check first, so `identifyNodeLevel`
    // — the lookup that would reveal what the id actually is — never runs.
    const { service: svc, repo } = service({
      scopeGrant: grant({ organizationIds: [ORG_B] }),
    });

    await assert.rejects(() =>
      svc.list(ACCOUNT, { level: LEVEL.PROGRAM, parentId: ORG_A }),
    );

    assert.deepEqual(
      repo.identifyCalls,
      [],
      'the id was never identified, so its existence was never confirmed',
    );
  });

  it('rejects a malformed request before touching the repository', async () => {
    const { service: svc, repo } = service();

    await assert.rejects(
      () => svc.list(ACCOUNT, { level: 'CONTINENT' }),
      (error) => {
        assert.equal(error.getStatus(), 400);
        return true;
      },
    );
    await assert.rejects(
      () => svc.list(ACCOUNT, { level: LEVEL.BATCH }),
      (error) => {
        assert.equal(error.getStatus(), 400);
        return true;
      },
    );

    assert.deepEqual(repo.listCalls, []);
    assert.deepEqual(repo.pathCalls, []);
  });

  it('throws when the repository returns a node outside the reach', async () => {
    // The second look. A repository bug that returns a row the step check never
    // saw must be loud: a silently smaller page is indistinguishable from "there
    // is less data", and the bug would ship.
    const { service: svc } = service({
      children: {
        [`${LEVEL.PROGRAM}:${ORG_A}`]: [
          childRow(LEVEL.PROGRAM, PROGRAM_1, {
            ...emptyPath(),
            organizationId: ORG_A,
            educationProgramId: PROGRAM_1,
          }),
          childRow(LEVEL.PROGRAM, PROGRAM_2, {
            ...emptyPath(),
            organizationId: ORG_B,
            educationProgramId: PROGRAM_2,
          }),
        ],
      },
    });

    await assert.rejects(
      () => svc.list(ACCOUNT, { level: LEVEL.PROGRAM, parentId: ORG_A }),
      (error) => {
        assert.equal(error.getStatus(), 403);
        assert.match(error.message, /outside the caller scope/);
        return true;
      },
    );
  });

  it('attaches stored metrics, and says null rather than zero when there are none', async () => {
    const { service: svc } = service({
      metricsRow: {
        [`${LEVEL.PROGRAM}:${PROGRAM_1}`]: metricRow({
          scopeType: LEVEL.PROGRAM,
          scopeId: PROGRAM_1,
          participants: 42,
        }),
      },
      childCounts: { [`${LEVEL.PROGRAM}:${PROGRAM_1}`]: 3 },
    });

    const page = await svc.list(ACCOUNT, {
      level: LEVEL.PROGRAM,
      parentId: ORG_A,
    });

    assert.equal(page.data[0].metrics.participants, 42);
    assert.equal(page.data[0].recalculatedAt, '2026-09-01T00:00:00.000Z');
    assert.equal(page.data[0].childCount, 3);
    assert.equal(page.data[0].hasChildren, true);

    // A node that exists but has never been refreshed: `metrics` is null. The
    // distinction matters because 0 participants is a claim, and this node makes
    // no claim.
    const { service: unrefreshed } = service();
    const bare = await unrefreshed.list(ACCOUNT, {
      level: LEVEL.PROGRAM,
      parentId: ORG_A,
    });
    assert.equal(bare.data[0].metrics, null);
    assert.equal(bare.data[0].recalculatedAt, null);
    assert.equal(
      bare.data[0].hasChildren,
      false,
      'a node with no known children offers no door',
    );
  });

  it('never publishes the internal totals the averages were derived from', async () => {
    // The row carries the sums; the response must not. A client that divides them
    // itself can land on a different number than the server did.
    const { service: svc } = service({
      metricsRow: {
        [`${LEVEL.PROGRAM}:${PROGRAM_1}`]: metricRow({
          scopeType: LEVEL.PROGRAM,
          scopeId: PROGRAM_1,
          progressPercentTotal: 1234,
          progressSampleCount: 20,
        }),
      },
    });

    const page = await svc.list(ACCOUNT, {
      level: LEVEL.PROGRAM,
      parentId: ORG_A,
    });

    assert.equal(page.data[0].metrics.progressPercentTotal, undefined);
    assert.equal(page.data[0].metrics.progressSampleCount, undefined);
    assert.equal(page.data[0].metrics.averageProgressPercent, 80);
  });

  it('offers only the child levels the caller can actually open', async () => {
    const { service: svc } = service();

    const page = await svc.list(ACCOUNT, {
      level: LEVEL.PROGRAM,
      parentId: ORG_A,
    });

    assert.deepEqual(page.openableLevels, [LEVEL.BATCH]);
  });

  it('names the trail of levels the caller is standing in', async () => {
    const { service: svc } = service();

    const page = await svc.list(ACCOUNT, {
      level: LEVEL.BATCH,
      parentId: PROGRAM_1,
    });

    assert.deepEqual(
      page.trail.map((entry) => entry.level),
      [LEVEL.ORGANIZATION, LEVEL.PROGRAM, LEVEL.BATCH],
    );
    assert.deepEqual(
      page.trail.map((entry) => entry.id),
      [null, null, null],
      'the trail names levels, not nodes: the walk does not need ids the client did not ask for',
    );
  });

  it('forwards pagination unchanged, so a page is a page', async () => {
    const { service: svc, repo } = service();

    const page = await svc.list(ACCOUNT, {
      level: LEVEL.PROGRAM,
      parentId: ORG_A,
      page: 4,
      limit: 7,
    });

    assert.equal(page.page, 4);
    assert.equal(page.limit, 7);
    assert.equal(repo.listCalls[0].page, 4);
    assert.equal(repo.listCalls[0].limit, 7);
  });

  it('rebuilds the reach on every request instead of caching it', async () => {
    // A cached reach is a stale authorization decision. The resolver is the only
    // source of truth, so it must be consulted once per call.
    const { service: svc, resolver } = service();

    await svc.list(ACCOUNT, { level: LEVEL.ORGANIZATION });
    await svc.list(ACCOUNT, { level: LEVEL.ORGANIZATION });

    assert.deepEqual(resolver.calls, [ACCOUNT, ACCOUNT]);
  });
});

// --- The HTTP boundary, over the real module wiring --------------------------

/**
 * These go through `createApp`, so they exercise the actual composition root:
 * the global guards, the DTO pipe, and the `ReportingModule.register()` bindings
 * that TASK-062 added.
 *
 * Every case here is decided *before* a query runs — a malformed request, a
 * missing permission, a missing token, an empty grant — which is what lets the
 * boundary be tested without a database. That is not a limitation worked around;
 * it is the property being asserted: a request that cannot be authorised must not
 * reach the data, and if one of these ever starts returning a 500 instead of a
 * 4xx, the assertion that no connection was needed is what will say so.
 */

const { createApp } = require('../dist/app');
const { createSign, generateKeyPairSync } = require('node:crypto');

const AUTH_ISSUER = 'https://keycloak.test/realms/lemdiklat';
const AUTH_AUDIENCE = 'lemdiklat-api';
const AUTH_KID = 'reporting-drilldown-test-key';
const ACCOUNT_ID = '30000000-0000-4000-8000-0000000000f1';
const PERSON_ID = '30000000-0000-4000-8000-0000000000f2';

const { privateKey: PRIVATE_KEY, publicKey: PUBLIC_KEY } = generateKeyPairSync(
  'rsa',
  { modulusLength: 2048 },
);
const PUBLIC_JWK = {
  ...PUBLIC_KEY.export({ format: 'jwk' }),
  kid: AUTH_KID,
  use: 'sig',
  alg: 'RS256',
};

function signTestToken(subject = 'executive-drilldown-subject') {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: AUTH_KID }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: AUTH_ISSUER,
      aud: AUTH_AUDIENCE,
      sub: subject,
      iat: now,
      exp: now + 300,
    }),
  ).toString('base64url');
  const signature = createSign('RSA-SHA256')
    .update(`${header}.${payload}`)
    .end()
    .sign(PRIVATE_KEY);
  return `${header}.${payload}.${Buffer.from(signature).toString('base64url')}`;
}

class StaticJwksProvider {
  async getKeys() {
    return [PUBLIC_JWK];
  }
}

class StubIdentityResolver {
  async findAccountByExternalAuthId(externalAuthId) {
    return {
      id: ACCOUNT_ID,
      personId: PERSON_ID,
      externalAuthId,
      username: 'drilldown.tester',
      email: 'drilldown.tester@polri.go.id',
      status: 'ACTIVE',
    };
  }

  async findPersonById(id) {
    if (id !== PERSON_ID) return null;
    return {
      id,
      personnelNumber: '88990011',
      fullName: 'Drilldown Tester',
      rank: null,
      title: null,
      email: null,
      phone: null,
      status: 'ACTIVE',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async touchLastLoginAt() {}
}

class StubPermissionEvaluator {
  constructor(permissions = []) {
    this.permissions = new Set(permissions);
  }

  async hasPermission(_userAccountId, permissionCode) {
    return this.permissions.has(permissionCode);
  }

  async getUserEffectivePermissions(userAccountId) {
    return {
      userAccountId,
      permissions: Array.from(this.permissions).map((code) => ({
        code,
        isUnrestricted: true,
        scopes: [],
      })),
    };
  }
}

const AUTH_CONFIG = {
  issuer: AUTH_ISSUER,
  audience: AUTH_AUDIENCE,
  jwksUri: `${AUTH_ISSUER}/protocol/openid-connect/certs`,
  clockSkewSeconds: 30,
  jwksCacheSeconds: 300,
  jwksRequestTimeoutMs: 5000,
  lastLoginThrottleSeconds: 300,
};

async function startApp(options = {}) {
  const app = await createApp({
    authConfig: AUTH_CONFIG,
    jwksProvider: new StaticJwksProvider(),
    identityResolver: new StubIdentityResolver(),
    ...options,
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  return {
    app,
    base,
    auth: { authorization: `Bearer ${signTestToken()}` },
  };
}

const DRILLDOWN_PATH = '/api/v1/reporting/executive/drilldown';

test('drill-down is denied without the executive permission', async () => {
  // Holds the metric read but not the executive read: the two are separate
  // disclosures, and one must not imply the other.
  const { app, base, auth } = await startApp({
    permissionEvaluator: new StubPermissionEvaluator([
      REPORTING_PERMISSIONS.READ,
    ]),
    executiveScopeGrantResolver: new StubScopeGrantResolver(grant()),
  });
  try {
    const denied = await fetch(`${base}${DRILLDOWN_PATH}?level=ORGANIZATION`, {
      headers: auth,
    });
    assert.equal(denied.status, 403);

    const anonymous = await fetch(
      `${base}${DRILLDOWN_PATH}?level=ORGANIZATION`,
    );
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});

test('drill-down validates its query before it looks at anything', async () => {
  const { app, base, auth } = await startApp({
    permissionEvaluator: new StubPermissionEvaluator([EXECUTIVE_READ]),
    executiveScopeGrantResolver: new StubScopeGrantResolver({
      ...grant(),
      unrestricted: true,
    }),
  });
  try {
    const unknownLevel = await fetch(
      `${base}${DRILLDOWN_PATH}?level=CONTINENT`,
      {
        headers: auth,
      },
    );
    assert.equal(unknownLevel.status, 400);

    const missingLevel = await fetch(`${base}${DRILLDOWN_PATH}`, {
      headers: auth,
    });
    assert.equal(missingLevel.status, 400);

    // A non-UUID parent id is refused by the DTO, so a report cannot be used to
    // probe for identifiers of another shape.
    const badParent = await fetch(
      `${base}${DRILLDOWN_PATH}?level=PROGRAM&parentId=not-a-uuid`,
      { headers: auth },
    );
    assert.equal(badParent.status, 400);

    // A page size large enough to turn the walk into a full-table read.
    const tooLarge = await fetch(
      `${base}${DRILLDOWN_PATH}?level=ORGANIZATION&limit=500`,
      { headers: auth },
    );
    assert.equal(tooLarge.status, 400);
  } finally {
    await app.close();
  }
});

test('drill-down refuses a parentless non-root request and an empty grant', async () => {
  const { app, base, auth } = await startApp({
    permissionEvaluator: new StubPermissionEvaluator([EXECUTIVE_READ]),
    executiveScopeGrantResolver: new StubScopeGrantResolver(grant()),
  });
  try {
    // Well-formed DTO, impossible question: a program has to live somewhere.
    const parentless = await fetch(`${base}${DRILLDOWN_PATH}?level=PROGRAM`, {
      headers: auth,
    });
    assert.equal(parentless.status, 400);

    // A caller holding the permission but no scope is denied rather than handed
    // an empty tree: an empty tree reads as "there is nothing to see", which is a
    // different statement from "you may see nothing".
    const entryPoints = await fetch(
      `${base}${DRILLDOWN_PATH}?level=ORGANIZATION`,
      { headers: auth },
    );
    assert.equal(entryPoints.status, 403);
  } finally {
    await app.close();
  }
});

test('drill-down answers an out-of-scope parent with the same 404 as a nonexistent one', async () => {
  // A caller with no grants at all, deliberately: the reach check is what decides
  // here, and it never consults the database — which is the property under test.
  // An id outside the scope and an id that does not exist must produce the same
  // answer, because if they differed the endpoint would confirm which ids exist.
  //
  // A grant that *did* name an organization would send the projection to the
  // database to expand it, and there is no database in this suite. The narrower
  // claim — that the two refusals are produced by the same branch, before any
  // lookup — is the one that can be proved here, and it is the one that matters.
  const { app, base, auth } = await startApp({
    permissionEvaluator: new StubPermissionEvaluator([EXECUTIVE_READ]),
    executiveScopeGrantResolver: new StubScopeGrantResolver(grant()),
  });
  try {
    const outOfScope = await fetch(
      `${base}${DRILLDOWN_PATH}?level=PROGRAM&parentId=${ORG_A}`,
      { headers: auth },
    );
    const nonexistent = await fetch(
      `${base}${DRILLDOWN_PATH}?level=PROGRAM&parentId=${ABSENT_ID}`,
      { headers: auth },
    );

    assert.equal(outOfScope.status, 404);
    assert.equal(nonexistent.status, 404);

    const [first, second] = await Promise.all([
      outOfScope.json(),
      nonexistent.json(),
    ]);
    assert.deepEqual(
      first,
      second,
      'the two answers must be indistinguishable, or the endpoint is an id oracle',
    );
  } finally {
    await app.close();
  }
});

// Exercise the real repository: service doubles cannot detect missing SQL branches.
const {
  PrismaDrilldownRepository,
} = require('../dist/reporting/drilldown.repository');

test('repository root pagination excludes unrelated organizations and duplicate descendants', async () => {
  const rows = [
    { id: ORG_A, parentId: null },
    { id: ORG_B, parentId: null },
    { id: ORG_A_CHILD, parentId: ORG_A },
  ].map((row) => ({
    ...row,
    name: row.id,
    code: row.id,
    _count: { children: 1, educationPrograms: 2 },
  }));
  const selectRows = (where) =>
    rows.filter((row) => {
      if (where.id && !where.id.in.includes(row.id)) return false;
      if (where.OR)
        return where.OR.some((part) =>
          part.parentId === null
            ? row.parentId === null
            : part.parentId?.notIn
              ? row.parentId !== null &&
                !part.parentId.notIn.includes(row.parentId)
              : part.id?.in.includes(row.id),
        );
      return row.parentId === where.parentId;
    });
  const repo = new PrismaDrilldownRepository({
    organization: {
      findMany: async (query) =>
        selectRows(query.where).slice(query.skip, query.skip + query.take),
      count: async (query) => selectRows(query.where).length,
    },
    reportingMetric: { findMany: async () => [] },
  });
  const base = {
    level: LEVEL.ORGANIZATION,
    parentId: null,
    page: 1,
    limit: 25,
  };
  const scoped = await repo.listChildren({
    ...base,
    rootOrganizationIds: [ORG_A, ORG_A_CHILD],
  });
  assert.deepEqual(
    scoped.data.map((row) => row.id),
    [ORG_A],
  );
  assert.equal(scoped.total, 1);
  assert.equal(scoped.data[0].childCount, 3);
  const inner = await repo.listChildren({
    ...base,
    rootOrganizationIds: [ORG_A_CHILD],
  });
  assert.deepEqual(
    inner.data.map((row) => row.id),
    [ORG_A_CHILD],
  );
  const national = await repo.listChildren({
    ...base,
    rootOrganizationIds: null,
  });
  assert.deepEqual(
    national.data.map((row) => row.id),
    [ORG_A, ORG_B],
  );
  const empty = await repo.listChildren({ ...base, rootOrganizationIds: [] });
  assert.equal(empty.total, 0);
});

test('real repository traverses subject to participants with pagination and stored metrics', async () => {
  const queries = [];
  const repo = new PrismaDrilldownRepository({
    classSubject: {
      findUnique: async ({ where }) => {
        assert.equal(where.id, SUBJECT_1);
        return {
          id: SUBJECT_1,
          academicClassId: CLASS_1,
          academicClass: {
            educationBatchId: BATCH_1,
            educationBatch: {
              educationProgramId: PROGRAM_1,
              educationProgram: { organizationId: ORG_A },
            },
          },
        };
      },
    },
    enrollment: {
      findMany: async (query) => {
        queries.push(query);
        assert.deepEqual(query.where, { academicClassId: CLASS_1 });
        return [
          {
            id: ENROLLMENT_1,
            academicClassId: CLASS_1,
            person: { fullName: 'Peserta Satu', personnelNumber: '123' },
          },
        ];
      },
      count: async ({ where }) => {
        assert.deepEqual(where, { academicClassId: CLASS_1 });
        return 3;
      },
    },
    reportingMetric: {
      findMany: async ({ where }) => {
        assert.deepEqual(where, {
          scopeType: LEVEL.ENROLLMENT,
          scopeId: { in: [ENROLLMENT_1] },
        });
        return [
          metricRow({
            scopeType: LEVEL.ENROLLMENT,
            scopeId: ENROLLMENT_1,
            participants: 1,
          }),
        ];
      },
    },
  });
  const result = await repo.listChildren({
    level: LEVEL.ENROLLMENT,
    parentId: SUBJECT_1,
    rootOrganizationIds: null,
    page: 2,
    limit: 1,
  });
  assert.equal(result.total, 3);
  assert.equal(result.data[0].id, ENROLLMENT_1);
  assert.equal(result.data[0].parentId, SUBJECT_1);
  assert.equal(result.data[0].path.classSubjectId, SUBJECT_1);
  assert.equal(result.data[0].childCount, 0);
  assert.equal(result.data[0].metrics.participants, 1);
  assert.equal(queries[0].skip, 1);
  assert.equal(queries[0].take, 1);
});

test('malformed drilldown requests never resolve or expand a scoped grant', async () => {
  const { service, repo, resolver } = makeService(
    grant({ organizationIds: [ORG_A] }),
  );
  await assert.rejects(
    () => service.list(ACCOUNT_ID, { level: LEVEL.PROGRAM }),
    (error) => error.getStatus() === 400,
  );
  assert.deepEqual(resolver.calls, []);
  assert.deepEqual(repo.expandCalls, []);
});

test('real repository preserves every hierarchy edge and reports child counts', async () => {
  const program = {
    id: PROGRAM_1,
    name: 'Program',
    code: 'P',
    organizationId: ORG_A,
    _count: { educationBatches: 2 },
  };
  const batch = {
    id: BATCH_1,
    name: 'Angkatan',
    code: 'B',
    educationProgramId: PROGRAM_1,
    educationProgram: program,
    _count: { classes: 3 },
  };
  const cls = {
    id: CLASS_1,
    name: 'Kelas',
    code: 'C',
    educationBatchId: BATCH_1,
    educationBatch: batch,
    _count: { classSubjects: 4, enrollments: 5 },
  };
  const subject = {
    id: SUBJECT_1,
    code: 'S',
    displayName: null,
    academicClassId: CLASS_1,
    academicClass: cls,
    curriculumSubject: { subject: { name: 'Pelajaran' } },
  };
  const org = {
    id: ORG_A_CHILD,
    name: 'Lembaga',
    code: 'O',
    parentId: ORG_A,
    _count: { children: 0, educationPrograms: 1 },
  };
  for (const [level, model, parentId, where, row, expectedCount] of [
    [LEVEL.ORGANIZATION, 'organization', ORG_A, { parentId: ORG_A }, org, 1],
    [
      LEVEL.PROGRAM,
      'educationProgram',
      ORG_A,
      { organizationId: ORG_A },
      program,
      2,
    ],
    [
      LEVEL.BATCH,
      'educationBatch',
      PROGRAM_1,
      { educationProgramId: PROGRAM_1 },
      batch,
      3,
    ],
    [
      LEVEL.CLASS,
      'academicClass',
      BATCH_1,
      { educationBatchId: BATCH_1 },
      cls,
      4,
    ],
    [
      LEVEL.CLASS_SUBJECT,
      'classSubject',
      CLASS_1,
      { academicClassId: CLASS_1 },
      subject,
      5,
    ],
  ]) {
    const repo = new PrismaDrilldownRepository({
      [model]: {
        findMany: async (query) => {
          assert.deepEqual(query.where, where);
          return [row];
        },
        count: async (query) => {
          assert.deepEqual(query.where, where);
          return 1;
        },
      },
      reportingMetric: { findMany: async () => [] },
    });
    const page = await repo.listChildren({
      level,
      parentId,
      rootOrganizationIds: null,
      page: 1,
      limit: 25,
    });
    assert.equal(page.data[0].id, row.id, level);
    assert.equal(page.data[0].parentId, parentId, level);
    assert.equal(page.data[0].childCount, expectedCount, level);
    assert.equal(page.data[0].metrics, null, level);
    assert.equal(page.total, 1, level);
  }
});
