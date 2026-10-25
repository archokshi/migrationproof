import test from 'node:test';
import assert from 'node:assert/strict';
import { runProgram, comparePrograms } from '../src/verifier.js';
import { corpus } from '../src/corpus.js';

const legacy = new URL('../fixtures/inventory-legacy/cli.cjs', import.meta.url);
const seeded = new URL('../fixtures/seeded-regression/cli.cjs', import.meta.url);

test('legacy preserves opaque IDs and quoted CSV', async () => {
  const output = await runProgram(legacy, 'id,name,quantity,description\n00127,"Nuts, bolts",0,"He said ""hi"""\n');
  assert.equal(output.exitCode, 0);
  assert.deepEqual(output.value, [{ id: '00127', name: 'Nuts, bolts', quantity: 0, description: 'He said "hi"' }]);
});

test('frozen corpus detects a seeded leading-zero regression', async () => {
  const result = await comparePrograms(legacy, seeded, corpus);
  assert.ok(result.cases.length >= 10);
  assert.ok(result.failed > 0);
  assert.ok(result.cases.some(item => item.id === 'leading-zero' && item.status === 'mismatch'));
});

test('same implementation passes all baseline cases', async () => {
  const result = await comparePrograms(legacy, legacy, corpus);
  assert.equal(result.failed, 0);
  assert.equal(result.passed, corpus.length);
});
