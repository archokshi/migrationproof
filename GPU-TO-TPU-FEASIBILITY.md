# MigrationProof: NVIDIA GPU to Google TPU feasibility

Research date: October 25, 2026.

Implementation update: the current project now includes constrained SupportSearch source preparation, independent source checks, and real Argon repair evidence. GPU/TPU execution and benchmarks remain unimplemented. The assessment below records the initial feasibility research; see README.md for current demo behavior.

## Decision

This is a plausible product direction to validate. The current MigrationProof MVP cannot migrate or benchmark GPU/TPU workloads. It demonstrates agent orchestration, independent comparison, repair, and visible evidence on a local JavaScript-to-TypeScript fixture.

The proposed product question is: Can this particular AI service move from NVIDIA GPU to TPU while meeting its quality, latency, operational, and cost requirements?

The product must be capable of recommending that a workload remain on GPU. Hardware portability and lower cost are hypotheses to measure for each workload.

## Current ecosystem

Google announced open-source TorchTPU on October 20, 2026. It provides a native PyTorch backend for TPU and integrations with existing training and serving tools. Existing PyTorch/XLA paths remain relevant to older deployments, but a new pilot should evaluate the current TorchTPU support matrix first.

- [TorchTPU announcement](https://cloud.google.com/blog/topics/ai-infrastructure/torchtpu-is-now-open-source-run-native-pytorch-on-tpus/)
- [PyTorch on Cloud TPU](https://docs.cloud.google.com/tpu/docs/pytorch-on-tpu)
- [TorchTPU source](https://github.com/google-pytorch/torch_tpu)

Google and partners also released vLLM-TorchTPU and SGLang-TorchTPU. For a supported model, adopting an existing serving backend may eliminate much of the work that a bespoke code translator would attempt.

- [Serving-engine announcement](https://developers.googleblog.com/en/announcing-new-vllm-and-sglang-inference-engines-on-tpu/)
- [vLLM TorchTPU announcement](https://vllm.ai/blog/2026-10-20-vllm-torchtpu)

There is direct overlap with Google's TPU agent suite, which includes model onboarding, numerical checking, diagnostics, and kernel assistance. MigrationProof should reuse compatible official tooling and differentiate through application acceptance criteria, baseline capture, reproducible comparison, and release evidence. Integration of the suite into our specific Managed Agent environment still needs an implementation spike; it is not currently connected.

- [TPU agent suite](https://github.com/google-pytorch/tpu-agent-suite)

## What migration actually includes

An AI application usually contains accelerator-dependent model execution plus CPU-hosted APIs, preprocessing, storage, queues, authentication, and observability. TPU migration changes the compute path and potentially its serving/infrastructure configuration. It does not imply that the database or web application runs on TPU.

CUDA-specific kernels and compiled NVIDIA artifacts are not interchangeable with TPU executables. Supported framework operations may use an existing TPU backend. Unsupported/custom operations need a supported replacement or a separate kernel-porting project. Runtime, precision, shapes, checkpoint layouts, distributed collectives, memory use, and deployment configuration must be assessed explicitly.

TPU computation is compiled through XLA, with other program components running on the host.

- [TPU architecture overview](https://docs.cloud.google.com/tpu/docs/intro-to-tpu)

## Candidate use cases

| Workload | Customer | MigrationProof's proposed contribution | Priority |
|---|---|---|---|
| PyTorch embedding or classification service | ML platform lead at a SaaS company | Port one inference path; compare task quality, API behavior, latency, and cost | First pilot |
| LLM service using a supported vLLM model | Inference platform team | Adopt the existing TPU backend; replay requests and validate streaming, structured outputs, quality, and serving economics | Next |
| Fine-tuning pipeline | Applied ML or research team | Check checkpoint loading, optimizer behavior, learning curves, and quality across repeated runs | Later |
| Heavy custom CUDA/C++ application | GPU systems team | Identify blockers and supported replacements; route selected kernels for specialist work | Assessment first |
| Whole production estate | Enterprise platform organization | Dependency mapping, staged rollout, observability, rollback, and policy evidence | Beyond initial scope |

These customer priorities are product hypotheses, not evidence of willingness to pay.

## Recommended first pilot

Use a small PyTorch text-embedding service with one pinned model, tokenizer, preprocessing pipeline, and checkpoint. Start with a model whose operations pass a real TPU compatibility smoke test. Keep the external HTTP contract fixed.

1. Capture a reproducible CUDA baseline using representative, de-identified inputs.
2. Record repository commit, checkpoint/tokenizer hashes, environment versions, precision, batch sizes, and hardware identity.
3. Have Argon inspect accelerator dependencies and produce a migration plan with explicit blockers.
4. Reuse TorchTPU and supported libraries; generate only the necessary code/configuration changes.
5. Execute the candidate on a real TPU worker, independently of the migration agent.
6. Compare the two services against acceptance criteria frozen before the repair loop.
7. Repair failures with a bounded attempt and compute budget.
8. Return a candidate patch, complete evidence, and a decision: accepted for this workload, rejected, or not measured.

The first real-world demonstration should show the same semantic-search application using each backend, with an unchanged query interface. The useful outcome is whether retrieval quality and service requirements survive the move.

## Verification design

Exact JSON equality is insufficient for ML migration. GPU and TPU arithmetic can differ, and nondeterministic generation adds another source of variation. Numerical tolerances must be appropriate to the model and precision.

- [JAX numerical accuracy](https://docs.jax.dev/en/latest/accuracy.html)
- [Benchmarking and profiling guidance](https://docs.jax.dev/en/latest/201/profiling.html)

| Gate | Evidence |
|---|---|
| Execution provenance | Actual device type/count, framework/backend version, run IDs, timestamps; detect accidental CPU fallback |
| API compatibility | Schema, vector dimensions, ordering, errors, empty inputs, maximum lengths |
| Numerical behavior | NaN/Inf checks, vector norms, absolute/relative error and cosine similarity distributions |
| Product quality | Retrieval Recall@k or ranking metrics against labeled queries; report uncertainty and per-case failures |
| Performance | Warm and cold latency, compilation time, p50/p95 latency, throughput at matched offered load and input distribution |
| Economics | Cost per accepted unit of work, including provisioned accelerator time, host, warm-up, idle time, retries, and relevant data transfer |
| Reproducibility | Frozen dataset and artifact hashes, configs, raw results, repeated measurements |
| Release readiness | Integration tests and staged routing/rollback evidence when a real service is introduced |

Use the same weights and tokenizer for the initial inference pilot. Predeclare acceptable tolerances and quality/latency gates. Retain a holdout evaluation set that the repair agent cannot optimize directly against. Do not let the agent relax thresholds to obtain a green report.

A cheaper hourly device is not necessarily cheaper per completed request. A faster model kernel does not establish faster end-to-end application performance.

## Changes required in MigrationProof

Reusable foundations: run state, evidence UI, source/artifact display, attempt history, and independent-verifier pattern.

Required additions:

- Repository/dependency inspection for Python, CUDA, custom operations, model and deployment configuration.
- Separate authenticated GPU and TPU execution workers.
- Reproducible environment and checkpoint manifests.
- Tensor/task-quality comparators instead of the current JSON-only comparator.
- Workload replay, measurement, cost accounting, and execution provenance.
- Full per-attempt artifacts and immutable acceptance criteria.
- Explicit partial/blocked/untested states in the UI.

The interface should present separate Compatibility, Quality, Performance, Cost, and Operations results. “Conversion completed” must never imply all five passed.

## Compute and credentials

The existing Gemini API key lets MigrationProof call the migration agent. It does not establish our access to GPU or TPU compute. A real comparison needs an authorized GPU baseline and a Google Cloud project with billing, appropriate IAM, available TPU capacity/quota, and a bounded compute budget.

No GPU-to-TPU benchmark has been executed as part of this feasibility study. No performance, cost-saving, or TPU-compatibility claim is established by the existing 15-case CSV demonstration.

- [Google Cloud project setup](https://docs.cloud.google.com/tpu/docs/setup-gcp-account-compute)
- [Compute Engine TPU prerequisites](https://docs.cloud.google.com/compute/docs/tpus/create-tpu-vm-instance)

## Validation before expanding

Recruit a few teams with an actual pending hardware move and a representative replay workload. Measure onboarding effort, regressions found, review time saved, and whether the report changes their release decision. Compare the effort and evidence against running the official TPU onboarding tools directly.

Proceed only if MigrationProof provides useful additional evidence or substantially reduces the work of collecting it.
