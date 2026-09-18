const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { URL } = require('node:url');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  FilesService,
  FILE_SERVICE_OPTIONS,
  DEFAULT_FILE_SERVICE_OPTIONS,
} = require('../dist/files/files.service');
const {
  buildObjectKey,
  sanitizeOriginalName,
  assertSafeObjectKey,
  isSafeObjectKey,
  belongsToNamespace,
  resolveExtension,
  MAX_ORIGINAL_NAME_LENGTH,
  FILE_NAMESPACES,
} = require('../dist/files/object-key');
const {
  S3CompatibleObjectStorage,
  uriEncode,
  formatAmzDate,
} = require('../dist/files/s3-object-storage.adapter');
const {
  loadStorageConfig,
  DEFAULT_SIGNED_URL_TTL_SECONDS,
} = require('../dist/files/storage.config');
const {
  DEFAULT_UPLOAD_POLICY,
  maxSizeForMimeType,
} = require('../dist/files/upload-policy');
const { createApp } = require('../dist/app');

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(input) {
    this.records.push(input);
    return { id: `audit-${this.records.length}` };
  }
}

const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const OTHER_OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002';

class MemoryStoredFilesRepository {
  constructor() {
    this.records = [];
    this.next = 1;
  }

  async create(data) {
    const record = {
      id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(this.next++).padStart(12, '0')}`,
      objectKey: data.objectKey,
      namespace: data.namespace,
      originalName: data.originalName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      checksum: data.checksum ?? null,
      ownerUserId: data.ownerUserId ?? null,
      status: data.status ?? 'PENDING',
      uploadedAt: null,
      createdAt: new Date('2026-09-26T00:00:00.000Z'),
      updatedAt: new Date('2026-09-26T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByObjectKey(objectKey) {
    return (
      this.records.find((record) => record.objectKey === objectKey) ?? null
    );
  }

  async list(filter) {
    let filtered = [...this.records];
    if (filter.namespace) {
      filtered = filtered.filter((r) => r.namespace === filter.namespace);
    }
    if (filter.ownerUserId) {
      filtered = filtered.filter((r) => r.ownerUserId === filter.ownerUserId);
    }
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      filtered = filtered.filter((r) =>
        r.originalName.toLowerCase().includes(needle),
      );
    }
    const start = (filter.page - 1) * filter.limit;
    return {
      data: filtered.slice(start, start + filter.limit),
      total: filtered.length,
    };
  }

  async update(id, data) {
    const index = this.records.findIndex((record) => record.id === id);
    this.records[index] = {
      ...this.records[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.records[index];
  }

  async countByNamespace(namespace) {
    return this.records.filter(
      (r) => r.namespace === namespace && r.status !== 'ARCHIVED',
    ).length;
  }
}

/**
 * Mocked storage. Records every presign request so tests can assert the
 * authorization boundary and the "never sign without a policy check" rule, and
 * can be flipped to "existence unconfirmable" to prove a client cannot talk its
 * way past the completion step.
 */
class MockObjectStorage {
  constructor({
    confirmExistence = true,
    sizeBytes = null,
    contentType = null,
  } = {}) {
    this.confirmExistence = confirmExistence;
    this.sizeBytes = sizeBytes;
    this.contentType = contentType;
    this.uploadRequests = [];
    this.downloadRequests = [];
    this.removed = [];
  }

  async createUploadUrl(input) {
    this.uploadRequests.push(input);
    return {
      url: `https://storage.local/${input.objectKey}?sig=upload`,
      method: 'PUT',
      expiresInSeconds:
        input.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS,
      objectKey: input.objectKey,
      headers: { 'Content-Type': input.mimeType },
    };
  }

  async createDownloadUrl(input) {
    this.downloadRequests.push(input);
    return {
      url: `https://storage.local/${input.objectKey}?sig=download`,
      method: 'GET',
      expiresInSeconds:
        input.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS,
      objectKey: input.objectKey,
      headers: {},
    };
  }

  async headObject() {
    if (!this.confirmExistence) {
      return null;
    }
    return {
      sizeBytes: this.sizeBytes,
      contentType: this.contentType,
      checksum: null,
    };
  }

  async removeObject(objectKey) {
    this.removed.push(objectKey);
  }
}

