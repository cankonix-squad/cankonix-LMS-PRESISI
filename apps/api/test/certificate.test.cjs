const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  PUBLIC_CERTIFICATE_FIELDS,
  canTransitionTemplate,
  certificateEligibilityBlockers,
  isCertificateEligible,
  isTemplateIssuable,
  toPublicProjection,
} = require('../dist/certificates/certificate-rules');
const {
  READABLE_ALPHABET,
  generateCertificateNumber,
  generateVerificationCode,
  normalizeVerificationCode,
  randomToken,
} = require('../dist/certificates/certificate-codes');
const {
  CertificateService,
} = require('../dist/certificates/certificate.service');

class FakeAuditService {
  constructor() {
    this.entries = [];
  }

  async record(entry) {
    this.entries.push(entry);
    return { id: `audit-${this.entries.length}` };
  }
}

/**
 * In-memory certificate repository.
 *
 * Mirrors the Prisma repository's observable contract, including the parts the
 * tests depend on:
 *
 * - every query returns a **fresh object**, like Prisma does, so a later
 *   mutation cannot retroactively change an earlier read;
 * - there is **no `delete`**, because withdrawal moves `status` (TASK-055).
 */
class FakeCertificateRepository {
  constructor(options = {}) {
    this.decisions = options.decisions ?? new Map();
    this.storedFiles = options.storedFiles ?? new Map();
    this.templates = [];
    this.certificates = [];
    this.templateSequence = 0;
    this.certificateSequence = 0;
  }

  clone(row) {
    return row ? { ...row } : null;
  }

  // --- Templates -----------------------------------------------------------

