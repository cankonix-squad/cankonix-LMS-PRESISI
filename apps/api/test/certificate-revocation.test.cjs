const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  REVOCATION_REASON_MIN_LENGTH,
  canRevokeCertificate,
  describeRevocationBlocker,
  describeRevocationReasonBlocker,
  isRevocationReasonAcceptable,
  toPublicProjection,
} = require('../dist/certificates/certificate-rules');
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
 * In-memory certificate repository with revocation support (TASK-055).
 *
 * Mirrors the observable contract of the Prisma repository, including the parts
 * these tests exist to prove:
 *
 * - `revoke` writes the status move and the evidence row **together**, so there
 *   is no state in which one exists without the other;
 * - every query returns a **fresh object**, like Prisma does;
 * - there is **no `delete`**, on either the certificate or the evidence.
 */
class FakeCertificateRepository {
  constructor(options = {}) {
    this.decisions = options.decisions ?? new Map();
    this.storedFiles = options.storedFiles ?? new Map();
    this.templates = [];
    this.certificates = [];
    this.revocations = [];
    this.templateSequence = 0;
    this.certificateSequence = 0;
    this.revocationSequence = 0;
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
    template.updatedAt = new Date();
    return this.clone(template);
  }

  async updateTemplateStatus(id, status) {
    const template = this.templates.find((row) => row.id === id);
    template.status = status;
    return this.clone(template);
  }

  // --- Issuance ------------------------------------------------------------

  async findDecisionContext(decisionId) {
    const decision = this.decisions.get(decisionId);
    return decision ? { ...decision } : null;
  }

  async findStoredFileContext(fileId) {
    const file = this.storedFiles.get(fileId);
    return file ? { ...file } : null;
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
      revokedByUserId: null,
    };
    this.certificates.push(certificate);
    return this.clone(certificate);
  }

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

  async existsByCertificateNumber(value) {
    return this.certificates.some((row) => row.certificateNumber === value);
  }

  async existsByVerificationCode(value) {
    return this.certificates.some((row) => row.verificationCode === value);
  }

  async list(filter) {
    const data = this.certificates.filter(
      (row) =>
        (!filter.templateId || row.templateId === filter.templateId) &&
        (!filter.status || row.status === filter.status),
    );
    return { data, total: data.length };
  }

  async attachFile(id, fileId) {
    const certificate = this.certificates.find((row) => row.id === id);
    certificate.fileId = fileId;
    return this.clone(certificate);
  }

  // --- Revocation ----------------------------------------------------------

  async findRevocationByCertificateId(certificateId) {
    return this.clone(
      this.revocations.find((row) => row.certificateId === certificateId) ??
        null,
    );
  }

  /**
   * Mirrors the transaction in the Prisma repository: the evidence row and the
   * status move are committed together, and the returned certificate already
   * carries its revocation details.
   */
  async revoke(data) {
    const certificate = this.certificates.find(
      (row) => row.id === data.certificateId,
    );
    const revocation = {
      id: `revocation-${++this.revocationSequence}`,
      certificateId: data.certificateId,
      reason: data.reason,
      revokedByUserId: data.revokedByUserId ?? null,
      revokedAt: data.revokedAt ?? new Date(),
      createdAt: new Date(),
    };
    this.revocations.push(revocation);

    certificate.status = 'REVOKED';
    certificate.revokedReason = revocation.reason;
    certificate.revokedAt = revocation.revokedAt;
    certificate.revokedByUserId = revocation.revokedByUserId;
    certificate.updatedAt = new Date();

    return this.clone(certificate);
  }
}

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

/** Issues one certificate and returns it, so each test starts from a real document. */
async function issueOne(service, decisionId = 'decision-1') {
  const template = await service.createTemplate(
    { code: 'DIPLOMA', name: 'Ijazah' },
    'user-1',
  );
  await service.changeTemplateStatus(template.id, { status: 'ACTIVE' }, 'u');
  return service.issueCertificate({ decisionId, templateId: template.id }, 'u');
}

// --- Rules -----------------------------------------------------------------

test('only an ISSUED certificate can be revoked', () => {
  assert.equal(canRevokeCertificate('ISSUED'), true);
  // REVOKED is terminal: there is no un-revoke, so a second withdrawal is
  // refused rather than silently accepted.
  assert.equal(canRevokeCertificate('REVOKED'), false);

  assert.match(describeRevocationBlocker('REVOKED'), /already been revoked/i);
});

