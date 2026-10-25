import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { runProgram } from '../src/verifier.js';

async function fixture(t, source) {
  const root = path.resolve('.runs', 'execution-tests');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(path.join(root, 'case-'));
  assert.ok(directory.startsWith(root + path.sep));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const program = path.join(directory, 'cli.cjs');
  await writeFile(program, source);
  return program;
}

test('generated programs cannot inherit credentials or read outside their allowed area', async t => {
  const target = path.resolve('package.json');
  const program = await fixture(t,
    'let denied=false;try{require("node:fs").readFileSync(' + JSON.stringify(target) + ')}catch(e){denied=e.code==="ERR_ACCESS_DENIED"}' +
    'console.log(JSON.stringify({denied,hasKey:Boolean(process.env.GEMINI_API_KEY),hasSentinel:Boolean(process.env.MIGRATIONPROOF_TEST_SECRET)}));'
  );
  process.env.MIGRATIONPROOF_TEST_SECRET = 'test-only-sentinel';
  try {
    const output = await runProgram(program, '');
    assert.deepEqual(output.value, { denied: true, hasKey: false, hasSentinel: false });
  } finally { delete process.env.MIGRATIONPROOF_TEST_SECRET; }
});

test('a nonterminating candidate is stopped by the verifier timeout', async t => {
  const program = await fixture(t, 'while(true) {}');
  const output = await runProgram(program, '', { timeoutMs: 250 });
  assert.equal(output.error, 'TIMEOUT');
  assert.equal(output.exitCode, -1);
});