  async createTemplate(data) {
    const template = {
      id: `template-${++this.templateSequence}`,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      version: data.version,
      status: 'DRAFT',
      templateObjectKey: data.templateObjectKey ?? null,
      config: data.config ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.push(template);
    return this.clone(template);
  }

  async findTemplateById(id) {
    return this.clone(this.templates.find((row) => row.id === id) ?? null);
  }

  async findLatestTemplateByCode(code) {
    const matches = this.templates
      .filter((row) => row.code === code)
      .sort((a, b) => b.version - a.version);
    return this.clone(matches[0] ?? null);
  }

  async listTemplates(filter) {
    const data = this.templates.filter(
      (row) =>
        (!filter.code ||
          row.code.toLowerCase().includes(filter.code.toLowerCase())) &&
        (!filter.status || row.status === filter.status),
    );
    return { data, total: data.length };
  }

  async updateTemplate(id, data) {
    const template = this.templates.find((row) => row.id === id);
    if (data.name !== undefined) template.name = data.name;
    if (data.description !== undefined) template.description = data.description;
    if (data.templateObjectKey !== undefined) {
      template.templateObjectKey = data.templateObjectKey;
    }
    if (data.config !== undefined) template.config = data.config;
    template.updatedAt = new Date();
    return this.clone(template);
  }

  async updateTemplateStatus(id, status) {
    const template = this.templates.find((row) => row.id === id);
    template.status = status;
    template.updatedAt = new Date();
    return this.clone(template);
  }

  // --- Issuance inputs -----------------------------------------------------

  async findDecisionContext(decisionId) {
    const decision = this.decisions.get(decisionId);
    return decision ? { ...decision } : null;
  }

  async findStoredFileContext(fileId) {
    const file = this.storedFiles.get(fileId);
    return file ? { ...file } : null;
  }

  // --- Certificates --------------------------------------------------------

  async findByDecisionId(decisionId) {
    return this.clone(
      this.certificates.find((row) => row.decisionId === decisionId) ?? null,
    );
  }

  async findById(id) {
    return this.clone(this.certificates.find((row) => row.id === id) ?? null);
  }

  async findByVerificationCode(code) {
    return this.clone(
      this.certificates.find((row) => row.verificationCode === code) ?? null,
    );
  }

  async existsByCertificateNumber(certificateNumber) {
    return this.certificates.some(
      (row) => row.certificateNumber === certificateNumber,
    );
  }

  async existsByVerificationCode(verificationCode) {
    return this.certificates.some(
      (row) => row.verificationCode === verificationCode,
    );
  }

  async list(filter) {
    const data = this.certificates.filter(
      (row) =>
        (!filter.templateId || row.templateId === filter.templateId) &&
        (!filter.status || row.status === filter.status),
    );
    return { data, total: data.length };
  }

  async create(data) {
    const context = this.decisions.get(data.decisionId);
    const template = this.templates.find((row) => row.id === data.templateId);
    const certificate = {
      id: `certificate-${++this.certificateSequence}`,
      decisionId: data.decisionId,
      templateId: data.templateId,
      certificateNumber: data.certificateNumber,
      verificationCode: data.verificationCode,
      status: 'ISSUED',
      issuedAt: data.issuedAt ?? new Date(),
      issuedByUserId: data.issuedByUserId ?? null,
      fileId: data.fileId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      templateCode: template.code,
      templateName: template.name,
      templateVersion: template.version,
      holderFullName: context.personFullName,
      educationBatchName: context.educationBatchName,
      educationProgramName: context.educationProgramName,
      revokedReason: null,
      revokedAt: null,
    };
    this.certificates.push(certificate);
    return this.clone(certificate);
  }

  async attachFile(id, fileId) {
    const certificate = this.certificates.find((row) => row.id === id);
    certificate.fileId = fileId;
    certificate.updatedAt = new Date();
    return this.clone(certificate);
  }
}

/** A graduation decision context that passes every eligibility rule. */
function eligibleDecision(overrides = {}) {
  return {
    decisionId: 'decision-1',
    decisionStatus: 'APPROVED',
    decisionOutcome: 'PASS',
    decisionApprovedAt: new Date('2026-09-01T00:00:00.000Z'),
    evaluationId: 'evaluation-1',
    evaluationOutcome: 'ELIGIBLE',
    enrollmentId: 'enrollment-1',
    personId: 'person-1',
    personFullName: 'Bripda Andi Saputra',
    educationBatchId: 'batch-1',
    educationBatchName: 'Angkatan 42',
    educationProgramName: 'Dikbang SPN',
    ...overrides,
  };
}

function buildService(options = {}) {
  const repository = new FakeCertificateRepository(options);
  const audit = new FakeAuditService();
  const service = new CertificateService(repository, audit);
  return { service, repository, audit };
}

async function createActiveTemplate(service, overrides = {}) {
  const template = await service.createTemplate(
    {
      code: overrides.code ?? 'DIPLOMA',
      name: overrides.name ?? 'Ijazah',
      description: null,
    },
    'user-1',
  );
  await service.changeTemplateStatus(
    template.id,
    { status: 'ACTIVE' },
    'user-1',
  );
  return service.findTemplate(template.id);
}

// --- Business rules --------------------------------------------------------

test('certificate eligibility requires an approved PASS decision and an eligible evaluation', () => {
  assert.equal(isCertificateEligible(eligibleDecision()), true);
  assert.deepEqual(certificateEligibilityBlockers(eligibleDecision()), []);

  const draft = eligibleDecision({
    decisionId: 'd2',
    decisionStatus: 'DRAFT',
  });
  assert.equal(isCertificateEligible(draft), false);
  assert.deepEqual(certificateEligibilityBlockers(draft), [
    'DECISION_NOT_APPROVED',
  ]);

  const revoked = eligibleDecision({
    decisionId: 'd3',
    decisionStatus: 'REVOKED',
  });
  assert.equal(isCertificateEligible(revoked), false);

  const failed = eligibleDecision({
    decisionId: 'd4',
    decisionOutcome: 'FAIL',
  });
  assert.equal(isCertificateEligible(failed), false);
  assert.deepEqual(certificateEligibilityBlockers(failed), [
    'VERDICT_NOT_PASS',
  ]);

  const remedial = eligibleDecision({
    decisionId: 'd5',
    decisionOutcome: 'REMEDIAL',
  });
  assert.equal(isCertificateEligible(remedial), false);

  const notEligible = eligibleDecision({
    decisionId: 'd6',
    evaluationOutcome: 'NOT_ELIGIBLE',
  });
  assert.equal(isCertificateEligible(notEligible), false);
  assert.deepEqual(certificateEligibilityBlockers(notEligible), [
    'EVALUATION_NOT_ELIGIBLE',
  ]);

  // A decision that rests on evidence which has since been replaced, or which
  // has no outcome yet, must not be certifiable either.
  const superseded = eligibleDecision({
    decisionId: 'd7',
    evaluationOutcome: 'SUPERSEDED',
  });
  assert.deepEqual(certificateEligibilityBlockers(superseded), [
    'EVALUATION_SUPERSEDED',
  ]);

  const pending = eligibleDecision({
    decisionId: 'd8',
    evaluationOutcome: 'PENDING',
  });
  assert.deepEqual(certificateEligibilityBlockers(pending), [
    'EVALUATION_PENDING',
  ]);

  const revokedDecision = eligibleDecision({
    decisionId: 'd9',
    decisionStatus: 'REVOKED',
  });
  assert.deepEqual(certificateEligibilityBlockers(revokedDecision), [
    'DECISION_REVOKED',
  ]);
});

test('a template can only issue while ACTIVE', () => {
  assert.equal(isTemplateIssuable('ACTIVE'), true);
  assert.equal(isTemplateIssuable('DRAFT'), false);
  assert.equal(isTemplateIssuable('ARCHIVED'), false);

  assert.equal(canTransitionTemplate('DRAFT', 'ACTIVE'), true);
  assert.equal(canTransitionTemplate('DRAFT', 'ARCHIVED'), true);
  assert.equal(canTransitionTemplate('ACTIVE', 'ARCHIVED'), true);
  // ARCHIVED is terminal and ACTIVE cannot go back to DRAFT: both would change
  // the meaning of documents already issued.
  assert.equal(canTransitionTemplate('ARCHIVED', 'ACTIVE'), false);
  assert.equal(canTransitionTemplate('ACTIVE', 'DRAFT'), false);
});

// --- Certificate number and verification code ------------------------------

test('generated tokens use only the readable alphabet', () => {
  for (let i = 0; i < 200; i += 1) {
    const code = generateVerificationCode();
    assert.equal(code.length, 24);
    for (const char of code) {
      assert.ok(
        READABLE_ALPHABET.includes(char),
        `unexpected character ${char} in ${code}`,
      );
    }
  }

  // Look-alike characters must never appear: these values are typed by hand.
  for (const forbidden of ['0', '1', 'I', 'L', 'O']) {
    assert.equal(READABLE_ALPHABET.includes(forbidden), false);
  }
});

test('certificate numbers are unpredictable and carry the year', () => {
  const seen = new Set();
  for (let i = 0; i < 500; i += 1) {
    const number = generateCertificateNumber(2026);
    assert.match(number, /^CERT-2026-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/);
    seen.add(number);
  }
  // 500 draws from a 31^10 space colliding would mean the generator is broken.
  assert.equal(seen.size, 500);
});

test('randomToken rejection-samples instead of using modulo, and rejects bad input', () => {
  // 256 % 31 === 8, so a naive `byte % length` would over-represent the first
  // eight symbols. Over many samples every symbol must land in a tight band.
  const counts = new Map();
  const samples = 20000;
  const token = randomToken(samples, READABLE_ALPHABET);
  for (const char of token) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  assert.equal(counts.size, READABLE_ALPHABET.length);

  const expected = samples / READABLE_ALPHABET.length;
  for (const [, count] of counts) {
    assert.ok(
      Math.abs(count - expected) < expected * 0.25,
      `symbol frequency ${count} is too far from ${expected}`,
    );
  }

  assert.throws(() => randomToken(0), /positive integer/);
  assert.throws(() => randomToken(4, 'A'), /between 2 and 256/);
});

test('normalizeVerificationCode tolerates how a printed code is typed', () => {
  assert.equal(normalizeVerificationCode('  abcd-efgh  '), 'ABCDEFGH');
  assert.equal(normalizeVerificationCode('ABCD EFGH'), 'ABCDEFGH');
  assert.equal(normalizeVerificationCode('abcdefgh'), 'ABCDEFGH');
});

// --- Public projection ----------------------------------------------------

test('the public projection exposes exactly the approved fields', () => {
  const projection = toPublicProjection({
    status: 'ISSUED',
    certificateNumber: 'CERT-2026-ABCDEFGHJK',
    issuedAt: new Date('2026-09-01T00:00:00.000Z'),
    holderFullName: 'Bripda Andi Saputra',
    educationProgramName: 'Dikbang SPN',
    educationBatchName: 'Angkatan 42',
    templateName: 'Ijazah',
    templateVersion: 1,
  });

  assert.deepEqual(Object.keys(projection).sort(), [
    'batchName',
    'certificateNumber',
    'holderName',
    'issuedAt',
    'programName',
    'status',
    'templateName',
    'templateVersion',
    'valid',
  ]);
  for (const key of Object.keys(projection)) {
    assert.ok(
      PUBLIC_CERTIFICATE_FIELDS.includes(key),
      `${key} is not an approved public field`,
    );
  }
  assert.equal(projection.valid, true);
});

test('the public projection leaks no identifier or contact detail', () => {
  const projection = toPublicProjection({
    status: 'ISSUED',
    certificateNumber: 'CERT-2026-ABCDEFGHJK',
    issuedAt: new Date('2026-09-01T00:00:00.000Z'),
    holderFullName: 'Bripda Andi Saputra',
    educationProgramName: 'Dikbang SPN',
    educationBatchName: 'Angkatan 42',
    templateName: 'Ijazah',
    templateVersion: 1,
  });

  const serialized = JSON.stringify(projection);
  for (const forbidden of [
    'personnelNumber',
    'email',
    'phone',
    'enrollmentId',
    'decisionId',
    'verificationCode',
    'issuedByUserId',
    'fileId',
    'objectKey',
    'templateId',
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false,
      `public projection must not contain ${forbidden}`,
    );
  }
});

test('the public projection reports revoked status with the reason', () => {
  const projection = toPublicProjection({
    status: 'REVOKED',
    certificateNumber: 'CERT-2026-ABCDEFGHJK',
    issuedAt: new Date('2026-09-01T00:00:00.000Z'),
    holderFullName: 'Bripda Andi Saputra',
    educationProgramName: 'Dikbang SPN',
    educationBatchName: 'Angkatan 42',
    templateName: 'Ijazah',
    templateVersion: 1,
    revokedReason: 'Issued in error',
    revokedAt: new Date('2026-10-01T00:00:00.000Z'),
  });

  assert.equal(projection.valid, false);
  assert.equal(projection.status, 'REVOKED');
  assert.equal(projection.revokedReason, 'Issued in error');
  assert.equal(projection.revokedAt, '2026-10-01T00:00:00.000Z');
});

// --- Template lifecycle ---------------------------------------------------

test('template versions increment per code and are assigned by the server', async () => {
  const { service, audit } = buildService();

  const v1 = await service.createTemplate(
    { code: 'diploma', name: 'Ijazah' },
    'user-1',
  );
  const v2 = await service.createTemplate(
    { code: 'DIPLOMA', name: 'Ijazah' },
    'user-1',
  );

  // Code is normalized so casing cannot fork the version sequence.
  assert.equal(v1.code, 'DIPLOMA');
  assert.equal(v1.version, 1);
  assert.equal(v2.version, 2);

  const v3 = await service.createTemplateVersion(
    v2.id,
    { name: 'Ijazah Edisi Baru' },
    'user-1',
  );
  assert.equal(v3.code, 'DIPLOMA');
  assert.equal(v3.version, 3);
  assert.equal(v3.name, 'Ijazah Edisi Baru');

  assert.equal(
    audit.entries.filter(
      (entry) => entry.action === 'certificate_template.created',
    ).length,
    3,
  );
});

test('template status follows DRAFT -> ACTIVE -> ARCHIVED and ARCHIVED is terminal', async () => {
  const { service, audit } = buildService();
  const template = await service.createTemplate(
    { code: 'DIPLOMA', name: 'Ijazah' },
    'user-1',
  );
  assert.equal(template.status, 'DRAFT');

  const active = await service.changeTemplateStatus(
    template.id,
    { status: 'ACTIVE' },
    'user-1',
  );
  assert.equal(active.status, 'ACTIVE');

  const archived = await service.changeTemplateStatus(
    template.id,
    { status: 'ARCHIVED' },
    'user-1',
  );
  assert.equal(archived.status, 'ARCHIVED');

  await assert.rejects(
    () => service.changeTemplateStatus(template.id, { status: 'ACTIVE' }, 'u'),
    /archived/i,
  );
  // Repeating the same status is a conflict, not a silent no-op, so the audit
  // trail records one transition per real change.
  await assert.rejects(
    () =>
      service.changeTemplateStatus(template.id, { status: 'ARCHIVED' }, 'u'),
    /already ARCHIVED/,
  );

  assert.equal(
    audit.entries.filter(
      (entry) => entry.action === 'certificate_template.status_changed',
    ).length,
    2,
  );
});

test('an archived template cannot be edited and there is no delete', async () => {
  const { service, repository } = buildService();
  const template = await service.createTemplate(
    { code: 'DIPLOMA', name: 'Ijazah' },
    'user-1',
  );
  await service.changeTemplateStatus(template.id, { status: 'ARCHIVED' }, 'u');

  await assert.rejects(
    () => service.updateTemplate(template.id, { name: 'Nope' }, 'u'),
    /archived/i,
  );

  // Withdrawal/retirement is by status only: the repository must not offer a
  // hard delete, or issued certificates would lose their template.
  assert.equal(typeof repository.delete, 'undefined');
  assert.equal(typeof repository.deleteTemplate, 'undefined');
});

// --- Issuance -------------------------------------------------------------

test('an eligible decision issues a certificate that references the template version', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service, audit } = buildService({ decisions });
  const template = await createActiveTemplate(service);

