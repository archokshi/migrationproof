export const stages = [
  { title: 'Capture baseline', short: 'Baseline', detail: 'Record the GPU application’s inputs, model configuration, and expected search results.' },
  { title: 'Map the dependencies', short: 'Inspect', detail: 'Identify CUDA device bindings, batching, precision, and model operations that need a TPU execution path.' },
  { title: 'Adapt the workload', short: 'Adapt', detail: 'Illustrate Argon preparing a TorchTPU candidate while preserving the model, tokenizer, and API contract.' },
  { title: 'Replay on the target', short: 'Replay', detail: 'Send the same illustrative requests through the TPU candidate and preserve both outputs for comparison.' },
  { title: 'Check the evidence', short: 'Verify', detail: 'Compare result ordering and contract behavior. A failed gate prevents the simulated traffic switch.' },
  { title: 'Route to the TPU path', short: 'Switch', detail: 'Illustrate a staged traffic switch after the demonstration checks pass, with the GPU path retained for rollback.' }
];

export function advanceDemo(stage, fault, repaired) {
  if (stage === 4 && fault && !repaired) return { stage, playing: false, blocked: true };
  if (stage >= stages.length - 1) return { stage, playing: false, blocked: false };
  return { stage: stage + 1, playing: stage + 1 < stages.length - 1, blocked: false };
}

export const components = {
  gpu: { title: 'Source · NVIDIA GPU', body: 'The existing PyTorch encoder uses CUDA. In a hardware-backed run, this worker would establish the reference outputs and measurements.', changes: ['Capture model and tokenizer hashes', 'Record precision and batch shapes', 'Preserve a reproducible source environment'] },
  bridge: { title: 'MigrationProof · review gate', body: 'The agent proposes the change. An independent comparison determines whether the candidate meets the agreed requirements.', changes: ['Inspect compatibility before rewriting', 'Freeze acceptance criteria before repairs', 'Retain failed attempts and evidence'] },
  tpu: { title: 'Target · Google TPU', body: 'The proposed target uses a supported TorchTPU execution path. This visualization does not provision or execute a TPU.', changes: ['Replace accelerator-specific device bindings', 'Validate operators, pooling, and precision', 'Measure quality and performance on real hardware'] }
};

export const goodResults = [
  { id: 'DOC-104', title: 'Back up and restore device settings', text: 'Export the configuration, reset the device, then restore the saved configuration.' },
  { id: 'DOC-208', title: 'Restart without changing configuration', text: 'A normal restart retains the saved configuration and network settings.' },
  { id: 'DOC-317', title: 'Factory reset reference', text: 'A factory reset removes saved settings. Create a backup before continuing.' }
];
export const badResults = [goodResults[2], goodResults[1], goodResults[0]];
