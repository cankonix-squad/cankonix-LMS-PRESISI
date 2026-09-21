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

test('question bank client targets versioned endpoints and sends auth', async () => {
  const seen = [];
  const { server, url } = await listen(async (request, response) => {
    seen.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
    });
    response.setHeader('content-type', 'application/json');
    if (request.method === 'GET') {
      response.end(JSON.stringify({ data: [], total: 0, page: 1, limit: 50 }));
      return;
    }
    // Drain the request body before answering so the connection can be reused.
    request.resume();
    await new Promise((resolve) => request.on('end', resolve));
    response.end(JSON.stringify({ id: 'q1' }));
  });

  const client = createApiClient(url, {
    getAccessToken: () => 'token-123',
  });

  try {
    await client.questionBanks.list({ limit: 25, search: 'TWK' });
    assert.equal(
      seen[0].url,
      '/api/v1/question-banks?page=1&limit=25&search=TWK',
    );

    await client.questionBanks.listQuestions('bank-1', { page: 2 });
    assert.equal(
      seen[1].url,
      '/api/v1/question-banks/bank-1/questions?page=2&limit=50',
    );

    await client.questionTypes.list();
    assert.equal(seen[2].url, '/api/v1/question-types?page=1&limit=50');

    await client.questionBanks.createQuestion('bank-1', {
      questionTypeId: 'type-1',
      stem: 'Ibu kota Indonesia?',
      maxScore: 1,
    });
    assert.equal(seen[3].method, 'POST');
    assert.equal(seen[3].url, '/api/v1/question-banks/bank-1/questions');
    assert.equal(seen[3].authorization, 'Bearer token-123');
  } finally {
    server.close();
  }
});

test('blueprint save posts the whole rule set to the exam blueprint endpoint', async () => {
  let captured = null;
  const { server, url } = await listen(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    captured = {
      url: request.url,
      method: request.method,
      body: JSON.parse(body),
    };
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ id: 'bp-1', title: null, rules: [] }));
  });

  try {
    await createApiClient(url).exams.saveBlueprint('exam-1', {
      title: 'Blueprint',
      rules: [{ code: 'R1', count: 5, pointsPerQuestion: 2 }],
    });
    assert.equal(captured.url, '/api/v1/exams/exam-1/blueprint');
    assert.equal(captured.method, 'POST');
    assert.deepEqual(captured.body.rules, [
      { code: 'R1', count: 5, pointsPerQuestion: 2 },
    ]);
  } finally {
    server.close();
  }
});

test('a rejected mutation is reported instead of thrown', async () => {
  const { server, url } = await listen(async (_request, response) => {
    response.statusCode = 422;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({ message: 'Insufficient question pool for rule R1' }),
    );
  });

  try {
    const result = await createApiClient(url).exams.changeStatus(
      'exam-1',
      'VALIDATED',
    );
    assert.equal(result.ok, false);
    assert.match(result.message, /Insufficient question pool/);
  } finally {
    server.close();
  }
});

test('attempt client targets the participant runtime endpoints', async () => {
  const seen = [];
  const { server, url } = await listen(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    seen.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      body: body ? JSON.parse(body) : null,
    });
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        id: 'a1',
        status: 'IN_PROGRESS',
        score: null,
        questions: [],
      }),
    );
  });

  const client = createApiClient(url, { getAccessToken: () => 'token-123' });

  try {
    await client.attempts.start({ participantId: 'p1' });
    assert.equal(seen[0].method, 'POST');
    assert.equal(seen[0].url, '/api/v1/attempts');
    assert.deepEqual(seen[0].body, { participantId: 'p1' });

    await client.attempts.get('a1');
    assert.equal(seen[1].method, 'GET');
    assert.equal(seen[1].url, '/api/v1/attempts/a1');

    await client.attempts.saveAnswer('a1', 'q1', {
      answerPayload: { keys: ['A'] },
      revision: 2,
    });
    assert.equal(seen[2].method, 'PUT');
    assert.equal(seen[2].url, '/api/v1/attempts/a1/questions/q1/answer');
    assert.deepEqual(seen[2].body, {
      answerPayload: { keys: ['A'] },
      revision: 2,
    });
    assert.equal(seen[2].authorization, 'Bearer token-123');

    await client.attempts.submit('a1');
    assert.equal(seen[3].method, 'POST');
    assert.equal(seen[3].url, '/api/v1/attempts/a1/submit');
  } finally {
    server.close();
  }
});
