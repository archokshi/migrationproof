import React, { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, CircleAlert, Cpu, Database, FileCode2, GitBranch, Layers3, Maximize2, Pause, Play, RotateCcw, Search, ShieldCheck, SkipForward, Sparkles, Wrench } from 'lucide-react';
import { advanceDemo, stages, components, goodResults, badResults } from './accelerator-model.js';
import './accelerator.css';
import ArgonEvidence from './ArgonEvidence.jsx';
const MigrationScene = React.lazy(() => import('./MigrationScene.jsx'));

const query = 'How do I reset my device without losing its settings?';
const pipeline = ['Batch inputs', 'Encode text', 'Pool vectors', 'Normalize'];
const eventText = [
  'Source baseline captured from the demonstration fixture.',
  'CUDA bindings and embedding pipeline dependencies identified.',
  'TorchTPU candidate adaptation illustrated.',
  'The same fixture request replayed through the target path.',
  'Source and candidate result order compared.',
  'Illustrative traffic routed to the TPU path. GPU retained for rollback.'
];

export default function AcceleratorDemo() {
  useEffect(() => { document.title = 'GPU → TPU · MigrationProof 3D Demo'; }, []);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fault, setFault] = useState(true);
  const [repaired, setRepaired] = useState(false);
  const [selected, setSelected] = useState('gpu');
  const [view, setView] = useState('overview');
  const [history, setHistory] = useState(['Demo loaded. No GPU or TPU execution has occurred.']);
  const [highlight, setHighlight] = useState('DOC-104');
  const [presentation, setPresentation] = useState(false);
  const [liveRun, setLiveRun] = useState(null);
  useEffect(() => { if (liveRun) setPlaying(false); }, [liveRun]);
  const sceneStage = liveRun ? (liveRun.phase === 'verify' ? 4 : liveRun.phase === 'adapt' ? 2 : 1) : stage;
  const blocked = stage === 4 && fault && !repaired;
  const complete = stage === 5;
  const replayed = stage >= 3;
  const compared = stage >= 4;
  const results = fault && !repaired ? badResults : goodResults;

  function go(next) {
    const destination = next === 5 && fault && !repaired ? 4 : next;
    setStage(destination);
    setSelected(destination < 2 ? 'gpu' : destination === 2 || destination === 4 ? 'bridge' : 'tpu');
    setHistory(items => [...items, eventText[destination]]);
  }
  function next() {
    const state = advanceDemo(stage, fault, repaired);
    setPlaying(state.playing);
    if (state.stage !== stage) go(state.stage);
  }
  useEffect(() => {
    if (blocked) { setPlaying(false); return; }
    if (!playing || complete) return;
    const timer = setTimeout(next, 5600);
    return () => clearTimeout(timer);
  }, [playing, stage, fault, repaired]);
  function restart() {
    setStage(0); setPlaying(false); setRepaired(false); setSelected('gpu'); setView('overview');
    setHistory(['Demo reset. Source workload is ready.']);
  }
  function togglePlay() {
    if (complete) { restart(); setPlaying(true); return; }
    if (blocked) return;
    setPlaying(value => !value);
  }
  function repair() {
    setRepaired(true); setStage(2); setSelected('bridge'); setPlaying(true);
    setHistory(items => [...items, 'Simulated repair: restore the expected pooling/normalization path, then replay the fixture again.']);
  }
  function changeFault(checked) {
    setFault(checked); setStage(0); setPlaying(false); setRepaired(false); setSelected('gpu');
    setHistory([checked ? 'Regression scenario enabled. Verification will block the first switch.' : 'Clean scenario enabled. The fixture will preserve result order.']);
  }
  const detail = components[selected];

  return <div className={'accelerator-app' + (presentation ? ' presenting' : '')}>
    <header className="acc-header">
      <a href="/" className="brand"><span className="brand-mark"><GitBranch size={19} /></span><span>migration<span className="brand-light">proof</span><span className="brand-dot">.</span></span></a>
        <div className="acc-breadcrumb"><a href="/demo">PLAY THE GUIDED DEMO →</a><ChevronRight size={12} /><strong>SupportSearch</strong></div>
      <a className="acc-back" href="/#workbench"><ArrowLeft size={14} /> Live code workbench</a>
    </header>

    <main className="acc-main">
      <div className="acc-intro">
        <div><div className="acc-eyebrow"><span /> HARDWARE CHANGES. THE APPLICATION CONTINUES.</div><h1>One workload.<br className="mobile-break" /> A new place to run.</h1><p>Follow SupportSearch from NVIDIA GPU to Google TPU—with MigrationProof checking the handover.</p></div>
        <div className="simulation-badge"><span className="sim-dot" /><div><strong>{liveRun?'REAL AGENT + 3D VISUALIZATION':'INTERACTIVE SIMULATION'}</strong><small>{liveRun?'Hardware execution remains pending':'Illustrative hardware & fixture outputs'}</small></div></div>
      </div>

      <ArgonEvidence onRun={setLiveRun} live={Boolean(liveRun)} />
      <section className="migration-theater" aria-label="Interactive GPU to TPU migration simulation">
        <div className="theater-toolbar"><div><span className="theater-dot" /><strong>SUPPORTSEARCH</strong><span className="toolbar-divider">/</span><span>{liveRun?'REAL AGENT STATE · VIRTUAL HARDWARE':'SIMULATION'}</span></div><button onClick={() => setPresentation(!presentation)} aria-pressed={presentation}><Maximize2 size={14} />{presentation ? 'Exit focus' : 'Focus view'}</button></div>
        <div className="station-headings">
          <div className="source-heading"><span className="station-number">01</span><div><small>SOURCE INFRASTRUCTURE</small><h2>NVIDIA GPU</h2><p><span className={complete ? 'standby-light' : 'source-light'} />{liveRun?'CUDA source supplied':complete ? 'Standby · rollback available' : 'Source path active'} <em>· {liveRun?'not executing':'simulated'}</em></p></div></div>
          <div className="middle-heading"><ShieldCheck size={22} /><span>MigrationProof</span><small>INSPECT → ADAPT → VERIFY</small></div>
          <div className="target-heading"><div><small>TARGET INFRASTRUCTURE</small><h2>Google TPU</h2><p><span className={replayed ? 'target-light' : 'standby-light'} />{liveRun?'Hardware execution pending':complete ? 'Target path active' : replayed ? 'Candidate replay' : 'Awaiting workload'} <em>· {liveRun?'not executing':'simulated'}</em></p></div><span className="station-number">02</span></div>
        </div>

        <div className="scene-container">
          <Suspense fallback={<div className="scene-loading"><Cpu size={28} /><span>Assembling the 3D hardware…</span></div>}><MigrationScene stage={sceneStage} playing={liveRun?liveRun.status==='running':playing} fault={liveRun?true:fault} repaired={liveRun?false:repaired} selected={liveRun?'bridge':selected} onSelect={setSelected} view={view} /></Suspense>
          <div className="scene-tools"><span>DRAG TO ORBIT · SCROLL TO ZOOM</span><div>{[['overview','Overview'],['gpu','GPU close-up'],['tpu','TPU close-up']].map(([id,label]) => <button key={id} onClick={() => { setView(id); if(id !== 'overview')setSelected(id); }} className={view === id ? 'active' : ''} aria-pressed={view === id}>{label}</button>)}</div></div>
          <div className="hardware-note">Representative cutaway models · not a specific NVIDIA or Google hardware SKU</div>
        </div>

        {liveRun?<div className="stage-narration blocked" aria-live="polite"><ShieldCheck size={30}/><div><span className="narration-label">ACTUAL AGENT STATUS · {liveRun.status.toUpperCase()}</span><h3>{liveRun.status==='prepared'?'Candidate prepared. Hardware release stays blocked.':liveRun.status==='running'?'Argon is preparing the TPU migration.':'Review the agent evidence above.'}</h3><p>{liveRun.events.at(-1)?.message} This scene visualizes preparation; it does not show executing hardware.</p></div></div>:<><div className={'stage-narration ' + (blocked ? 'blocked' : complete ? 'finished' : '')} aria-live="polite">
          <span className="narration-index">{String(stage + 1).padStart(2,'0')}<small>/ 06</small></span>
          <div><span className="narration-label">{blocked ? 'SWITCH BLOCKED' : complete ? 'SIMULATION COMPLETE' : playing ? 'MIGRATION IN PROGRESS · SIMULATED' : 'STEP THROUGH THE MIGRATION'}</span><h3>{blocked ? 'A running model can still return the wrong result.' : complete ? 'Same application. Verified demo behavior. New backend.' : stages[stage].title}</h3><p>{blocked ? 'The candidate changed the search ranking. MigrationProof holds traffic on the GPU path until the demonstration gate passes.' : stages[stage].detail}</p></div>
          {blocked && <button className="acc-button repair" onClick={repair}><Wrench size={16} />Show repair & replay</button>}
        </div>

        <div className="demo-controls">
          <div className="transport"><button className="acc-button play" onClick={togglePlay} disabled={blocked}>{playing ? <Pause size={17} /> : complete ? <RotateCcw size={17} /> : <Play size={17} />}{playing ? 'Pause' : complete ? 'Replay migration' : stage === 0 ? 'Play migration' : 'Continue'}</button><button className="icon-control" onClick={() => {setPlaying(false);const state=advanceDemo(stage,fault,repaired);if(state.stage!==stage)go(state.stage);}} disabled={blocked || complete} aria-label="Next migration step" title="Next step"><SkipForward size={18} /></button><button className="icon-control" onClick={restart} aria-label="Reset simulation" title="Reset"><RotateCcw size={16} /></button></div>
          <label className="fault-toggle"><input type="checkbox" checked={fault} onChange={event => changeFault(event.target.checked)} /><span className="toggle-track" /><span>Include a ranking regression<small>See the verification gate stop a bad switch</small></span></label>
          <span className="demo-runtime">~30 SEC + OPTIONAL REPAIR</span>
        </div>
        <ol className="migration-timeline" aria-label="Migration stages">{stages.map((item,index) => <li key={item.short} className={(index===stage?'current ':'')+(index<stage?'done ':'')+(index===4&&blocked?'has-fault':'')}><button onClick={() => { setPlaying(false); go(index); }} aria-current={index===stage?'step':undefined} disabled={index===5&&fault&&!repaired}><span>{index<stage?<Check size={13}/>:String(index+1).padStart(2,'0')}</span>{item.short}</button></li>)}</ol>
        </>}
      </section>

      <section className="workload-scope" aria-label="Workload migration scope">
        <div className="scope-title"><Layers3 size={18}/><div><strong>The workload that moves</strong><small>Same model weights and tokenizer in the proposed migration</small></div></div>
        <div className="scope-pipeline">{pipeline.map((name,index) => <React.Fragment key={name}><span className={stage>=2?'adapted':''}>{name}</span>{index<pipeline.length-1&&<ArrowRight size={13}/>}</React.Fragment>)}</div>
        <div className="shared-services"><Database size={15}/><span>Shared services: API · documents · search index</span></div>
      </section>

      {!liveRun&&<div className="acc-lower-grid">
        <section className="application-replay" id="replay">
          <div className="acc-section-top"><div><span className="acc-kicker">THE APPLICATION</span><h2>Does the search still work?</h2></div><span className="fixture-label">ILLUSTRATIVE REPLAY</span></div>
          <div className="search-fixture"><Search size={18}/><div><small>FIXED DEMO QUERY</small><p>{query}</p></div></div>
          <div className="replay-columns">
            <ResultPanel name="GPU baseline" color="gpu" results={goodResults} highlight={highlight} onHighlight={setHighlight} />
            <ResultPanel name="TPU candidate" color="tpu" results={replayed?results:null} highlight={highlight} onHighlight={setHighlight} failed={compared&&fault&&!repaired} />
          </div>
          <div className={'replay-verdict '+(blocked?'bad':compared?'good':'pending')}><ShieldCheck size={18}/><div><strong>{blocked?'Ranking changed · traffic switch blocked':compared?'Demo result ordering matches':'Comparison pending'}</strong><span>{blocked?'DOC-317 displaced DOC-104 as the first result.':compared?'The same three fixture documents appear in the same order.':'Advance to Replay and Verify to compare the fixture outputs.'}</span></div>{repaired&&<span className="repaired-pill"><Check size={12}/>REPAIRED IN SIMULATION</span>}</div>
          <p className="replay-disclaimer">These are deterministic demonstration records, not model-generated search results. Numerical accuracy, latency, throughput, and cost require real GPU and TPU runs.</p>
        </section>

        <aside className="migration-inspector">
          <div className="inspector-tabs" role="group" aria-label="Inspect migration components">{[['gpu','GPU',Cpu],['bridge','MigrationProof',ShieldCheck],['tpu','TPU',Cpu]].map(([id,label,Icon])=><button key={id} className={selected===id?'active':''} aria-pressed={selected===id} onClick={()=>setSelected(id)}><Icon size={14}/>{label}</button>)}</div>
          <div className="inspector-detail"><span className="acc-kicker">UNDER THE HOOD</span><h3>{detail.title}</h3><p>{detail.body}</p><ul>{detail.changes.map(text=><li key={text}><Check size={13}/>{text}</li>)}</ul></div>
          <div className="evidence-gates"><h4>Release evidence</h4><Gate label="API / result contract" state={compared?'Fixture checked':'Pending replay'} kind={compared?'pass':'pending'}/><Gate label="Search result order" state={blocked?'Mismatch':compared?'Fixture matched':'Pending replay'} kind={blocked?'fail':compared?'pass':'pending'}/><Gate label="GPU / TPU execution" state="Not measured" kind="unmeasured"/><Gate label="Latency & throughput" state="Not measured" kind="unmeasured"/><Gate label="Cost per request" state="Not measured" kind="unmeasured"/></div>
        </aside>
      </div>}

      {!liveRun&&<section className="demo-log"><div><FileCode2 size={17}/><span>SIMULATION EVENT LOG</span><small>{history.length} events</small></div><ol>{history.slice(-5).reverse().map((text,index)=><li key={history.length-index}><span>{String(history.length-index).padStart(2,'0')}</span>{text}</li>)}</ol></section>}
      <footer className="acc-footer"><p><strong>From demonstration to deployment.</strong> The next implementation step is authenticated GPU and TPU workers with frozen quality gates and reproducible measurements.</p><a href="/#workbench">Open the real Argon code migration <ArrowUpRight size={16}/></a></footer>
    </main>
  </div>;
}

function ResultPanel({ name, color, results, highlight, onHighlight, failed }) {
  return <div className={'result-panel '+color+(failed?' ranking-failed':'')}><div className="result-panel-head"><Cpu size={14}/><strong>{name}</strong><span>{results?'FIXTURE OUTPUT':'WAITING'}</span></div>{results?<ol>{results.map((item,index)=><li key={item.id}><button onClick={()=>onHighlight(item.id)} className={highlight===item.id?'highlighted':''}><span className="result-rank">{index+1}</span><div><small>{item.id}</small><h4>{item.title}</h4><p>{item.text}</p></div></button></li>)}</ol>:<div className="result-waiting"><Cpu size={27}/><strong>The target is waiting.</strong><p>Replay the workload to reveal the candidate results.</p></div>}</div>;
}
function Gate({label,state,kind}) {return <div className={'evidence-gate '+kind}><span>{kind==='pass'?<Check size={13}/>:kind==='fail'?<CircleAlert size={13}/>:<span className="gate-dot"/>}{label}</span><strong>{state}</strong></div>;}
