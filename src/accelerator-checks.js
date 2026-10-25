import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const digest = value => createHash('sha256').update(value).digest('hex');
export async function checkAccelerator(artifacts, batchSize) {
  const baseline = await readFile('fixtures/supportsearch/encoder.py', 'utf8');
  const original = JSON.parse(await readFile('fixtures/supportsearch/runtime.json', 'utf8'));
  let config;
  try { config = JSON.parse(artifacts['runtime.json']); }
  catch { return [{ name: 'Runtime configuration is valid JSON', passed: false }]; }
  const checks = Object.keys(original).map(key => ({
    name: 'Runtime contract: ' + key,
    passed: JSON.stringify(config?.[key]) === JSON.stringify(key === 'device' ? 'tpu' : key === 'batch_size' ? batchSize : original[key])
  }));
  const astChecks = await new Promise((resolve, reject) => {
    const child = execFile(process.env.PYTHON || 'python', ['-I', path.resolve('src/check-accelerator.py')], {
      timeout: 10000, maxBuffer: 100_000, windowsHide: true,
      env: Object.fromEntries(Object.entries(process.env).filter(([key]) => ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP'].includes(key.toUpperCase())))
    }, (error, stdout) => { if (error) reject(new Error('Source checker unavailable: ' + error.message)); else { try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Invalid source checker output')); } } });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify({ baseline, candidate: artifacts['encoder.py'], config: original, batchSize }));
  });
  return [...checks, ...astChecks];
}
