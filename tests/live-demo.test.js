import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedCandidate, verifiedRepair, repairSummary } from '../web/live-demo-model.js';
const good = { id: 'fresh', status: 'prepared', origin: 'injected-test-regression', checks: [{name:'math',passed:true},{name:'contract',passed:true}], attempts: [{origin:'injected-test-regression',checks:[{name:'math',passed:false},{name:'contract',passed:false}]},{interaction:{id:'remote'}}] };
test('live continuation requires fresh, completed, nonempty independently checked repair',()=>{
  assert.equal(verifiedRepair(good,'fresh'),true);
  assert.equal(verifiedRepair(good,'old'),false);
  assert.equal(verifiedRepair({...good,status:'running'},'fresh'),false);
  assert.equal(verifiedRepair({...good,checks:[]},'fresh'),false);
  assert.equal(verifiedRepair({...good,checks:[{passed:false}]},'fresh'),false);
  assert.equal(Boolean(verifiedCandidate({...good,attempts:[]})),false);
});
test('one injected defect that trips two checks is counted as one repaired regression',()=>{
  assert.deepEqual(repairSummary(good,null),{regressions:1,recovered:2,passed:2,total:2,attempts:1});
  assert.equal(repairSummary({...good,status:'failed'},null).regressions,0);
  assert.equal(repairSummary(good,good).attempts,1);
});