test('a revocation reason must be present and substantive', () => {
  assert.equal(REVOCATION_REASON_MIN_LENGTH, 8);
  assert.equal(isRevocationReasonAcceptable('Issued in error'), true);
  assert.equal(isRevocationReasonAcceptable('        '), false);
  assert.equal(isRevocationReasonAcceptable(''), false);
  assert.equal(isRevocationReasonAcceptable('short'), false);

  assert.match(describeRevocationReasonBlocker(''), /required/i);
  assert.match(describeRevocationReasonBlocker('short'), /at least 8/i);
});

// --- Revocation workflow ---------------------------------------------------

test('revoking an issued certificate withdraws it and records the evidence', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service, repository, audit } = buildService({ decisions });
  const certificate = await issueOne(service);

  assert.equal(certificate.status, 'ISSUED');

  const revoked = await service.revokeCertificate(
    certificate.id,
    { reason: 'Issued against a decision that was later corrected' },
    'user-9',
  );

  assert.equal(revoked.status, 'REVOKED');
  assert.equal(
    revoked.revokedReason,
    'Issued against a decision that was later corrected',
  );
  assert.ok(revoked.revokedAt instanceof Date);
  assert.equal(revoked.revokedByUserId, 'user-9');

  // The evidence row exists and is linked to the certificate.
  const evidence = await repository.findRevocationByCertificateId(
    certificate.id,
  );
  assert.equal(evidence.certificateId, certificate.id);
  assert.equal(
    evidence.reason,
    'Issued against a decision that was later corrected',
  );
  assert.equal(evidence.revokedByUserId, 'user-9');

  const entry = audit.entries.find(
    (item) => item.action === 'certificate.revoked',
  );
  assert.ok(entry, 'revocation must be audited');
  assert.equal(entry.resourceType, 'certificate');
  assert.equal(entry.resourceId, certificate.id);
  assert.equal(entry.before.status, 'ISSUED');
  assert.equal(entry.after.status, 'REVOKED');
  // The reason is in the trail too, so the withdrawal is explicable without
  // joining the domain table.
  assert.equal(
    entry.metadata.reason,
    'Issued against a decision that was later corrected',
  );
});

test('revocation preserves the certificate record instead of deleting it', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service, repository } = buildService({ decisions });
  const certificate = await issueOne(service);

  await service.revokeCertificate(
    certificate.id,
    { reason: 'Withdrawn by the institution' },
    'user-9',
  );

  // The row is still there, with its number and its holder intact: an
  // institution must be able to prove the document was once legitimately issued,
  // because the holder may still be presenting the printed copy.
  const stillThere = await repository.findById(certificate.id);
  assert.ok(stillThere);
  assert.equal(stillThere.certificateNumber, certificate.certificateNumber);
  assert.equal(stillThere.holderFullName, 'Bripda Andi Saputra');
  assert.equal(stillThere.status, 'REVOKED');

  assert.equal(repository.certificates.length, 1);

  // History is preserved by construction: no hard delete exists anywhere.
  assert.equal(typeof repository.delete, 'undefined');
  assert.equal(typeof repository.deleteCertificate, 'undefined');
  assert.equal(typeof repository.deleteRevocation, 'undefined');
});

test('a certificate cannot be revoked twice and the first reason stands', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service, repository, audit } = buildService({ decisions });
  const certificate = await issueOne(service);

  await service.revokeCertificate(
    certificate.id,
    { reason: 'Original withdrawal reason' },
    'user-9',
  );

  await assert.rejects(
    () =>
      service.revokeCertificate(
        certificate.id,
        { reason: 'A second, different reason' },
        'user-10',
      ),
    /already been revoked/i,
  );

  // Exactly one evidence row, holding the first reason. Re-revoking must not
  // append a competing account of why the document was withdrawn.
  assert.equal(repository.revocations.length, 1);
  const evidence = await repository.findRevocationByCertificateId(
    certificate.id,
  );
  assert.equal(evidence.reason, 'Original withdrawal reason');
  assert.equal(evidence.revokedByUserId, 'user-9');

  assert.equal(
    audit.entries.filter((entry) => entry.action === 'certificate.revoked')
      .length,
    1,
  );
});

test('revocation refuses an empty or trivial reason', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service, repository } = buildService({ decisions });
  const certificate = await issueOne(service);

  await assert.rejects(
    () => service.revokeCertificate(certificate.id, { reason: '' }, 'u'),
    /required/i,
  );
  await assert.rejects(
    () => service.revokeCertificate(certificate.id, { reason: '   ' }, 'u'),
    /required/i,
  );
  await assert.rejects(
    () => service.revokeCertificate(certificate.id, { reason: 'short' }, 'u'),
    /at least 8/i,
  );

  // A refused attempt must leave nothing behind.
  assert.equal(repository.revocations.length, 0);
  const unchanged = await repository.findById(certificate.id);
  assert.equal(unchanged.status, 'ISSUED');
});

