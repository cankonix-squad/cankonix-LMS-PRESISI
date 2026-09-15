const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { createApiClient } = require('../dist');

function listen(handler) {
  const server = createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        url: `http://127.0.0.1:${server.address().port}`,
      });
    });
  });
}

test('health client reads versioned health endpoint', async () => {
  const { server, url } = await listen((request, response) => {
    assert.equal(request.url, '/api/v1/health');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ status: 'ok' }));
  });

  try {
    assert.deepEqual(await createApiClient(url).health(), { status: 'ok' });
  } finally {
    server.close();
  }
});

test('health client rejects unexpected response bodies', async () => {
  const { server, url } = await listen((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ status: 'degraded' }));
  });

  try {
    await assert.rejects(
      createApiClient(`${url}/`).health(),
      /Invalid health response/,
    );
  } finally {
    server.close();
  }
});
