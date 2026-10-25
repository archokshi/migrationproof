import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

test('API exposes a real seeded mismatch and custom probe', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const health = await (await fetch(base + '/api/health')).json();
    assert.equal(health.model, 'gemini-4-argon');
    assert.equal('apiKey' in health, false);
    const source = await (await fetch(base + '/api/accelerator/input')).json();
    assert.match(source['encoder.py'], /DEVICE = "cuda"/);
    const badBatch = await fetch(base + '/api/accelerator/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ batchSize: 999 }) });
    assert.equal(badBatch.status, 400);
    const staleRepair = await fetch(base + '/api/accelerator/challenge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expectedRunId: 'not-the-current-run' }) });
    assert.equal(staleRepair.status, 409);
    const createdResponse = await fetch(base + '/api/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'seeded' }) });
    assert.equal(createdResponse.status, 202);
    const created = await createdResponse.json();
    let run = created;
    for (let count = 0; count < 60 && ['queued', 'running'].includes(run.status); count++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      run = await (await fetch(base + '/api/runs/' + created.id)).json();
    }
    assert.equal(run.status, 'mismatch');
    assert.equal(run.result.passed, 14);
    assert.equal(run.result.failed, 1);
    assert.equal(run.result.cases.find(item => item.id === 'leading-zero').difference.path, 'output.value[0].id');
    const probe = await (await fetch(base + '/api/runs/' + created.id + '/probe', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: 'id,name,quantity,description\n0009,Widget,1,ok\n' })
    })).json();
    assert.equal(probe.match, false);
    assert.equal(probe.expected.value[0].id, '0009');
    assert.equal(probe.actual.value[0].id, '9');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