function build(storageOptions) {
  const repo = new MemoryStoredFilesRepository();
  const storage = new MockObjectStorage(storageOptions);
  const audit = new FakeAuditService();
  const service = new FilesService(
    repo,
    storage,
    DEFAULT_UPLOAD_POLICY,
    audit,
    {
      downloadUrlTtlSeconds: DEFAULT_SIGNED_URL_TTL_SECONDS,
    },
  );
  return { repo, storage, audit, service };
}

test('object keys are server-generated and ignore the client filename', () => {
  const key = buildObjectKey({
    namespace: FILE_NAMESPACES.LEARNING_CONTENT,
    ownerUserId: OWNER,
    originalName: '../../etc/passwd',
    mimeType: 'application/pdf',
    now: new Date('2026-09-26T10:20:30.000Z'),
    id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(
    key,
    'learning-content/aaaaaaaa-aaaa-4aaa-8aaa-000000000001/2026/09/11111111-1111-4111-8111-111111111111.pdf',
  );
  assert.equal(key.includes('etc'), false);
  assert.equal(key.includes('passwd'), false);
  assert.equal(isSafeObjectKey(key), true);

  // A traversal filename cannot escape the namespace prefix.
  assert.equal(belongsToNamespace(key, FILE_NAMESPACES.LEARNING_CONTENT), true);

  // Unknown namespaces are refused: they are a code-owned vocabulary.
  assert.throws(() =>
    buildObjectKey({
      namespace: '../../evil',
      mimeType: 'application/pdf',
    }),
  );

  // Extension comes from the whitelisted MIME type, not the client name.
  assert.equal(resolveExtension('application/pdf', 'laporan.exe'), 'pdf');
  // Unknown MIME + unsafe extension -> no extension at all.
  assert.equal(
    resolveExtension('application/x-unknown', 'evil.sh/../../'),
    null,
  );
  // Unknown MIME + safe extension -> allowed.
  assert.equal(resolveExtension('application/x-unknown', 'data.csv'), 'csv');
});

test('client filenames are sanitized to display metadata only', () => {
  assert.equal(sanitizeOriginalName('../../etc/passwd'), 'passwd');
  assert.equal(
    sanitizeOriginalName('C:\\Users\\x\\Modul 1.pdf'),
    'Modul 1.pdf',
  );
  assert.equal(sanitizeOriginalName('....'), 'unnamed');
  assert.equal(sanitizeOriginalName('   '), 'unnamed');
  assert.equal(sanitizeOriginalName(''), 'unnamed');
  // Control characters and bidi overrides are stripped.
  assert.equal(sanitizeOriginalName('modul\u0000\u202e1.pdf'), 'modul1.pdf');

  const long = `${'a'.repeat(400)}.pdf`;
  const sanitized = sanitizeOriginalName(long);
  assert.equal(sanitized.length, MAX_ORIGINAL_NAME_LENGTH);
  assert.equal(sanitized.endsWith('.pdf'), true);
});

test('object key validation rejects traversal and malformed keys', () => {
  assert.equal(
    assertSafeObjectKey('ns/owner/2026/09/file.pdf'),
    'ns/owner/2026/09/file.pdf',
  );

  for (const bad of [
    '',
    '/absolute/path.pdf',
    'ns/',
    'ns//file.pdf',
    'ns/../secret.pdf',
    'ns\\file.pdf',
    'ns/./file.pdf',
    'file.pdf',
    `ns/${'a'.repeat(600)}.pdf`,
    'ns/file name.pdf',
  ]) {
    assert.equal(
      isSafeObjectKey(bad),
      false,
      `expected ${JSON.stringify(bad)} to be rejected`,
    );
  }
});

test('upload initiation enforces the configurable whitelist before signing', async () => {
  const ctx = build();

  const initiated = await ctx.service.initiateUpload(OWNER, {
    namespace: 'learning-content',
    originalName: '../../Modul 1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
  });

  assert.equal(initiated.file.status, 'PENDING');
  assert.equal(initiated.file.originalName, 'Modul 1.pdf');
  assert.equal(initiated.file.mimeType, 'application/pdf');
  assert.equal(initiated.upload.method, 'PUT');
  assert.equal(initiated.upload.headers['Content-Type'], 'application/pdf');
  assert.equal(ctx.audit.records.at(-1).action, 'stored_file.upload_initiated');

  // Metadata is stored; no binary column and no client-controlled key segment.
  const stored = await ctx.repo.findById(initiated.file.id);
  assert.equal(Object.keys(stored).includes('data'), false);
  assert.equal(stored.objectKey.includes('..'), false);
  assert.equal(stored.objectKey.startsWith('learning-content/'), true);

  // A size above the per-type limit is refused.
  await assert.rejects(
    () =>
      ctx.service.initiateUpload(OWNER, {
        namespace: 'learning-content',
        originalName: 'Modul 2.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100 * 1024 * 1024,
      }),
    BadRequestException,
  );

  // A type outside the whitelist is refused (no default ceiling configured).
  await assert.rejects(
    () =>
      ctx.service.initiateUpload(OWNER, {
        namespace: 'learning-content',
        originalName: 'payload.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 1024,
      }),
    UnprocessableEntityException,
  );

  // Nothing was signed for the refused requests.
  assert.equal(ctx.storage.uploadRequests.length, 1);

  // The active policy is discoverable so a client can pre-validate.
  const policy = ctx.service.getUploadPolicy();
  assert.equal(
    policy.entries.find((e) => e.mimeType === 'application/pdf').maxSizeBytes,
    maxSizeForMimeType(DEFAULT_UPLOAD_POLICY, 'application/pdf'),
  );
});

test('upload completion is never taken on trust', async () => {
  const unconfirmed = build({ confirmExistence: false });
  const pending = await unconfirmed.service.initiateUpload(OWNER, {
    namespace: 'learning-content',
    originalName: 'Modul 1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
  });

  await assert.rejects(
    () =>
      unconfirmed.service.completeUpload(pending.file.id, { sizeBytes: 2048 }),
    UnprocessableEntityException,
  );
  const stillPending = await unconfirmed.repo.findById(pending.file.id);
  assert.equal(stillPending.status, 'PENDING');
  assert.equal(stillPending.uploadedAt, null);

  // A confirmed object that disagrees with the declaration is rejected.
  const mismatch = build({
    confirmExistence: true,
    sizeBytes: 999,
    contentType: 'application/pdf',
  });
  const record = await mismatch.service.initiateUpload(OWNER, {
    namespace: 'learning-content',
    originalName: 'Modul 1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
  });
  await assert.rejects(
    () => mismatch.service.completeUpload(record.file.id, { sizeBytes: 2048 }),
    ConflictException,
  );

  const wrongType = build({
    confirmExistence: true,
    sizeBytes: 2048,
    contentType: 'text/html',
  });
  const record2 = await wrongType.service.initiateUpload(OWNER, {
    namespace: 'learning-content',
    originalName: 'Modul 1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
  });
  await assert.rejects(
    () =>
      wrongType.service.completeUpload(record2.file.id, { sizeBytes: 2048 }),
    ConflictException,
  );

  // A clean confirmation marks the file UPLOADED.
  const ok = build({
    confirmExistence: true,
    sizeBytes: 2048,
    contentType: 'application/pdf',
  });
  const record3 = await ok.service.initiateUpload(OWNER, {
    namespace: 'learning-content',
    originalName: 'Modul 1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
  });
  const completed = await ok.service.completeUpload(record3.file.id, {
    sizeBytes: 2048,
    checksum: 'abc123',
  });
  assert.equal(completed.status, 'UPLOADED');
  assert.equal(completed.checksum, 'abc123');
  assert.ok(completed.uploadedAt);
  assert.equal(ok.audit.records.at(-1).action, 'stored_file.upload_completed');
  assert.equal(ok.audit.records.at(-1).metadata.verifiedAgainstStorage, true);

  // Completing twice is refused.
  await assert.rejects(
    () => ok.service.completeUpload(record3.file.id, {}),
    UnprocessableEntityException,
  );
});

test('download URLs are refused for unconfirmed files and audited when issued', async () => {
  const ctx = build({
    confirmExistence: true,
    sizeBytes: 2048,
    contentType: 'application/pdf',
  });

  const pending = await ctx.service.initiateUpload(OWNER, {
    namespace: 'learning-content',
    originalName: 'Modul 1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
  });

  // A PENDING file has no confirmed object, so no capability may be minted.
  await assert.rejects(
    () => ctx.service.createDownloadUrl(pending.file.id, OWNER),
    UnprocessableEntityException,
  );
  assert.equal(ctx.storage.downloadRequests.length, 0);

  await ctx.service.completeUpload(pending.file.id, {});
  const download = await ctx.service.createDownloadUrl(pending.file.id, OWNER);
  assert.equal(download.download.method, 'GET');
  assert.equal(ctx.storage.downloadRequests.length, 1);
  assert.equal(
    ctx.audit.records.at(-1).action,
    'stored_file.download_url_issued',
  );
  assert.equal(ctx.audit.records.at(-1).metadata.requestedByUserId, OWNER);

  await assert.rejects(
    () =>
      ctx.service.createDownloadUrl(
        '99999999-9999-4999-8999-999999999999',
        OWNER,
      ),
    NotFoundException,
  );
});

test('file lifecycle is archivable but never hard-deleted, and lists are filterable', async () => {
  const ctx = build({
    confirmExistence: true,
    sizeBytes: 1024,
    contentType: 'application/pdf',
  });

  const first = await ctx.service.initiateUpload(OWNER, {
    namespace: 'learning-content',
    originalName: 'Modul 1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
  });
  const second = await ctx.service.initiateUpload(OTHER_OWNER, {
    namespace: 'person-avatar',
    originalName: 'Foto.png',
    mimeType: 'image/png',
    sizeBytes: 512,
  });

  await ctx.service.completeUpload(first.file.id, {});

  const activated = await ctx.service.activate(first.file.id);
  assert.equal(activated.status, 'ACTIVE');
  assert.equal(ctx.audit.records.at(-1).action, 'stored_file.status_changed');

  // PENDING cannot jump straight to ACTIVE.
  await assert.rejects(
    () => ctx.service.activate(second.file.id),
    UnprocessableEntityException,
  );

  const archived = await ctx.service.archive(first.file.id);
  assert.equal(archived.status, 'ARCHIVED');
  assert.equal(ctx.audit.records.at(-1).action, 'stored_file.archived');
  // The row survives: nothing is hard-deleted over the API.
  assert.equal(
    await ctx.repo.findById(first.file.id).then((r) => r.status),
    'ARCHIVED',
  );
  assert.equal(ctx.storage.removed.length, 0);

  // ARCHIVED is terminal.
  await assert.rejects(
    () => ctx.service.activate(first.file.id),
    UnprocessableEntityException,
  );
  await assert.rejects(
    () => ctx.service.archive(first.file.id),
    UnprocessableEntityException,
  );
  await assert.rejects(
    () => ctx.service.createDownloadUrl(first.file.id, OWNER),
    UnprocessableEntityException,
  );

  const byOwner = await ctx.service.list({ ownerUserId: OTHER_OWNER });
  assert.equal(byOwner.total, 1);
  assert.equal(byOwner.data[0].mimeType, 'image/png');

  const byNamespace = await ctx.service.list({ namespace: 'person-avatar' });
  assert.equal(byNamespace.total, 1);

  const byStatus = await ctx.service.list({ status: 'ARCHIVED' });
  assert.equal(byStatus.total, 1);

  const bySearch = await ctx.service.list({ search: 'modul' });
  assert.equal(bySearch.total, 1);
  assert.equal(bySearch.page, 1);
});

test('storage configuration fails closed when incomplete', () => {
  const missing = loadStorageConfig({});
  assert.equal(missing.config, null);
  assert.ok(missing.errors.length > 0);

  const required = loadStorageConfig({ STORAGE_REQUIRED: 'true' });
  assert.equal(required.config, null);
  assert.ok(
    required.errors.some((error) =>
      error.includes('required but not configured'),
    ),
  );

  const badTtl = loadStorageConfig({
    STORAGE_ENDPOINT: 'http://localhost:9000',
    STORAGE_BUCKET: 'lms',
    STORAGE_ACCESS_KEY_ID: 'key',
    STORAGE_SECRET_ACCESS_KEY: 'secret',
    STORAGE_SIGNED_URL_TTL_SECONDS: '5',
  });
  assert.equal(badTtl.config, null);

  const badEndpoint = loadStorageConfig({
    STORAGE_ENDPOINT: 'ftp://localhost',
    STORAGE_BUCKET: 'lms',
    STORAGE_ACCESS_KEY_ID: 'key',
    STORAGE_SECRET_ACCESS_KEY: 'secret',
  });
  assert.equal(badEndpoint.config, null);

  const good = loadStorageConfig({
    STORAGE_ENDPOINT: 'http://localhost:9000/',
    STORAGE_BUCKET: 'lms',
    STORAGE_ACCESS_KEY_ID: 'key',
    STORAGE_SECRET_ACCESS_KEY: 'secret',
  });
  assert.ok(good.config);
  assert.equal(good.config.region, 'us-east-1');
  assert.equal(good.config.forcePathStyle, true);
  assert.equal(good.config.signedUrlTtlSeconds, DEFAULT_SIGNED_URL_TTL_SECONDS);

  // The DI tokens must stay symbols and the bound defaults must agree with the
  // adapter defaults: a plain-object constructor param would be resolved as a
  // Nest dependency and break module boot.
  assert.equal(typeof FILE_SERVICE_OPTIONS, 'symbol');
  assert.equal(
    DEFAULT_FILE_SERVICE_OPTIONS.downloadUrlTtlSeconds,
    DEFAULT_SIGNED_URL_TTL_SECONDS,
  );
});

test('presigned URLs follow the SigV4 query-signing specification', async () => {
  const config = {
    endpoint: 'http://localhost:9000',
    region: 'us-east-1',
    bucket: 'lms-files',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    signedUrlTtlSeconds: DEFAULT_SIGNED_URL_TTL_SECONDS,
    forcePathStyle: true,
  };

  const fixedClock = () => new Date('2026-09-26T10:20:30.000Z');
  const storage = new S3CompatibleObjectStorage(config, fixedClock);

  const key =
    'learning-content/aaaaaaaa-aaaa-4aaa-8aaa-000000000001/2026/09/file.pdf';

  // Recompute the signature independently and compare: this is what makes the
  // offline adapter verifiable without a live bucket.
  const amzDate = formatAmzDate(fixedClock());
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/us-east-1/s3/aws4_request`;

  const canonicalQuery = [
    `X-Amz-Algorithm=${uriEncode('AWS4-HMAC-SHA256')}`,
    `X-Amz-Credential=${uriEncode(`AKIAIOSFODNN7EXAMPLE/${scope}`)}`,
    `X-Amz-Date=${uriEncode(amzDate)}`,
    `X-Amz-Expires=${uriEncode(String(DEFAULT_SIGNED_URL_TTL_SECONDS))}`,
    `X-Amz-SignedHeaders=${uriEncode('host')}`,
  ]
    .sort((a, b) => (a.split('=')[0] < b.split('=')[0] ? -1 : 1))
    .join('&');

  const canonicalUri = `/lms-files/${key}`;
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    'host:localhost:9000\n',
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const hmac = (k, v) =>
    require('node:crypto').createHmac('sha256', k).update(v, 'utf8').digest();
  const kDate = hmac(Buffer.from(`AWS4${config.secretAccessKey}`), dateStamp);
  const kRegion = hmac(kDate, 'us-east-1');
  const kService = hmac(kRegion, 's3');
  const signingKey = hmac(kService, 'aws4_request');
  const expectedSignature = require('node:crypto')
    .createHmac('sha256', signingKey)
    .update(
      [
        'AWS4-HMAC-SHA256',
        amzDate,
        scope,
        createHash('sha256').update(canonicalRequest, 'utf8').digest('hex'),
      ].join('\n'),
      'utf8',
    )
    .digest('hex');

  const upload = await storage.createUploadUrl({
    objectKey: key,
    mimeType: 'application/pdf',
  });

  const url = new URL(upload.url);
  assert.equal(url.host, 'localhost:9000');
  assert.equal(url.pathname, canonicalUri);
  assert.equal(url.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256');
  assert.equal(
    url.searchParams.get('X-Amz-Credential'),
    `AKIAIOSFODNN7EXAMPLE/${scope}`,
  );
  assert.equal(url.searchParams.get('X-Amz-Date'), amzDate);
  assert.equal(
    url.searchParams.get('X-Amz-Expires'),
    String(DEFAULT_SIGNED_URL_TTL_SECONDS),
  );
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'host');
  assert.equal(url.searchParams.get('X-Amz-Signature'), expectedSignature);

  // The expiry is overridable but bounded.
  const short = await storage.createUploadUrl({
    objectKey: key,
    mimeType: 'application/pdf',
    expiresInSeconds: 60,
  });
  assert.equal(short.expiresInSeconds, 60);
  await assert.rejects(
    () =>
      storage.createUploadUrl({
        objectKey: key,
        mimeType: 'application/pdf',
        expiresInSeconds: 0,
      }),
    /expiry/,
  );

  // Virtual-host style keeps the bucket in the host and out of the path.
  const virtualHost = new S3CompatibleObjectStorage(
    { ...config, forcePathStyle: false },
    fixedClock,
  );
  const vh = await virtualHost.createDownloadUrl({
    objectKey: key,
    responseContentDisposition: 'attachment; filename="Modul 1.pdf"',
  });
  assert.equal(new URL(vh.url).pathname, `/${key}`);
  assert.equal(
    vh.headers['Response-Content-Disposition'],
    'attachment; filename="Modul 1.pdf"',
  );

  // Confirmation is reported as unconfirmed without a live endpoint.
  assert.equal(await storage.headObject(key), null);
});

test('file endpoints are exposed in OpenAPI and require authentication', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();

    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/files/upload-policy'].get);
    assert.ok(spec.paths['/api/v1/files/uploads'].post);
    assert.ok(spec.paths['/api/v1/files'].get);
    assert.ok(spec.paths['/api/v1/files/{id}'].get);
    assert.ok(spec.paths['/api/v1/files/{id}/complete'].post);
    assert.ok(spec.paths['/api/v1/files/{id}/download-url'].get);
    assert.ok(spec.paths['/api/v1/files/{id}/activate'].patch);
    assert.ok(spec.paths['/api/v1/files/{id}/archive'].patch);

    const anonymous = await fetch(`${base}/api/v1/files`);
    assert.equal(anonymous.status, 401);

    // Unconfigured storage fails closed rather than pretending to accept bytes.
    const unauthUpload = await fetch(`${base}/api/v1/files/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namespace: 'learning-content',
        originalName: 'x.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
      }),
    });
    assert.equal(unauthUpload.status, 401);
  } finally {
    await app.close();
  }
});
