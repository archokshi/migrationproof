import { useEffect, useRef, useState } from 'react';
import { durationSeconds, preparedFrame, validRecording } from './prepared-demo-model.js';

export default function usePreparedDemo() {
  const [data,setData]=useState(null),[elapsed,setElapsed]=useState(0),[playing,setPlaying]=useState(false),[started,setStarted]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const pending=useRef(false);
  useEffect(()=>{
    if(!playing)return;
    let previous=performance.now();
    const timer=setInterval(()=>{const now=performance.now(),delta=(now-previous)/1000;previous=now;setElapsed(t=>Math.min(durationSeconds,t+delta));},100);
    return()=>clearInterval(timer);
  },[playing]);
  useEffect(()=>{if(elapsed>=durationSeconds)setPlaying(false);},[elapsed]);
  async function start(){
    if(pending.current)return;
    pending.current=true;setLoading(true);setError('');
    try {
      const response=await fetch('/api/accelerator/prepared-demo');
      const recording=await response.json();
      if(!response.ok || !validRecording(recording))throw new Error(recording.error || 'Verified recording unavailable.');
      setData(recording);setElapsed(0);setStarted(true);setPlaying(true);
    }catch(e){setError(e.message);}
    finally{pending.current=false;setLoading(false);}
  }
  const frame=data&&started?preparedFrame(data,elapsed):{chapter:0,run:null,initial:null,phase:'idle',repairId:null};
  return {...frame,error,connection:'',playing,start,toggle:()=>setPlaying(p=>!p),elapsed,loading};
}
