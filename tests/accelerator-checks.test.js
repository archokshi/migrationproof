import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkAccelerator } from '../src/accelerator-checks.js';

test('source gates accept the constrained TPU patch and reject a pooling regression or fake comment', async () => {
  const source = await readFile('fixtures/supportsearch/encoder.py', 'utf8');
  const runtime = JSON.parse(await readFile('fixtures/supportsearch/runtime.json', 'utf8'));
  const artifacts = { 'encoder.py': source.replace('import torch\n', 'import torch\nimport torch_tpu\n').replace('DEVICE = "cuda"', 'DEVICE = "tpu"').replace('BATCH_SIZE = 8', 'BATCH_SIZE = 16'), 'runtime.json': JSON.stringify({ ...runtime, device: 'tpu', batch_size: 16 }) };
  assert.ok((await checkAccelerator(artifacts, 16)).every(c => c.passed));
  const corrupted = { ...artifacts, 'encoder.py': artifacts['encoder.py'].replace('p=2', 'p=1') };
  assert.ok((await checkAccelerator(corrupted, 16)).some(c => !c.passed && c.name.includes('normalize_vectors')));
  const fake = { ...artifacts, 'encoder.py': source + '\n# DEVICE = "tpu"\n# import torch_tpu' };
  assert.ok((await checkAccelerator(fake, 16)).some(c => !c.passed && c.name.includes('device')));
});
