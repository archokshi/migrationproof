import { GoogleGenAI } from '@google/genai';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const model = 'gemini-4-argon';
const agent = 'antigravity-preview-09-2026';
const fixtureRoot = path.resolve('fixtures/inventory-legacy');
export function isAgentConfigured() { return Boolean(process.env.GEMINI_API_KEY); }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function describeStep(step) {
  if (step.type === 'function_call') {
    const args = step.arguments || {};
    const target = args.AbsolutePath || args.DirectoryPath || args.TargetFile || args.SearchDirectory || args.Pattern || '';
    return { type: 'agent_step', message: 'Argon: ' + String(step.name || 'tool').replaceAll('_', ' ') + (target ? ' · ' + String(target).slice(0, 90) : '') };
  }
  if (step.type === 'function_result' && step.is_error) return { type: 'agent_step_error', message: 'Argon tool returned an error: ' + String(step.name || 'tool') };
  return null;
}

export async function generateCandidate(runDirectory, onEvent, feedback = null, prior = null) {
  if (!isAgentConfigured()) throw new Error('GEMINI_API_KEY is not configured on the server');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const files = ['cli.cjs', 'csv.cjs', 'normalize.cjs', 'README.md'];
  const sources = await Promise.all(files.map(async name => ({
    type: 'inline', target: 'legacy/' + name, content: await readFile(path.join(fixtureRoot, name), 'utf8')
  })));
  const prompt = feedback
    ? 'Your prior TypeScript migration failed independent parity checks. Inspect and edit candidate/cli.ts in your existing remote environment. Preserve all legacy behavior, including opaque IDs. Verifier feedback: ' + feedback + ' Run your own checks. Output corrected candidate/cli.ts.'
    : 'Migrate the attached legacy Node.js CommonJS CSV inventory normalizer to a single standalone TypeScript entry point at candidate/cli.ts. Read all source files and README. The program must read UTF-8 CSV from stdin, write exactly one JSON result to stdout, and on invalid input write JSON {"error":"CATEGORY"} to stderr with exit code 1. Preserve all observable behavior, including string IDs, leading zeros, duplicate order, quoting, whitespace, numeric rules, and error categories. Do not import local modules or external packages. You may import built-in Node modules. Use standard @types/node declarations; do not redeclare NodeJS or process. Write candidate/cli.ts to the remote filesystem and run meaningful tests there. Explain briefly what you changed.';
  const request = {
    agent, input: prompt, background: true,
    environment: prior?.environment_id ?? { type: 'remote', sources },
    agent_config: { type: 'antigravity', model },
    ...(prior ? { previous_interaction_id: prior.id } : {})
  };
  onEvent({ type: 'agent_request', message: feedback ? 'Sending verifier feedback to Argon Managed Agent' : 'Sending legacy source to Argon Managed Agent', model, agent, prompt });
  let interaction = await ai.interactions.create(request, { timeout: 300000 });
  if (!interaction.id) throw new Error('Managed Agent did not return an interaction ID');
  onEvent({ type: 'agent_started', message: 'Remote Argon interaction started', interactionId: interaction.id });
  let seen = 0;
  const deadline = Date.now() + 8 * 60_000;
  while (true) {
    const steps = interaction.steps || [];
    for (const step of steps.slice(seen)) {
      const described = describeStep(step);
      if (described) onEvent(described);
    }
    seen = Math.max(seen, steps.length);
    if (interaction.status !== 'in_progress' && interaction.status !== 'queued') break;
    if (Date.now() > deadline) {
      await ai.interactions.cancel(interaction.id).catch(() => {});
      throw new Error('Managed Agent exceeded the 8-minute run limit; cancellation was requested');
    }
    await sleep(3000);
    interaction = await ai.interactions.get(interaction.id);
  }
  onEvent({ type: 'agent_response', message: 'Agent ' + (interaction.status ?? 'returned'), interactionId: interaction.id, environmentId: interaction.environment_id, status: interaction.status, summary: interaction.output_text?.slice(0, 1800) });
  if (interaction.status !== 'completed') throw new Error('Managed Agent ended with status ' + (interaction.status ?? 'unknown'));
  const environmentId = interaction.environment_id ?? prior?.environment_id;
  if (!environmentId) throw new Error('Managed Agent returned no environment ID');
  const bytes = await ai.environments.files.download({ environment: environmentId, path: 'candidate/cli.ts' });
  const source = Buffer.from(bytes).toString('utf8');
  if (!source.trim() || source.length > 200_000) throw new Error('Generated TypeScript is empty or too large');
  await mkdir(runDirectory, { recursive: true });
  const candidateSource = path.join(runDirectory, 'cli.ts');
  const candidateProgram = path.join(runDirectory, 'cli.cjs');
  await writeFile(candidateSource, source, 'utf8');
  const typeOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, strict: true, noEmit: true, types: ['node'] };
  const typeProgram = ts.createProgram([candidateSource], typeOptions);
  const typeErrors = ts.getPreEmitDiagnostics(typeProgram)
    .filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => 'TS' + d.code + ': ' + ts.flattenDiagnosticMessageText(d.messageText, ' ')).slice(0, 20);
  const compiled = ts.transpileModule(source, {
    fileName: 'cli.ts', reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, strict: true }
  });
  const syntaxErrors = (compiled.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (syntaxErrors.length) throw new Error('TypeScript transpilation failed: ' + syntaxErrors.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; '));
  await writeFile(candidateProgram, compiled.outputText, 'utf8');
  onEvent({ type: 'artifact', message: 'Downloaded TypeScript and compiled runnable JavaScript', bytes: source.length });
  onEvent({ type: 'typecheck', message: typeErrors.length ? typeErrors.length + ' TypeScript errors found' : 'TypeScript strict check passed', errors: typeErrors });
  return { candidateSource, candidateProgram, source, typeErrors, interaction: { id: interaction.id, environment_id: environmentId } };
}
