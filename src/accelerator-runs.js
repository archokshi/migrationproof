import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { checkAccelerator, digest } from './accelerator-checks.js';
import { isAgentConfigured } from './agent.js';

const model = 'gemini-4-argon', agent = 'antigravity-preview-09-2026';
const root = path.resolve('.runs/accelerator');
let latest = null;
try {
  latest = JSON.parse(await readFile(path.join(root, 'latest.json'), 'utf8'));
  if (latest.status === 'running') { latest.status = 'failed'; latest.error = 'Server restarted during the agent task. Start a new run.'; }
} catch {}
export function getAcceleratorRun() { return latest; }
export async function acceleratorInput() {
  const files = {};
  for (const name of ['encoder.py', 'runtime.json', 'README.md']) files[name] = await readFile(path.join('fixtures/supportsearch', name), 'utf8');
  return files;
}
async function persist(run) {
  await mkdir(path.join(root, run.id), { recursive: true });
  const json = JSON.stringify(run, null, 2);
  await writeFile(path.join(root, run.id, 'report.json'), json);
  if (latest?.id === run.id) await writeFile(path.join(root, 'latest.json'), json);
}
function event(run, type, message, details = {}) {
  run.events.push({ at: new Date().toISOString(), type, message, ...details });
}
export function startAcceleratorRun(batchSize) {
  if (![8, 16, 32].includes(batchSize)) throw Object.assign(new Error('Batch size must be 8, 16 or 32'), { statusCode: 400 });
  if (!isAgentConfigured()) throw Object.assign(new Error('Argon API key is not configured'), { statusCode: 503 });
  if (latest?.status === 'running') throw Object.assign(new Error('An accelerator preparation is already running'), { statusCode: 409 });
  const run = { id: randomUUID(), model, agent, batchSize, status: 'running', phase: 'inspect', startedAt: new Date().toISOString(), events: [], attempts: [], artifacts: {}, checks: [], hardwareValidated: false, error: null };
  latest = run;
  event(run, 'created', 'Real Argon preparation queued. Hardware execution remains pending.');
  void execute(run);
  return run;
}
export async function challengeAcceleratorRun(expectedRunId) {
  if (expectedRunId && latest?.id !== expectedRunId) throw Object.assign(new Error('The active candidate changed. Refresh the demo before repairing.'), { statusCode: 409 });
  if (latest?.status !== 'prepared') throw Object.assign(new Error('Prepare a candidate before challenging it'), { statusCode: 409 });
  const original = latest;
  const artifacts = { ...original.artifacts, 'encoder.py': original.artifacts['encoder.py'].replace(/p\s*=\s*2/, 'p=1') };
  if (artifacts['encoder.py'] === original.artifacts['encoder.py']) throw Object.assign(new Error('No normalization target found for this test'), { statusCode: 409 });
  const run = { id: randomUUID(), model, agent, batchSize: original.batchSize, parentRunId: original.id, status: 'running', phase: 'verify', startedAt: new Date().toISOString(), events: [], attempts: [], artifacts, checks: [], hardwareValidated: false, error: null, origin: 'injected-test-regression' };
  latest = run;
  event(run, 'test_injection', 'Deliberately changed L2 normalization to L1 in a copy of the candidate. This is a test injection, not an Argon mistake.');
  try {
    run.checks = await checkAccelerator(artifacts, run.batchSize);
    run.attempts.push({ number: 0, origin: 'injected-test-regression', artifacts, checks: run.checks });
    event(run, 'verification', 'Independent checker rejected the injected normalization change', { failed: run.checks.filter(c => !c.passed) });
    const previous = original.attempts.at(-1).interaction;
    void execute(run, { previous, feedback: { failed: run.checks.filter(c => !c.passed), testInjection: true, instruction: 'A test deliberately corrupted a copy of your output. Repair this challenged candidate using the original frozen contract; do not change the checker.', challengedSource: artifacts['encoder.py'] } });
  } catch (error) { run.status = 'failed'; run.error = error.message; await persist(run); }
  return run;
}
async function execute(run, initial = {}) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const sources = await acceleratorInput();
    run.sources = sources;
    run.sourceHashes = Object.fromEntries(Object.entries(sources).map(([name, content]) => [name, digest(content)]));
    let previous = initial.previous || null, feedback = initial.feedback || null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const prompt = feedback
        ? `Repair your candidate in the same environment. Independent local source-contract checks failed: ${JSON.stringify(feedback)}. Keep changes limited to the allowed transformation. Write all three candidate artifacts again. Do not claim hardware validation.`
        : `Prepare the supplied SupportSearch CUDA worker for a TPU hardware trial. Read all three legacy files. Write candidate/encoder.py, candidate/runtime.json, candidate/migration.md. Requested batch size: ${run.batchSize}. This is a constrained migration: preserve the entire encoder AST except change DEVICE to "tpu", BATCH_SIZE to ${run.batchSize}, and add a standalone import torch_tpu. Preserve function signatures, model identity, tokenizer, float32, pooling and normalization exactly; do not add other code. In runtime.json change only device and batch_size. In migration.md explain the changes, limitations, partial-batch handling, model revision pinning, prerequisites, rollout and rollback, and exact checks to run on real hardware. Use Python standard-library checks in your remote environment; do not download models or install packages. No accelerator is available; do not invent execution or performance results.`;
      run.phase = 'adapt';
      event(run, 'request', feedback ? 'Returning failed checks to the same Managed Agent environment' : 'Uploading the CUDA worker and frozen contract to Managed Agent', { attempt, prompt });
      await persist(run);
      let interaction = await ai.interactions.create({
        agent, input: prompt, background: true,
        environment: previous?.environment_id || { type: 'remote', sources: Object.entries(sources).map(([name, content]) => ({ type: 'inline', target: 'legacy/' + name, content })) },
        agent_config: { type: 'antigravity', model },
        ...(previous ? { previous_interaction_id: previous.id } : {})
      }, { timeout: 300000 });
      if (!interaction.id) throw new Error('Managed Agent returned no interaction ID');
      event(run, 'started', 'Managed Agent is working in its remote environment', { interactionId: interaction.id });
      let seen = 0;
      const deadline = Date.now() + 8 * 60_000;
      while (true) {
        const steps = interaction.steps || [];
        for (const step of steps.slice(seen)) {
          if (step.type === 'function_call') event(run, 'tool', String(step.name || 'tool').replaceAll('_', ' '));
          if (step.type === 'function_result' && step.is_error) event(run, 'tool_error', 'Remote tool returned an error');
        }
        seen = Math.max(seen, steps.length);
        if (!['queued', 'in_progress'].includes(interaction.status)) break;
        if (Date.now() > deadline) { await ai.interactions.cancel(interaction.id).catch(() => {}); throw new Error('Agent exceeded the eight-minute limit; cancellation requested'); }
        await new Promise(resolve => setTimeout(resolve, 3000));
        interaction = await ai.interactions.get(interaction.id);
      }
      event(run, 'response', 'Managed Agent returned: ' + interaction.status, { interactionId: interaction.id, environmentId: interaction.environment_id, summary: interaction.output_text?.slice(0, 3000) });
      if (interaction.status !== 'completed') throw new Error('Agent task ended: ' + interaction.status);
      previous = { id: interaction.id, environment_id: interaction.environment_id || previous?.environment_id };
      if (!previous.environment_id) throw new Error('No remote environment ID returned');
      const artifacts = {};
      for (const name of ['encoder.py', 'runtime.json', 'migration.md']) {
        const bytes = await ai.environments.files.download({ environment: previous.environment_id, path: 'candidate/' + name });
        const content = Buffer.from(bytes).toString('utf8');
        if (!content.trim() || content.length > 100_000) throw new Error('Candidate artifact empty or exceeds 100 KB: ' + name);
        artifacts[name] = content;
      }
      run.artifacts = artifacts;
      run.phase = 'verify';
      event(run, 'artifact', 'Downloaded the actual TPU candidate, runtime config and migration plan');
      run.checks = await checkAccelerator(artifacts, run.batchSize);
      const hashes = Object.fromEntries(Object.entries(artifacts).map(([name, content]) => [name, digest(content)]));
      run.attempts.push({ number: attempt, interaction: previous, artifacts, hashes, checks: run.checks });
      const failed = run.checks.filter(check => !check.passed);
      event(run, 'verification', `${run.checks.length - failed.length}/${run.checks.length} independent source-contract checks passed`, { failed });
      await persist(run);
      if (!failed.length) break;
      feedback = failed;
    }
    run.status = run.checks.every(check => check.passed) ? 'prepared' : 'blocked';
    run.phase = 'verify';
    event(run, 'complete', run.status === 'prepared' ? 'Candidate prepared. Release blocked pending GPU/TPU execution and quality measurements.' : 'Candidate blocked by source-contract checks.');
  } catch (error) {
    run.status = 'failed'; run.error = String(error.message || error).replaceAll(process.env.GEMINI_API_KEY || '\0', '[redacted]').slice(0, 1000);
    event(run, 'error', run.error);
  }
  run.completedAt = new Date().toISOString();
  await persist(run).catch(() => {});
}
