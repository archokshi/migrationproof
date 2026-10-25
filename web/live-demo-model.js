export function verifiedCandidate(run) {
  return run?.status === 'prepared' && run.checks?.length > 0 && run.checks.every(c => c.passed) && Boolean(run.attempts?.some(a => a.interaction));
}
export function verifiedRepair(run, expectedId) {
  return Boolean(expectedId && run?.id === expectedId && run.origin === 'injected-test-regression' && verifiedCandidate(run));
}
export function repairSummary(run, initial) {
  const injected = run?.attempts?.find(a => a.origin === 'injected-test-regression');
  const failed = injected?.checks.filter(c => !c.passed) || [];
  const recovered = failed.filter(c => run?.checks?.some(final => final.name === c.name && final.passed));
  return {
    regressions: injected && verifiedCandidate(run) && failed.length > 0 && recovered.length === failed.length ? 1 : 0,
    recovered: recovered.length,
    passed: run?.checks?.filter(c => c.passed).length || 0,
    total: run?.checks?.length || 0,
    attempts: [...(initial?.id !== run?.id ? initial?.attempts || [] : []), ...(run?.attempts || [])].filter(a => a.interaction).length
  };
}
