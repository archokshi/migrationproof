import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import pathModule from 'node:path';

function firstDifference(expected, actual, location = 'output') {
  if (isDeepStrictEqual(expected, actual)) return null;
  if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const key of keys) {
      const next = firstDifference(expected[key], actual[key], Array.isArray(expected) ? location + '[' + key + ']' : location + '.' + key);
      if (next) return next;
    }
  }
  return { path: location, expected, actual };
}

export async function runProgram(program, input, { timeoutMs = 5000 } = {}) {
  const programPath = pathModule.resolve(program instanceof URL ? fileURLToPath(program) : program);
  return await new Promise((resolve) => {
    const workingDir = pathModule.dirname(programPath);
    const allowedDir = pathModule.dirname(workingDir);
    const child = spawn(process.execPath, ['--permission', '--allow-fs-read=' + allowedDir, programPath], {
      stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, cwd: workingDir,
      env: process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR } : {}
    });
    let stdout = ''; let stderr = ''; let timedOut = false; let oversized = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    const append = (kind, chunk) => {
      if (kind === 'out') stdout += chunk.toString(); else stderr += chunk.toString();
      if (stdout.length + stderr.length > 1_000_000) { oversized = true; child.kill(); }
    };
    child.stdout.on('data', chunk => append('out', chunk));
    child.stderr.on('data', chunk => append('err', chunk));
    child.on('error', error => { clearTimeout(timer); resolve({ exitCode: -1, error: error.message, stdout, stderr }); });
    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut || oversized) return resolve({ exitCode: -1, error: timedOut ? 'TIMEOUT' : 'OUTPUT_LIMIT', detail: stderr.slice(0, 600), stdout, stderr });
      try {
        const parsed = JSON.parse(code === 0 ? stdout : stderr);
        resolve({ exitCode: code, value: code === 0 ? parsed : undefined, error: code === 0 ? undefined : parsed.error, stdout, stderr });
      } catch {
        resolve({ exitCode: code ?? -1, error: 'INVALID_JSON_OUTPUT', detail: (stderr || stdout).slice(0, 600), stdout, stderr });
      }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

export async function comparePrograms(baselineProgram, candidateProgram, cases, onCase = () => {}) {
  const results = [];
  for (const item of cases) {
    const baseline = await runProgram(baselineProgram, item.input);
    const candidate = await runProgram(candidateProgram, item.input);
    const comparable = output => ({ exitCode: output.exitCode, value: output.value, error: output.error, detail: output.detail });
    const status = baseline.exitCode === -1 || candidate.exitCode === -1 || baseline.error === 'INVALID_JSON_OUTPUT' || candidate.error === 'INVALID_JSON_OUTPUT'
      ? 'error' : isDeepStrictEqual(comparable(baseline), comparable(candidate)) ? 'passed' : 'mismatch';
    const result = { id: item.id, label: item.label, status, input: item.input, baseline: comparable(baseline), candidate: comparable(candidate), difference: status === 'passed' ? null : firstDifference(comparable(baseline), comparable(candidate)) };
    results.push(result);
    onCase(result);
  }
  return { cases: results, total: results.length, passed: results.filter(c => c.status === 'passed').length, failed: results.filter(c => c.status !== 'passed').length };
}