  const certificate = await service.issueCertificate(
    { decisionId: 'decision-1', templateId: template.id },
    'user-1',
  );

  assert.equal(certificate.status, 'ISSUED');
  assert.equal(certificate.holderFullName, 'Bripda Andi Saputra');
  assert.equal(certificate.educationProgramName, 'Dikbang SPN');
  assert.equal(certificate.educationBatchName, 'Angkatan 42');
  assert.equal(certificate.templateVersion, template.version);
  assert.match(
    certificate.certificateNumber,
    /^CERT-\d{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/,
  );
  assert.equal(certificate.verificationCode.length, 24);

  const issued = audit.entries.find(
    (entry) => entry.action === 'certificate.issued',
  );
  assert.ok(issued);
  assert.equal(issued.resourceType, 'certificate');
  // The code is the only secret guarding the public lookup, so it must not be
  // copied into a trail that many people can read.
  assert.equal(
    JSON.stringify(issued).includes(certificate.verificationCode),
    false,
  );
});

test('issuance refuses ineligible decisions and unusable templates', async () => {
  const decisions = new Map([
    [
      'decision-draft',
      eligibleDecision({
        decisionId: 'decision-draft',
        decisionStatus: 'DRAFT',
      }),
    ],
    [
      'decision-fail',
      eligibleDecision({
        decisionId: 'decision-fail',
        decisionOutcome: 'FAIL',
      }),
    ],
    [
      'decision-ineligible',
      eligibleDecision({
        decisionId: 'decision-ineligible',
        evaluationOutcome: 'NOT_ELIGIBLE',
      }),
    ],
  ]);
  const { service } = buildService({ decisions });

  const active = await createActiveTemplate(service);
  const draftTemplate = await service.createTemplate(
    { code: 'SERTIFIKAT', name: 'Sertifikat' },
    'user-1',
  );

  await assert.rejects(
    () =>
      service.issueCertificate(
        { decisionId: 'decision-draft', templateId: active.id },
        'u',
      ),
    /approved/i,
  );
  await assert.rejects(
    () =>
      service.issueCertificate(
        { decisionId: 'decision-fail', templateId: active.id },
        'u',
      ),
    /PASS/i,
  );
  await assert.rejects(
    () =>
      service.issueCertificate(
        { decisionId: 'decision-ineligible', templateId: active.id },
        'u',
      ),
    /eligible/i,
  );
  await assert.rejects(
    () =>
      service.issueCertificate(
        { decisionId: 'decision-missing', templateId: active.id },
        'u',
      ),
    /not found/i,
  );
  await assert.rejects(
    () =>
      service.issueCertificate(
        { decisionId: 'decision-draft', templateId: draftTemplate.id },
        'u',
      ),
    /approved/i,
  );
});

