import { verifiedCandidate, verifiedRepair, repairSummary } from './live-demo-model.js';

export const chapterSeconds = [6, 10, 6, 6, 14, 10, 8];
export const durationSeconds = chapterSeconds.reduce((a,b)=>a+b,0);
export function validRecording(data) {
  return Boolean(data && verifiedCandidate(data.initial) && verifiedRepair(data.repair, data.repair?.id)
    && data.repair.parentRunId === data.initial.id && repairSummary(data.repair,data.initial).regressions === 1);
}
export function preparedFrame(data, elapsed) {
  if (!validRecording(data)) throw new Error('A verified preparation and repair are required.');
  let chapter=0, offset=Math.max(0,elapsed);
  while(chapter<6 && offset>=chapterSeconds[chapter])offset-=chapterSeconds[chapter++];
  const {initial,repair}=data;
  const injected=repair.attempts.find(a=>a.origin==='injected-test-regression');
  const working=(report,events,checks=[],attempts=[],artifacts={})=>({...report,status:'running',events,checks,attempts,artifacts});
  // Reveal original events in order. Completed checks/artifacts are withheld until their chapter.
  const progressEvents=(events)=>events.slice(0,Math.max(1,Math.ceil(Math.min(1,offset/chapterSeconds[chapter])*events.length)));
  let run,phase;
  if(chapter===0){run=null;phase='intro';}
  if(chapter===1){run=working(initial,progressEvents(initial.events.filter(e=>['created','request','started','tool'].includes(e.type))));phase='prepare';}
  if(chapter===2){run=initial;phase='candidate';}
  if(chapter===3){run=working(repair,repair.events.filter(e=>e.type==='test_injection'||(e.type==='verification'&&e.failed?.length)),injected.checks,[injected],injected.artifacts);phase='challenge';}
  if(chapter===4){run=working(repair,progressEvents(repair.events.filter(e=>['request','started','tool','response','artifact'].includes(e.type))),injected.checks,[injected],injected.artifacts);phase='repair';}
  if(chapter>=5){run=repair;phase='verified';}
  return {chapter,run,initial:chapter>=2?initial:null,phase,repairId:repair.id};
}
