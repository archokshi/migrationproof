import { useEffect, useState } from 'react';
import { ArrowDownToLine, Check, Cpu, Play, ShieldCheck } from 'lucide-react';

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function ArgonEvidence({ onRun, live }) {
  const [run, setRun] = useState(null);
  const [sources, setSources] = useState({});
  const [batchSize, setBatchSize] = useState(16);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState('encoder.py');
  const [configured, setConfigured] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let disposed = false;
    Promise.all([api('/api/accelerator/run'), api('/api/accelerator/input'), api('/api/health')]).then(([saved, input, health]) => {
      if (disposed) return;
      setSources(input); setConfigured(health.configured); setRun(saved); setLoaded(true);
      if (saved) onRun(saved);
    }).catch(e => { if (!disposed) { setError(e.message); setLoaded(true); } });
    return () => { disposed = true; };
  }, [onRun]);
  useEffect(() => {
    if (run?.status !== 'running') return;
    let disposed = false;
    const timer = setInterval(async () => {
      try {
        const next = await api('/api/accelerator/run');
        if (!disposed && next) { setRun(next); if (live) onRun(next); setError(''); }
      } catch (e) { if (!disposed) setError('Connection interrupted. Retrying: ' + e.message); }
    }, 2500);
    return () => { disposed = true; clearInterval(timer); };
  }, [run?.status, live, onRun]);
  async function start() {
    setBusy(true); setError('');
    try {
      const next = await api('/api/accelerator/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ batchSize }) });
      setRun(next); onRun(next);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function challenge() {
    setBusy(true); setError('');
    try {
      const next = await api('/api/accelerator/challenge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      setRun(next); onRun(next);
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const running = run?.status === 'running';
  const passed = run?.checks.filter(c => c.passed).length || 0;
  const interaction = run?.events.find(e => e.interactionId)?.interactionId;
  return <section className="argon-evidence" aria-label="Real Argon Managed Agent evidence">
    <div className="argon-title"><div><span className="acc-kicker">GEMINI 4 ARGON · MANAGED AGENT</span><h2>The agent does the migration.<br/>The evidence decides the release.</h2><p>Prepare a real SupportSearch TPU candidate from the supplied CUDA source. Watch the remote agent work, inspect its files, and check what is—and isn’t—verified.</p></div><span className={'argon-status '+(running?'working':'')}>{!loaded?'Connecting…':running?'LIVE AGENT RUNNING':run?'SAVED REAL RUN':'READY FOR A REAL RUN'}</span></div>
    <div className="argon-roles"><span><Cpu size={17}/><strong>Argon</strong> Reads source · edits files · runs remote tools</span><span><ShieldCheck size={17}/><strong>MigrationProof</strong> Checks frozen contracts · returns failures for repair</span></div>
    <div className="argon-actions"><label>Requested batch size<select value={batchSize} onChange={e=>setBatchSize(Number(e.target.value))} disabled={running||busy}><option value={8}>8 documents</option><option value={16}>16 documents</option><option value={32}>32 documents</option></select></label><button className="acc-button play" onClick={start} disabled={!configured||!loaded||running||busy}><Play size={15}/>{busy?'Starting…':running?'Agent working…':'Run Argon migration'}</button>{run&&<button className="argon-secondary" onClick={()=>onRun(live?null:run)}>{live?'Explore illustrative animation':'Show actual run in 3D'}</button>}<small>Uses the server-side Gemini key · typically several minutes</small></div>
    {error&&<p className="argon-error" role="alert">{error}</p>}
    {loaded&&!configured&&<p className="argon-error">The server needs a Gemini API key before a live run can start.</p>}
    <div className="argon-proof-strip" aria-live="polite"><span><small>CODE GENERATION</small><strong>{run?run.model:'gemini-4-argon'}</strong></span><span><small>INDEPENDENT SOURCE CHECKS</small><strong>{run?.checks.length?`${passed}/${run.checks.length} passed`:'Awaiting candidate'}</strong></span><span><small>GPU / TPU EXECUTION</small><strong>Not performed</strong></span><span><small>RELEASE DECISION</small><strong className="release-blocked">{run?.status==='failed'?'Agent task failed':'Blocked · hardware evidence required'}</strong></span></div>
    {run&&<div className="argon-run-meta"><span>Run {run.id}</span><span>{new Date(run.startedAt).toLocaleString()}</span><span>{run.attempts.filter(a=>a.interaction).length} completed agent attempt(s) · batch {run.batchSize}</span>{interaction&&<span>Interaction {interaction}</span>}<a href="/api/accelerator/report"><ArrowDownToLine size={13}/>Download actual evidence</a></div>}
    {run?.error&&<p className="argon-error" role="alert">{run.error}</p>}
    {run&&<div className="argon-challenge"><div><strong>Make the verification earn your trust.</strong><p>Inject an L2 → L1 normalization regression into a copy of the candidate. The local checker catches it; a real Argon follow-up repairs it in the same remote environment.</p></div><button className="argon-secondary" onClick={challenge} disabled={run.status!=='prepared'||busy}>Inject regression & ask Argon to repair</button></div>}
    {run?.origin==='injected-test-regression'&&<p className="argon-boundary"><strong>TEST INJECTION: {run.attempts[0]?.checks.filter(c=>c.passed).length}/{run.attempts[0]?.checks.length} checks passed before repair → {passed}/{run.checks.length} now.</strong> The normalization fault was deliberately introduced by MigrationProof. The original Argon candidate passed. The report retains the failing copy and subsequent repair attempts.</p>}
    <details className="argon-artifacts"><summary>Inspect source → actual agent artifacts</summary><div className="argon-file-tabs">{['encoder.py','runtime.json','migration.md'].map(name=><button key={name} aria-pressed={file===name} onClick={()=>setFile(name)}>{name}</button>)}</div><div className="argon-code-grid"><div><h3>INPUT · {file}</h3><pre>{sources[file] || 'The migration plan is a new artifact requested from Argon.'}</pre></div><div><h3>ARGON OUTPUT · {file}</h3><pre>{run?.artifacts?.[file] || 'Waiting for the remote agent. No prewritten candidate is substituted.'}</pre></div></div>{file==='migration.md'&&<p className="argon-boundary">Agent-authored plan. Hardware instructions and proposed tolerances require review; the source checker does not validate this prose.</p>}</details>
    {run&&<div className="argon-trace-grid"><details open={running}><summary>Actual agent & verifier activity · {run.events.length} events</summary><ol className="argon-events">{run.events.slice(-14).map((event,i)=><li key={i}><time>{new Date(event.at).toLocaleTimeString()}</time><span><strong>{event.type}</strong>{event.message}</span></li>)}</ol></details><details><summary>Independent checks · source structure only</summary><ul className="argon-checks">{run.checks.map(check=><li key={check.name}><span>{check.passed?<Check size={13}/>: '×'}</span>{check.name}<strong>{check.passed?'PASS':'FAIL'}</strong></li>)}</ul><p>Parsed locally without executing generated Python. These checks do not establish numerical equivalence, operator support, throughput, or cost.</p></details></div>}
    <p className="argon-boundary">Real: API interaction, remote agent tools, downloaded files, SHA-256 hashes, local source checks and automatic feedback on failed checks. Illustrative: hardware models and search-result animation. This small migration specimen does not demonstrate million-token scale.</p>
  </section>;
}