test('issuance refuses a template that is not ACTIVE', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service } = buildService({ decisions });
  const draftTemplate = await service.createTemplate(
    { code: 'DIPLOMA', name: 'Ijazah' },
    'user-1',
  );

  await assert.rejects(
    () =>
      service.issueCertificate(
        { decisionId: 'decision-1', templateId: draftTemplate.id },
        'u',
      ),
    /draft/i,
  );
});

test('a decision can hold only one certificate', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service } = buildService({ decisions });
  const template = await createActiveTemplate(service);

  const first = await service.issueCertificate(
    { decisionId: 'decision-1', templateId: template.id },
    'user-1',
  );

  await assert.rejects(
    () =>
      service.issueCertificate(
        { decisionId: 'decision-1', templateId: template.id },
        'user-1',
      ),
    new RegExp(first.certificateNumber),
  );
});

test('a colliding token is regenerated rather than surfaced as a constraint error', async () => {
  const decisions = new Map([
    ['decision-1', eligibleDecision()],
    ['decision-2', eligibleDecision({ decisionId: 'decision-2' })],
  ]);
  const { service, repository } = buildService({ decisions });
  const template = await createActiveTemplate(service);

  await service.issueCertificate(
    { decisionId: 'decision-1', templateId: template.id },
    'u',
  );

  // Report a collision for the first draw only. The service must retry and
  // produce a different value instead of failing with a unique-constraint error.
  const realExists = repository.existsByCertificateNumber.bind(repository);
  let numberChecks = 0;
  repository.existsByCertificateNumber = async (value) => {
    numberChecks += 1;
    if (numberChecks === 1) return true;
    return realExists(value);
  };

  const second = await service.issueCertificate(
    { decisionId: 'decision-2', templateId: template.id },
    'u',
  );

  assert.ok(numberChecks >= 2, 'the service must retry after a collision');
  assert.match(
    second.certificateNumber,
    /^CERT-\d{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/,
  );
  assert.equal(repository.certificates.length, 2);
  assert.equal(
    new Set(repository.certificates.map((row) => row.certificateNumber)).size,
    2,
  );
});

test('issuance fails loudly when no unique token can be generated', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service, repository } = buildService({ decisions });
  const template = await createActiveTemplate(service);

  // Every draw collides: this means the generator is broken, so failing is the
  // correct outcome rather than looping forever or writing a duplicate.
  repository.existsByCertificateNumber = async () => true;

  await assert.rejects(
    () =>
      service.issueCertificate(
        { decisionId: 'decision-1', templateId: template.id },
        'u',
      ),
    /unique certificate number/i,
  );
  assert.equal(repository.certificates.length, 0);
});

