import 'dotenv/config';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getScenario, getRun, startRun, probeRun } from './runs.js';
import { isAgentConfigured } from './agent.js';
import { preparedDemo } from './prepared-demo.js';
import { getAcceleratorRun, startAcceleratorRun, challengeAcceleratorRun, acceleratorInput } from './accelerator-runs.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 8787);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
function json(res, status, data) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); }
async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk.toString();
    if (raw.length > 120_000) throw Object.assign(new Error('Request too large'), { statusCode: 413 });
  }
  try { return JSON.parse(raw || '{}'); } catch { throw Object.assign(new Error('Invalid JSON'), { statusCode: 400 }); }
}
async function staticFile(urlPath, res) {
  const target = path.resolve(dist, '.' + decodeURIComponent(urlPath));
  if (!target.startsWith(dist + path.sep) && target !== dist) return json(res, 403, { error: 'Forbidden' });
  let file = target;
  try { if (!(await stat(file)).isFile()) file = path.join(dist, 'index.html'); }
  catch { file = path.join(dist, 'index.html'); }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { json(res, 404, { error: 'App is not built. Run npm run build.' }); }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);
      if (req.method === 'POST') {
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'Use application/json' });
        if (req.headers.origin) {
          const origin = new URL(req.headers.origin);
          if (!['localhost', '127.0.0.1'].includes(origin.hostname)) return json(res, 403, { error: 'Requests must originate from the local app' });
        }
      }
      if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, model: 'gemini-4-argon', agent: 'antigravity-preview-09-2026', configured: isAgentConfigured() });
      if (url.pathname === '/api/scenario' && req.method === 'GET') return json(res, 200, getScenario());
      if (url.pathname === '/api/accelerator/input' && req.method === 'GET') return json(res, 200, await acceleratorInput());
      if (url.pathname === '/api/accelerator/prepared-demo' && req.method === 'GET') return json(res, 200, await preparedDemo());
      if (url.pathname === '/api/accelerator/run' && req.method === 'GET') return json(res, 200, getAcceleratorRun());
      if (url.pathname === '/api/accelerator/run' && req.method === 'POST') return json(res, 202, startAcceleratorRun((await body(req)).batchSize));
      if (url.pathname === '/api/accelerator/challenge' && req.method === 'POST') return json(res, 202, await challengeAcceleratorRun((await body(req)).expectedRunId));
      if (url.pathname === '/api/accelerator/report' && req.method === 'GET') {
        const run = getAcceleratorRun();
        if (!run) return json(res, 404, { error: 'No accelerator run yet' });
        res.writeHead(200, { 'content-type': 'application/json', 'content-disposition': 'attachment; filename="argon-accelerator-evidence.json"' });
        return res.end(JSON.stringify(run, null, 2));
      }
      if (url.pathname === '/api/runs' && req.method === 'POST') {
        const data = await body(req);
        if (!['seeded', 'agent'].includes(data.mode)) return json(res, 400, { error: 'mode must be seeded or agent' });
        if (data.mode === 'agent' && !isAgentConfigured()) return json(res, 503, { error: 'Argon API key is not configured' });
        return json(res, 202, startRun(data.mode));
      }
      if (parts[0] === 'api' && parts[1] === 'runs' && parts[2]) {
        const run = getRun(parts[2]);
        if (!run) return json(res, 404, { error: 'Run not found' });
        if (parts.length === 3 && req.method === 'GET') return json(res, 200, run);
        if (parts[3] === 'probe' && req.method === 'POST') return json(res, 200, await probeRun(parts[2], (await body(req)).input));
        if (parts[3] === 'report' && req.method === 'GET') {
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename=\"migrationproof-report.json\"' });
          return res.end(JSON.stringify(run, null, 2));
        }
      }
      if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Endpoint not found' });
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });
      return await staticFile(url.pathname, res);
    } catch (error) { return json(res, error.statusCode || 500, { error: String(error.message ?? error) }); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(port, '127.0.0.1', () => console.log('MigrationProof ready at http://localhost:' + port));
}
