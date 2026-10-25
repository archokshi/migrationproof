import { randomUUID } from 'node:crypto';
import { readFile, mkdir, copyFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { corpus } from './corpus.js';
import { comparePrograms } from './verifier.js';
import { generateCandidate } from './agent.js';

const legacy = path.resolve('fixtures/inventory-legacy/cli.cjs');
const seeded = path.resolve('fixtures/seeded-regression/cli.cjs');
const runs = new Map();
const MAX_RUNS = 20;
const runRoot = path.resolve('.runs');
async function restoreRuns() {
  try {
    const directories = await readdir(runRoot, { withFileTypes: true });
    for (const entry of directories.filter(item => item.isDirectory() && /^[0-9a-f-]{36}$/.test(item.name)).slice(-MAX_RUNS)) {
      try {
        const directory = path.join(runRoot, entry.name);
        const saved = JSON.parse(await readFile(path.join(directory, 'report.json'), 'utf8'));
        const candidateProgram = saved.mode === 'seeded' ? path.join(directory, 'seeded', 'cli.cjs') : path.join(directory, 'cli.cjs');
        if (saved.status === 'running' || saved.status === 'queued') {
          saved.status = 'failed'; saved.stage = 'Interrupted'; saved.error = 'Server stopped before this run completed';
        }
        runs.set(entry.name, { ...saved, directory, candidateProgram: (await stat(candidateProgram).catch(() => null)) ? candidateProgram : null });
      } catch {}
    }
  } catch {}
}
await restoreRuns();

function event(run, data) {
  run.events.push({ at: new Date().toISOString(), ...data });
  run.updatedAt = new Date().toISOString();
}
function publicRun(run) {
  const { directory, candidateProgram, ...visible } = run;
  return visible;
}
async function persist(run) {
  await mkdir(run.directory, { recursive: true });
  await writeFile(path.join(run.directory, 'report.json'), JSON.stringify(publicRun(run), null, 2));
}

export function getScenario() {
  return {
    title: 'Inventory CSV migration',
    description: 'A legacy CommonJS utility reads CSV from stdin and emits normalized JSON. Migrate it to TypeScript while preserving its observable behavior.',
    contract: ['Keep IDs as exact strings, including leading zeros', 'Parse quoted commas and escaped quotes', 'Keep the last value for duplicate IDs', 'Trim names, preserve descriptions', 'Use the same error categories and exit behavior'],
    example: 'id,name,quantity,description\n00127,"Nuts, bolts",0,"Pack, large"\n',
    caseCount: corpus.length,
    sourceFiles: ['cli.cjs', 'csv.cjs', 'normalize.cjs', 'README.md']
  };
}

export function getRun(id) { const run = runs.get(id); return run ? publicRun(run) : null; }

export function startRun(mode) {
  if (!['seeded', 'agent'].includes(mode)) throw new Error('Invalid run mode');
  if (mode === 'agent' && [...runs.values()].some(run => run.mode === 'agent' && ['queued', 'running'].includes(run.status))) {
    throw Object.assign(new Error('A live Argon migration is already running'), { statusCode: 409 });
  }
  if (runs.size >= MAX_RUNS) {
    const oldestFinished = [...runs.entries()].find(([,run]) => !['queued', 'running'].includes(run.status))?.[0];
    if (!oldestFinished) throw Object.assign(new Error('Too many active runs'), { statusCode: 429 });
    runs.delete(oldestFinished);
  }
  const id = randomUUID();
  const run = {
    id, mode, status: 'queued', stage: 'Preparing', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    events: [], attempts: [], result: null, source: null, error: null, probes: [],
    directory: path.join(runRoot, id), candidateProgram: null
  };
  runs.set(id, run);
  event(run, { type: 'created', message: mode === 'agent' ? 'Live Argon migration queued' : 'Seeded regression demonstration queued' });
  void execute(run);
  return publicRun(run);
}

async function execute(run) {
  try {
    run.status = 'running'; run.stage = 'Generating candidate';
    await mkdir(run.directory, { recursive: true });
    const maxAttempts = run.mode === 'agent' ? 3 : 1;
    let previous = null;
    let feedback = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      event(run, { type: 'attempt', message: 'Attempt ' + attempt + ' of ' + maxAttempts, attempt });
      if (run.mode === 'seeded') {
        await mkdir(path.join(run.directory, 'seeded'), { recursive: true });
        await mkdir(path.join(run.directory, 'inventory-legacy'), { recursive: true });
        run.candidateProgram = path.join(run.directory, 'seeded', 'cli.cjs');
        await copyFile(seeded, run.candidateProgram);
        await Promise.all(['csv.cjs', 'normalize.cjs'].map(name => copyFile(path.join(path.dirname(legacy), name), path.join(run.directory, 'inventory-legacy', name))));
        run.source = await readFile(seeded, 'utf8');
        event(run, { type: 'artifact', message: 'Loaded a deliberately flawed migration for the verifier demo' });
      } else {
        const generated = await generateCandidate(run.directory, data => event(run, data), feedback, previous);
        run.candidateProgram = generated.candidateProgram;
        run.source = generated.source;
        previous = generated.interaction;
        if (generated.typeErrors.length) {
          run.attempts.push({ number: attempt, typeErrors: generated.typeErrors });
          feedback = 'Strict TypeScript typecheck failed: ' + generated.typeErrors.join(' | ') + '. Remove custom NodeJS/process declarations and use standard @types/node. Keep behavior unchanged.';
          event(run, { type: 'typecheck_failed', message: 'Sending TypeScript diagnostics back to Argon', errors: generated.typeErrors });
          if (attempt === maxAttempts) throw new Error('TypeScript typecheck failed after repair: ' + generated.typeErrors.join('; '));
          run.stage = 'Repairing type errors';
          continue;
        }
      }
      run.stage = 'Verifying behavior';
      event(run, { type: 'verification_start', message: 'Running ' + corpus.length + ' frozen comparison cases' });
      const result = await comparePrograms(legacy, run.candidateProgram, corpus, item => event(run, { type: 'case', message: item.label + ': ' + item.status, caseId: item.id, status: item.status }));
      run.result = result;
      run.attempts.push({ number: attempt, result });
      event(run, { type: 'verification_complete', message: result.passed + '/' + result.total + ' cases matched', passed: result.passed, total: result.total });
      await persist(run);
      if (result.failed === 0 || run.mode === 'seeded') break;
      feedback = JSON.stringify(result.cases.filter(c => c.status !== 'passed').map(c => ({ id: c.id, label: c.label, input: c.input, expected: c.baseline, actual: c.candidate }))).slice(0, 12000);
      run.stage = 'Repairing mismatches';
    }
    run.status = run.result.failed === 0 ? 'passed' : 'mismatch';
    run.stage = 'Complete';
    event(run, { type: 'complete', message: run.status === 'passed' ? 'Observed parity on the frozen corpus' : 'Behavioral differences remain' });
    await persist(run);
  } catch (error) {
    run.status = 'failed'; run.stage = 'Stopped'; run.error = String(error.message ?? error).slice(0, 1000);
    event(run, { type: 'error', message: run.error });
    await persist(run).catch(() => {});
  }
}

export async function probeRun(id, input) {
  const run = runs.get(id);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  if (!run.candidateProgram || !['passed', 'mismatch'].includes(run.status)) throw Object.assign(new Error('Run is not ready for a probe'), { statusCode: 409 });
  if (typeof input !== 'string' || input.length > 100_000) throw Object.assign(new Error('Probe must be CSV text under 100 KB'), { statusCode: 400 });
  const result = await comparePrograms(legacy, run.candidateProgram, [{ id: 'custom-probe', label: 'Custom probe', input }]);
  const comparison = result.cases[0];
  const match = comparison.status === 'passed';
  const probe = { at: new Date().toISOString(), input, expected: comparison.baseline, actual: comparison.candidate, match, status: comparison.status };
  run.probes.push(probe);
  event(run, { type: 'probe', message: match ? 'Custom probe matched' : 'Custom probe found a mismatch', match });
  await persist(run);
  return probe;
}