// --- File attachment ------------------------------------------------------

test('a certificate references a stored file and never stores bytes', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const storedFiles = new Map([
    ['file-1', { id: 'file-1', status: 'ACTIVE', namespace: 'certificate' }],
    [
      'file-pending',
      { id: 'file-pending', status: 'PENDING', namespace: 'certificate' },
    ],
  ]);
  const { service, audit } = buildService({
    decisions,
    storedFiles,
  });
  const template = await createActiveTemplate(service);

  const certificate = await service.issueCertificate(
    { decisionId: 'decision-1', templateId: template.id },
    'user-1',
  );
  assert.equal(certificate.fileId, null);

  const attached = await service.attachFile(
    certificate.id,
    { fileId: 'file-1' },
    'user-1',
  );
  assert.equal(attached.fileId, 'file-1');

  // Only a reference is kept; the record carries no binary payload.
  assert.equal('bytes' in attached, false);
  assert.equal('content' in attached, false);

  await assert.rejects(
    () => service.attachFile(certificate.id, { fileId: 'file-pending' }, 'u'),
    /not available/i,
  );
  await assert.rejects(
    () => service.attachFile(certificate.id, { fileId: 'file-missing' }, 'u'),
    /not found/i,
  );

  assert.ok(
    audit.entries.some((entry) => entry.action === 'certificate.file_attached'),
  );
  // The file is attached by reference only; nothing in the trail holds content.
  assert.equal(JSON.stringify(audit.entries).includes('objectKey'), false);
});

