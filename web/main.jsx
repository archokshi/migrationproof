import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowRight, Check, ChevronDown, CircleAlert, Code2, Download, ExternalLink, FlaskConical, GitBranch, Layers3, LoaderCircle, Play, Radio, RotateCcw, ShieldCheck, Sparkles, Terminal, X } from 'lucide-react';
import './styles.css';
const ProofGraph = React.lazy(() => import('./ProofGraph.jsx'));
const AcceleratorDemo = React.lazy(() => import('./AcceleratorDemo.jsx'));
const GuidedMigration = React.lazy(() => import('./LiveGuidedDemo.jsx'));

async function api(url, options) {
  const response = await fetch(url, { ...options, headers: { 'content-type': 'application/json', ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function fmt(value) { return value == null ? '—' : JSON.stringify(value, null, 2); }
function time(value) { return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'; }

function App() {
  const [health, setHealth] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [run, setRun] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [tab, setTab] = useState('evidence');
  const [probeInput, setProbeInput] = useState('id,name,quantity,description\n00127,Widget,2,Custom probe\n');
  const [probe, setProbe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [probeBusy, setProbeBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const cases = run?.result?.cases || [];
  const current = cases.find(item => item.id === selectedCase) || cases.find(item => item.status !== 'passed') || cases[0];
  const isRunning = run && ['queued', 'running'].includes(run.status);

  useEffect(() => {
    Promise.all([api('/api/health'), api('/api/scenario')])
      .then(([h, s]) => { setHealth(h); setScenario(s); })
      .catch(error => setNotice(error.message));
    const lastId = localStorage.getItem('migrationproof:lastRunId');
    if (lastId) api('/api/runs/' + lastId).then(setRun).catch(() => localStorage.removeItem('migrationproof:lastRunId'));
  }, []);
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      api('/api/runs/' + run.id).then(setRun).catch(error => setNotice(error.message));
    }, 850);
    return () => clearInterval(timer);
  }, [run?.id, isRunning]);
  useEffect(() => {
    if (run?.result && !selectedCase) {
      setSelectedCase(run.result.cases.find(item => item.status !== 'passed')?.id || run.result.cases[0]?.id);
    }
  }, [run?.result, selectedCase]);

  async function start(mode) {
    setBusy(true); setNotice(''); setProbe(null); setSelectedCase(null); setTab('evidence');
    try {
      const fresh = await api('/api/runs', { method: 'POST', body: JSON.stringify({ mode }) });
      setRun(fresh);
      localStorage.setItem('migrationproof:lastRunId', fresh.id);
      document.getElementById('workbench')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }
  async function submitProbe(event) {
    event.preventDefault();
    if (!run) return;
    setProbeBusy(true); setNotice('');
    try { setProbe(await api('/api/runs/' + run.id + '/probe', { method: 'POST', body: JSON.stringify({ input: probeInput }) })); }
    catch (error) { setNotice(error.message); }
    finally { setProbeBusy(false); }
  }
  const stages = useMemo(() => {
    const events = run?.events || [];
    const has = type => events.some(event => event.type === type);
    return [
      { label: 'Source prepared', detail: run?.mode === 'seeded' ? 'Local demonstration fixture selected' : 'Legacy files supplied to the agent', done: has('agent_request') || run?.mode === 'seeded' },
      { label: 'Candidate created', detail: run?.mode === 'seeded' ? 'Known regression loaded for demonstration' : 'Generated TypeScript downloaded', done: has('artifact') },
      ...(run?.mode === 'seeded' ? [] : [{ label: 'Types checked', detail: 'Strict TypeScript diagnostics checked', done: events.filter(event => event.type === 'typecheck').at(-1)?.errors?.length === 0 }]),
      { label: 'Behavior compared', detail: 'Frozen cases executed independently', done: has('verification_complete') },
      { label: 'Evidence ready', detail: 'Results and artifacts available', done: ['passed', 'mismatch'].includes(run?.status) }
    ];
  }, [run]);
  const passed = run?.result?.passed ?? 0;
  const total = run?.result?.total ?? scenario?.caseCount ?? 15;

  return <>
    <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />
    <header className="site-header">
      <a className="brand" href="#top" aria-label="MigrationProof home"><span className="brand-mark"><GitBranch size={20} strokeWidth={2.3} /></span><span>migration<span className="brand-light">proof</span><span className="brand-dot">.</span></span></a>
      <nav aria-label="Main navigation"><a href="#workbench">Workbench</a><a href="/demo">Application Migration from GPU to TPU</a><a href="#method">How it works</a></nav>
      <span className={'connection ' + (health?.configured ? 'online' : '')}><span className="connection-dot" />{health ? health.configured ? 'ARGON CONNECTED' : 'KEY NOT CONFIGURED' : 'CHECKING CONNECTION'}</span>
    </header>

    <main id="top">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> AI CODE MIGRATION, WITH RECEIPTS <span className="eyebrow-line" /></div>
          <h1>Change the code.<br /><em>Keep the truth.</em></h1>
          <p className="hero-description">Let Gemini Argon migrate a real legacy program. Then watch an independent verifier compare old and new behavior, case by case. Every result is visible. Every mismatch has an explanation.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => start('agent')} disabled={busy || isRunning || !health?.configured}><Sparkles size={18} />{isRunning && run.mode === 'agent' ? 'Argon is working…' : 'Run live migration'}<ArrowRight size={17} /></button>
            <button className="button secondary" onClick={() => start('seeded')} disabled={busy || isRunning}><Play size={16} />See a caught regression</button>
          </div>
          <div className="hero-note"><ShieldCheck size={15} /> The API key stays on the server. “Passed” means observed parity on this test corpus.</div>
          <a href="/demo" className="accelerator-entry"><Layers3 size={16} /><span>Application Migration from GPU to TPU</span><ArrowRight size={15} /></a>
        </div>
        <div className="hero-visual">
          <div className="visual-head"><span><span className="live-indicator" /> LIVE EVIDENCE FIELD</span><span>{run ? run.mode === 'agent' ? 'ARGON RUN' : 'SEEDED DEMO' : 'AWAITING RUN'}</span></div>
          <Suspense fallback={<div className="proof-graph graph-loading" aria-label="Loading evidence graph" />}><ProofGraph cases={cases} selectedId={current?.id} onSelect={setSelectedCase} status={run?.status || 'idle'} /></Suspense>
          <div className="visual-foot"><span>LEGACY <span className="visual-connector">───</span> CANDIDATE</span><span>{run?.result ? run.result.passed + ' / ' + run.result.total + ' MATCHED' : '15 VERIFICATION POINTS'}</span></div>
          <div className="visual-corner visual-corner-a" /><div className="visual-corner visual-corner-b" />
        </div>
      </section>

      <section className="signal-strip" aria-label="Product flow">
        <span><span className="signal-index">01</span> AN ACTUAL LEGACY PROGRAM</span>
        <span className="signal-arrow">↗</span>
        <span><span className="signal-index">02</span> ARGON MANAGED AGENT</span>
        <span className="signal-arrow">↗</span>
        <span><span className="signal-index">03</span> INDEPENDENT VERIFICATION</span>
      </section>

      <section className="workbench section-wrap" id="workbench">
        <div className="section-heading"><div><div className="section-kicker">THE WORKBENCH <span> / 01</span></div><h2>Everything on the table.</h2><p>A live view from source code to candidate to behavioral evidence.</p></div><div className={'run-badge ' + (run?.status || 'idle')}><span className="run-badge-dot" />{run ? run.status.toUpperCase() : 'NO RUN YET'}</div></div>
        {notice && <div className="notice" role="alert"><CircleAlert size={17} />{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={15} /></button></div>}
        <div className="workbench-grid">
          <aside className="left-rail">
            <div className="rail-card scenario-card" id="contract">
              <div className="card-label"><Layers3 size={15} /> MIGRATION TARGET</div>
              <h3>{scenario?.title || 'Loading scenario…'}</h3>
              <p>{scenario?.description}</p>
              <div className="tech-route"><span>COMMONJS</span><ArrowRight size={15} /><span>TYPESCRIPT</span></div>
              <div className="thin-rule" />
              <div className="card-label muted">BEHAVIORAL CONTRACT</div>
              <ul className="contract-list">{scenario?.contract.map(item => <li key={item}><Check size={14} />{item}</li>)}</ul>
            </div>
            <div className="rail-card progress-card">
              <div className="card-label"><Radio size={15} /> EXECUTION TRACE</div>
              <ol className="stage-list">{stages.map((stage, index) => <li key={stage.label} className={stage.done ? 'done' : ''}><span className="stage-index">{stage.done ? <Check size={13} /> : String(index + 1).padStart(2, '0')}</span><span><strong>{stage.label}</strong><small>{stage.detail}</small></span></li>)}</ol>
              <div className="stage-current">{run ? <><span className={isRunning ? 'pulse-dot' : 'static-dot'} />{run.stage}</> : 'Start a run to see each stage.'}</div>
            </div>
          </aside>

          <div className="main-panel">
            <div className="panel-top"><div><span className="panel-overline">VERIFICATION SURFACE</span><h3>{run ? run.status === 'passed' ? 'Observed parity.' : run.status === 'mismatch' ? 'A difference surfaced.' : run.status === 'failed' ? 'The run stopped.' : 'Following the work.' : 'Ready when you are.'}</h3></div><div className="score"><strong>{run?.result ? passed : '—'}</strong><span>/ {total}<small>CASES MATCHED</small></span></div></div>
            <div className="progress-track"><div style={{ width: (run?.result ? Math.round(passed / total * 100) : 0) + '%' }} /></div>
            {run?.error && <div className="notice" role="alert"><CircleAlert size={17} />{run.error}</div>}
            <div className="panel-tabs" role="tablist" aria-label="Run details">
              {[['evidence','Evidence',FlaskConical],['source','Candidate code',Code2],['log','Live trace',Terminal],['probe','Custom probe',Play]].map(([id,label,Icon]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={15} />{label}{id === 'log' && run?.events?.length > 0 && <span className="tab-count">{run.events.length}</span>}</button>)}
            </div>
            {tab === 'evidence' && <div className="panel-content evidence-content">
              {!run?.result ? <div className="empty-state"><div className="empty-icon">{isRunning ? <LoaderCircle size={26} className="spin" /> : <FlaskConical size={27} />}</div><h4>{isRunning ? 'The evidence is taking shape.' : 'No evidence has been generated yet.'}</h4><p>{isRunning ? run?.mode === 'agent' ? 'Argon may take a few minutes. New events appear in the Live trace as they arrive.' : 'The seeded comparison is running. Case results will appear shortly.' : 'Run the live migration, or start with the seeded regression to see how a mismatch appears.'}</p></div> :
                <><div className="case-summary"><div><span className="summary-icon good"><Check size={17} /></span><strong>{run.result.passed}</strong><small>matched</small></div><div><span className="summary-icon bad"><CircleAlert size={17} /></span><strong>{run.result.failed}</strong><small>different</small></div><span className="summary-caveat">A passing corpus is evidence, not a formal guarantee.</span></div>
                <div className="evidence-layout"><div className="case-list" role="list" aria-label="Verification cases">{cases.map(item => <button key={item.id} className={'case-row ' + (current?.id === item.id ? 'selected ' : '') + item.status} onClick={() => setSelectedCase(item.id)}><span className="case-dot" /><span>{item.label}</span><span className="case-status">{item.status === 'passed' ? 'MATCH' : item.status.toUpperCase()}</span><ArrowRight size={14} /></button>)}</div>
                {current && <div className="comparison"><div className="comparison-header"><span>CASE / {current.id.toUpperCase()}</span><strong>{current.label}</strong></div>{current.difference && <div className="difference-note"><CircleAlert size={14} /><span>Observed difference at <strong>{current.difference.path}</strong>: {fmt(current.difference.expected)} → {fmt(current.difference.actual)}</span></div>}<div className="input-block"><span>INPUT CSV</span><pre>{current.input}</pre></div><div className="output-grid"><div><span className="output-label">LEGACY OUTPUT</span><pre>{fmt(current.baseline)}</pre></div><div className={current.status === 'passed' ? 'matched-output' : 'different-output'}><span className="output-label">CANDIDATE OUTPUT</span><pre>{fmt(current.candidate)}</pre></div></div></div>}</div></>}
            </div>}
            {tab === 'source' && <div className="panel-content source-content">{run?.source ? <><div className="source-head"><span><Code2 size={15} />{run.mode === 'agent' ? 'candidate/cli.ts' : 'seeded-regression/cli.cjs'}</span><small>{run.mode === 'agent' ? 'DOWNLOADED FROM MANAGED AGENT' : 'DELIBERATELY FLAWED EXAMPLE'}</small></div><pre className="code-view"><code>{run.source}</code></pre></> : <div className="empty-state"><Code2 size={25} /><h4>Candidate source will appear here.</h4><p>The generated file is shown verbatim after download from the agent environment.</p></div>}</div>}
            {tab === 'log' && <div className="panel-content log-content">{run?.events?.length ? <ol className="event-list">{[...run.events].reverse().map((item,index) => <li key={index}><time>{time(item.at)}</time><span className={'event-mark ' + item.type} /><div><strong>{item.message}</strong><small>{item.type.replaceAll('_',' ').toUpperCase()}{item.interactionId ? ' · ID ' + item.interactionId.slice(0, 18) + '…' : ''}</small>{item.prompt && <details><summary>View exact prompt</summary><pre>{item.prompt}</pre></details>}{item.summary && <details><summary>View agent summary</summary><pre>{item.summary}</pre></details>}{item.errors?.length > 0 && <details><summary>View diagnostics</summary><pre>{item.errors.join('\n')}</pre></details>}</div></li>)}</ol> : <div className="empty-state"><Terminal size={25} /><h4>Execution events will appear here.</h4><p>Agent calls, file retrieval, comparisons, and repairs are recorded in order.</p></div>}</div>}
            {tab === 'probe' && <div className="panel-content probe-content"><div className="probe-intro"><h4>Try your own edge case.</h4><p>Submit CSV to both programs. You’ll see the actual outputs side by side.</p></div><form onSubmit={submitProbe}><label htmlFor="probe-input">CSV INPUT</label><textarea id="probe-input" value={probeInput} onChange={event => setProbeInput(event.target.value)} spellCheck="false" /><button className="button primary" disabled={!run || isRunning || probeBusy || run.status === 'failed'} type="submit">{probeBusy ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}Run comparison</button></form>{probe && <div className="probe-result"><h5 className={probe.match ? 'good-text' : 'bad-text'}>{probe.match ? 'Behavior matched' : 'Behavior differed'}</h5><div className="output-grid"><div><span className="output-label">LEGACY OUTPUT</span><pre>{fmt(probe.expected)}</pre></div><div><span className="output-label">CANDIDATE OUTPUT</span><pre>{fmt(probe.actual)}</pre></div></div></div>}</div>}
            <div className="panel-footer"><span>{run ? 'RUN ' + run.id.slice(0, 8).toUpperCase() + ' · ' + time(run.updatedAt) : 'AWAITING FIRST RUN'}</span>{run && <a href={'/api/runs/' + run.id + '/report'} download><Download size={15} /> Download evidence report</a>}</div>
          </div>
        </div>
      </section>

      <section className="method section-wrap" id="method"><div className="section-heading"><div><div className="section-kicker">THE METHOD <span> / 02</span></div><h2>Trust is built in the open.</h2><p>A migration is only useful when you can inspect what changed and what survived.</p></div></div><div className="method-grid"><article><span className="method-number">01 / INPUT</span><div className="method-icon"><Layers3 size={23} /></div><h3>Give the agent a real contract.</h3><p>Argon receives the legacy source and a precise migration task. The verifier’s frozen cases stay outside the agent environment.</p></article><article><span className="method-number">02 / EXECUTION</span><div className="method-icon"><Sparkles size={23} /></div><h3>Let it build in a managed workspace.</h3><p>The Managed Agent writes TypeScript in its remote environment. We download the resulting file and run it locally.</p></article><article><span className="method-number">03 / EVIDENCE</span><div className="method-icon"><ShieldCheck size={23} /></div><h3>Compare behavior, not promises.</h3><p>The original and candidate run on identical inputs. Every output, error, mismatch, and repair attempt is visible.</p></article></div></section>
    </main>
    <footer className="site-footer"><div className="brand"><span className="brand-mark"><GitBranch size={17} /></span><span>migration<span className="brand-light">proof</span><span className="brand-dot">.</span></span></div><span>BUILT FOR THE GEMINI 4 ARGON HACKATHON</span><a href="#top">BACK TO TOP ↑</a></footer>
  </>;
}

createRoot(document.getElementById('root')).render(location.pathname.replace(/\/$/, '') === '/demo'
  ? <Suspense fallback={<div className="empty-state"><Layers3 size={28}/><h4>Opening the guided demo…</h4></div>}><GuidedMigration /></Suspense>
  : location.pathname.replace(/\/$/, '') === '/accelerator-demo'
  ? <Suspense fallback={<div className="empty-state"><Layers3 size={28}/><h4>Opening Accelerator Studio…</h4></div>}><AcceleratorDemo /></Suspense>
  : <App />);
