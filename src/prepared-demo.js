import { readFile } from 'node:fs/promises';
import { verifiedCandidate, verifiedRepair, repairSummary } from '../web/live-demo-model.js';

// Pin the completed, paired real interactions so later live runs cannot change a recording.
const preparationId = '878192f5-cec6-4bdf-ade8-5c627eb06de4';
const repairId = '40cc6425-6f17-456a-a717-c2c4964b6389';
export async function preparedDemo() {
  const read = async id => JSON.parse(await readFile(new URL(`../fixtures/prepared-demo/${id}.json`, import.meta.url), 'utf8'));
  try {
    const initial = await read(preparationId), repair = await read(repairId);
    if (!verifiedCandidate(initial) || !verifiedRepair(repair, repairId) || repair.parentRunId !== initial.id || repairSummary(repair, initial).regressions !== 1) throw new Error('Incomplete evidence');
    return { initial, repair };
  } catch {
    throw Object.assign(new Error('The verified recording is unavailable. Use a live migration instead.'), { statusCode: 503 });
  }
}