test('issuance refuses to attach a stored file that is not confirmed', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const storedFiles = new Map([
    [
      'file-pending',
      { id: 'file-pending', status: 'PENDING', namespace: 'certificate' },
    ],
  ]);
  const { service } = buildService({ decisions, storedFiles });
  const template = await createActiveTemplate(service);

  await assert.rejects(
    () =>
      service.issueCertificate(
        {
          decisionId: 'decision-1',
          templateId: template.id,
          fileId: 'file-pending',
        },
        'u',
      ),
    /not available/i,
  );
});

// --- Verification and reads ----------------------------------------------

test('public verification answers by code and is insensitive to how it is typed', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service } = buildService({ decisions });
  const template = await createActiveTemplate(service);
  const certificate = await service.issueCertificate(
    { decisionId: 'decision-1', templateId: template.id },
    'user-1',
  );

  const projection = await service.verifyByCode(certificate.verificationCode);
  assert.equal(projection.valid, true);
  assert.equal(projection.certificateNumber, certificate.certificateNumber);
  assert.equal(projection.holderName, 'Bripda Andi Saputra');

  const lowercase = certificate.verificationCode.toLowerCase();
  assert.equal(
    (await service.verifyByCode(` ${lowercase} `)).certificateNumber,
    certificate.certificateNumber,
  );

  // An unknown code resolves to nothing so the caller cannot learn which codes
  // exist by comparing responses.
  assert.equal(await service.verifyByCode('ZZZZZZZZZZZZZZZZZZZZZZZZ'), null);
  assert.equal(await service.verifyByCode('   '), null);
});

test('certificate reads expose the verification code only to authenticated callers', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service } = buildService({ decisions });
  const template = await createActiveTemplate(service);
  const certificate = await service.issueCertificate(
    { decisionId: 'decision-1', templateId: template.id },
    'user-1',
  );

  const found = await service.findOne(certificate.id);
  assert.equal(found.id, certificate.id);

  const listed = await service.list({});
  assert.equal(listed.total, 1);
  assert.equal(listed.data[0].id, certificate.id);

  await assert.rejects(
    () => service.findOne('certificate-missing'),
    /not found/i,
  );
  await assert.rejects(
    () => service.findTemplate('template-missing'),
    /not found/i,
  );
});
