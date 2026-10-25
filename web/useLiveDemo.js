import { useEffect, useRef, useState } from 'react';
import { verifiedCandidate, verifiedRepair } from './live-demo-model.js';

async function request(url, body) {
  const response = await fetch(url, body === undefined ? undefined : { method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body) });
  const value = await response.json();
  if(!response.ok)throw new Error(value.error || 'Request failed');
  return value;
}
export default function useLiveDemo(enabled = true) {
  const [chapter,setChapter] = useState(0);
  const [run,setRun] = useState(null);
  const [initial,setInitial] = useState(null);
  const [playing,setPlaying] = useState(false);
  const [phase,setPhase] = useState('idle');
  const [error,setError] = useState('');
  const [connection,setConnection] = useState('');
  const repairId = useRef(null), pending = useRef(false), challengeFor = useRef(null);
  useEffect(()=>{
    if(!enabled)return;
    let active=true;
    request('/api/accelerator/run').then(saved=>{
      if(active && saved?.status==='running'){
        setRun(saved);setPlaying(true);
        if(saved.origin==='injected-test-regression'){repairId.current=saved.id;challengeFor.current=saved.parentRunId;setPhase('repair');setChapter(4);}
        else {setPhase('prepare');setChapter(1);}
      }
    }).catch(e=>{if(active)setConnection(e.message);});
    return()=>{active=false;};
  },[enabled]);
  async function start(){
    if(pending.current || ['prepare','challenge','repair'].includes(phase))return;
    pending.current=true;setPhase('prepare');setChapter(0);setError('');setConnection('');setRun(null);setInitial(null);setPlaying(true);repairId.current=null;challengeFor.current=null;
    try {setRun(await request('/api/accelerator/run',{batchSize:16}));}
    catch(e){setError(e.message);setPhase('failed');setPlaying(false);}
    finally{pending.current=false;}
  }
  // Poll only the current task; a different task must never unlock this demo.
  useEffect(()=>{
    if(!run || run.status!=='running')return;
    let active=true,timer;
    async function poll(){
      try{
        const next=await request('/api/accelerator/run');
        if(!active)return;
        if(next?.id!==run.id){setError('Another run replaced this task. The demo has stopped.');setPhase('failed');setPlaying(false);return;}
        setRun(next);setConnection('');
        if(next.status==='running')timer=setTimeout(poll,2000);
      }catch(e){if(active){setConnection('Connection interrupted. Waiting to reconnect; migration stays paused.');timer=setTimeout(poll,3000);}}
    }
    timer=setTimeout(poll,1500);
    return()=>{active=false;clearTimeout(timer);};
  },[run?.id,run?.status]);
  useEffect(()=>{
    if(!run || phase==='idle' || phase==='failed')return;
    if(['failed','blocked'].includes(run.status)){setError(run.error || 'Independent checks still fail. Migration cannot continue.');setPhase('failed');setPlaying(false);return;}
    if(phase==='prepare'&&verifiedCandidate(run)){setInitial(run);setPhase('candidate');}
    if(phase==='repair'&&verifiedRepair(run,repairId.current))setPhase('verified');
  },[run,phase]);
  useEffect(()=>{
    if(chapter!==3 || phase!=='candidate' || challengeFor.current===run?.id)return;
    challengeFor.current=run.id;setPhase('challenge');
    request('/api/accelerator/challenge',{expectedRunId:run.id}).then(next=>{
      repairId.current=next.id;setRun(next);setPhase('repair');
    }).catch(e=>{setError(e.message);setPhase('failed');setPlaying(false);});
  },[chapter,phase,run?.id]);
  useEffect(()=>{
    if(!playing || phase==='failed' || phase==='idle')return;
    // No elapsed-time bypass: preparation and repair wait for actual evidence.
    if(chapter===1 && phase!=='candidate')return;
    if(chapter===3 && !['repair','verified'].includes(phase))return;
    if(chapter===4 && phase!=='verified')return;
    const delay=chapter===3?5000:chapter===4?3500:7000;
    const timer=setTimeout(()=>{if(chapter===6)setPlaying(false);else setChapter(c=>c+1);},delay);
    return()=>clearTimeout(timer);
  },[chapter,playing,phase]);
  return {chapter,run,initial,phase,error,connection,playing,start,toggle:()=>setPlaying(p=>!p),repairId:repairId.current};
}
