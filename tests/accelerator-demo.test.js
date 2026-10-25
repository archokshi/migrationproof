import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceDemo } from '../web/accelerator-model.js';

test('the demo cannot switch traffic while its quality gate is failing', () => {
  assert.deepEqual(advanceDemo(4, true, false), { stage: 4, playing: false, blocked: true });
  assert.deepEqual(advanceDemo(4, true, true), { stage: 5, playing: false, blocked: false });
});

test('the demo advances normally and stops at the final stage', () => {
  assert.equal(advanceDemo(2, false, false).stage, 3);
  assert.deepEqual(advanceDemo(5, false, false), { stage: 5, playing: false, blocked: false });
});
