const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../dist/app');
const { HealthService } = require('../dist/health/health.service');
test('health service reports process liveness', () => {
  assert.deepEqual(new HealthService().check(), { status: 'ok' });
});
test('versioned health and Swagger are served over HTTP', async () => {
  const app = await createApp();
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const res = await fetch(`${base}/api/v1/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
    assert.equal((await fetch(`${base}/health`)).status, 404);
    assert.equal((await fetch(`${base}/api/v1/docs`)).status, 200);
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/health'].get);
  } finally {
    await app.close();
  }
});
