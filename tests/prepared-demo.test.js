import test from 'node:test';
import assert from 'node:assert/strict';
import { preparedFrame, validRecording, durationSeconds } from '../web/prepared-demo-model.js';
import { verifiedRepair, repairSummary } from '../web/live-demo-model.js';
import { preparedDemo } from '../src/prepared-demo.js';
import { checkAccelerator, digest } from '../src/accelerator-checks.js';
const checks=[{name:'math',passed:true},{name:'contract',passed:true}];
const initial={id:'prep',status:'prepared',checks,attempts:[{interaction:{id:'first'}}],artifacts:{},events:[{type:'request'},{type:'tool'},{type:'complete'}]};
const injected={origin:'injected-test-regression',checks:checks.map(c=>({...c,passed:false})),artifacts:{}};
const repair={id:'repair',parentRunId:'prep',status:'prepared',origin:injected.origin,checks,attempts:[injected,{interaction:{id:'second'}}],events:[{type:'test_injection'},{type:'verification',failed:injected.checks},{type:'request'},{type:'tool'},{type:'verification',failed:[]},{type:'complete'}]};
const data={initial,repair};
test('bundled real recording preserves artifact hashes and reproduces failure and repair',async()=>{
  const recording=await preparedDemo();
  assert.equal(validRecording(recording),true);
  for(const run of [recording.initial,recording.repair]){
    for(const attempt of run.attempts){
      for(const [name,hash] of Object.entries(attempt.hashes||{}))assert.equal(digest(attempt.artifacts[name]),hash);
      const fresh=await checkAccelerator(attempt.artifacts,run.batchSize);
      assert.deepEqual(fresh,attempt.checks);
    }
  }
});
test('prepared migration lasts 60 seconds and withholds success until recorded verification',()=>{
  assert.equal(durationSeconds,60);
  for(const [elapsed,chapter] of [[0,0],[6,1],[16,2],[22,3],[28,4],[41.9,4],[42,5],[52,6],[60,6]]){
    const frame=preparedFrame(data,elapsed);
    assert.equal(frame.chapter,chapter);
    assert.equal(verifiedRepair(frame.run,frame.repairId),chapter>=5);
    if(chapter===3||chapter===4){assert.equal(frame.run.checks.filter(c=>!c.passed).length,2);assert.equal(repairSummary(frame.run,frame.initial).regressions,0);}
  }
  assert.deepEqual(repairSummary(preparedFrame(data,60).run,initial),{regressions:1,recovered:2,passed:2,total:2,attempts:2});
});
test('prepared migration rejects unrelated or unsuccessful evidence',()=>{
  for(const bad of [null,{initial,repair:{...repair,parentRunId:'other'}},{initial,repair:{...repair,status:'failed'}},{initial,repair:{...repair,attempts:[{interaction:{}}]}}]){
    assert.equal(validRecording(bad),false);
    assert.throws(()=>preparedFrame(bad,60));
  }
});