test('revoking an unknown certificate is a not-found, not a silent success', async () => {
  const { service } = buildService({ decisions: new Map() });
  await assert.rejects(
    () =>
      service.revokeCertificate(
        'certificate-missing',
        { reason: 'No such certificate' },
        'u',
      ),
    /not found/i,
  );
});

test('revocation defaults the actor to the caller when none is supplied', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service, repository } = buildService({ decisions });
  const certificate = await issueOne(service);

  const revoked = await service.revokeCertificate(
    certificate.id,
    { reason: 'Withdrawn without an explicit actor' },
    'user-actor',
  );

  assert.equal(revoked.revokedByUserId, 'user-actor');
  const evidence = await repository.findRevocationByCertificateId(
    certificate.id,
  );
  assert.equal(evidence.revokedByUserId, 'user-actor');
});

test('an explicit revoking user overrides the caller', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service, repository } = buildService({ decisions });
  const certificate = await issueOne(service);

  const revoked = await service.revokeCertificate(
    certificate.id,
    { reason: 'Withdrawn by a supervisor', revokedByUserId: 'user-supervisor' },
    'user-actor',
  );

  assert.equal(revoked.revokedByUserId, 'user-supervisor');
  const evidence = await repository.findRevocationByCertificateId(
    certificate.id,
  );
  assert.equal(evidence.revokedByUserId, 'user-supervisor');
});

// --- Public verification reflects revocation -------------------------------

test('public verification reports a revoked certificate as invalid with the reason', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service } = buildService({ decisions });
  const certificate = await issueOne(service);

  const before = await service.verifyByCode(certificate.verificationCode);
  assert.equal(before.valid, true);
  assert.equal(before.status, 'ISSUED');
  assert.equal(before.revokedReason, undefined);

  await service.revokeCertificate(
    certificate.id,
    { reason: 'Withdrawn after an administrative review' },
    'user-9',
  );

  const after = await service.verifyByCode(certificate.verificationCode);
  assert.equal(after.valid, false);
  assert.equal(after.status, 'REVOKED');
  assert.equal(after.revokedReason, 'Withdrawn after an administrative review');
  assert.ok(after.revokedAt);
  // The holder and document identity are unchanged: the certificate is not
  // erased, it is marked as no longer valid.
  assert.equal(after.certificateNumber, certificate.certificateNumber);
  assert.equal(after.holderName, 'Bripda Andi Saputra');
});

test('the revoked public projection still leaks no identifier or contact detail', () => {
  const projection = toPublicProjection({
    status: 'REVOKED',
    certificateNumber: 'CERT-2026-ABCDEFGHJK',
    issuedAt: new Date('2026-09-01T00:00:00.000Z'),
    holderFullName: 'Bripda Andi Saputra',
    educationProgramName: 'Dikbang SPN',
    educationBatchName: 'Angkatan 42',
    templateName: 'Ijazah',
    templateVersion: 1,
    revokedReason: 'Withdrawn after an administrative review',
    revokedAt: new Date('2026-10-01T00:00:00.000Z'),
    revokedByUserId: 'user-9',
  });

  const serialized = JSON.stringify(projection);
  for (const forbidden of [
    'user-9',
    'revokedByUserId',
    'personnelNumber',
    'email',
    'phone',
    'enrollmentId',
    'decisionId',
    'verificationCode',
    'objectKey',
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false,
      `public projection must not contain ${forbidden}`,
    );
  }
});

// --- Interaction with issuance ---------------------------------------------

test('a revoked certificate still blocks re-issuance for the same decision', async () => {
  const decisions = new Map([['decision-1', eligibleDecision()]]);
  const { service } = buildService({ decisions });
  const certificate = await issueOne(service);
  await service.revokeCertificate(
    certificate.id,
    { reason: 'Withdrawn pending a new decision' },
    'user-9',
  );

  // The decision already produced a certificate, and that certificate still
  // exists. Reinstating a wrongly withdrawn document is a new decision and a new
  // number, so that both the withdrawal and the correction stay visible.
  await assert.rejects(
    () =>
      service.issueCertificate(
        { decisionId: 'decision-1', templateId: certificate.templateId },
        'u',
      ),
    new RegExp(certificate.certificateNumber),
  );
});
