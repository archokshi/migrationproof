# MigrationProof: Argon prepares the migration; evidence decides the release

## One-minute prepared 3D migration

Open `/demo` and click **Start migration**. This is a clearly labeled replay of actual Argon interactions, not a fresh live run. Waiting time is compressed. The verified recording is pinned so later live runs cannot change the demo.

| Time | Story |
| --- | --- |
| 0:00–0:06 | Meet SupportSearch and the GPU encoder |
| 0:06–0:16 | Recorded Argon preparation and tools |
| 0:16–0:22 | Actual TPU candidate files |
| 0:22–0:28 | Injected normalization fault; transfer stops |
| 0:28–0:42 | Recorded Managed Agent repair |
| 0:42–0:52 | 1 regression repaired, 2 checks recovered, 18/18 passed |
| 0:52–1:00 | TPU handover preview |

Suggested opening: “This is a time-compressed replay of our real Argon run. Watch the code fail verification, the managed agent repair it, and the independent checks unlock the migration.”

For the one-minute submission video, start the migration as you begin the narration. The prepared sequence runs for 60 seconds without pauses. Pause migration freezes the replay clock; Continue migration resumes from that point.

## Automatic live 3D migration

The `/demo?mode=live` route starts a fresh preparation and repair workflow with one start action. It introduces SupportSearch, explains CUDA versus the TPU backend, waits for real Argon artifacts, deliberately injects a normalization regression, then automatically invokes Managed Agent repair. Large on-screen announcements identify when Argon is working. The transfer animation stops at the fault; only the agent workspace remains active during repair. The sequence cannot advance past the repair gate using a timer or chapter button.

The closing scoreboard counts actual results: one deliberately injected defect can cause two failed checks, so it must not be described as two independent bugs fixed. The final success statement is “100% of source-contract checks passed,” with hardware and production readiness explicitly pending. The last traffic switch is labeled a preview. Real API tasks may take several minutes; the sequence no longer promises a one-minute duration.

The live evidence workbench still supports inspecting saved reports and manually starting a repair challenge. The judging outline below can use those saved artifacts when time is limited, but a saved result must never be introduced as a currently running task.

## Who and why

The first user is an ML platform engineer evaluating a move from CUDA to Google TPU. The decision is not just whether a model can load: device bindings, batching, precision, tokenization, pooling and application outputs must survive the change. A candidate patch is the beginning of the validation process.

MigrationProof's proposed value is a reviewable migration record: source inputs, agent-produced artifacts, independent checks, failed attempts, repairs and remaining release requirements in one place. We have not measured engineering time saved or accelerator cost/performance improvements.

## What is real today

- The 3D page calls `gemini-4-argon` through Managed Agent `antigravity-preview-09-2026`, using the server-side Gemini key.
- It uploads three purpose-built SupportSearch source/contract files to a remote agent environment. The model reads and writes actual files; the UI displays returned tool events and interaction IDs.
- Argon generates `encoder.py`, `runtime.json` and `migration.md`. The requested batch size is an input the presenter can change.
- A local independent checker parses Python without executing it and checks runtime JSON. It verifies a deliberately narrow source contract, including unchanged pooling/normalization and only approved AST transformations.
- Failed checks are returned in a follow-up interaction using the same remote environment. Attempts and artifact hashes are retained.
- A presenter can deliberately change L2 normalization to L1 in a copy of the candidate, observe the independent failure, and invoke a real Argon repair. This is visibly labeled a test injection, not a model mistake.
- The existing CSV workbench separately executes generated TypeScript against 15 frozen behavior cases. This demonstrates runtime verification on an executable local scenario; it does not validate the TPU specimen.

## What is illustrative or pending

The GPU/TPU hardware geometry and support-search rankings are illustrative. The CUDA specimen has not been executed on a GPU; the candidate has not been executed on a TPU. The AST gate does not prove numerical parity, model compatibility, ranking quality, hardware performance or savings. The agent-authored migration plan is not independently validated prose. Release stays blocked in actual-run mode even when all source checks pass.

The current specimen is intentionally small and constrained. Do not claim it demonstrates million-token scale, a whole enterprise migration, or capabilities uniquely impossible with other models. Scaling to multi-module workloads with measured migration effort is future evaluation.

## Why Argon and Managed Agents matter

Argon is the model doing source analysis, candidate edits and the written migration plan. Managed Agent supplies the remote working environment and tool execution, background interaction, persistent state and follow-up repair. MigrationProof supplies the frozen contract, independent verification, evidence and release boundary. A chat answer alone would not produce this inspectable file-and-verification workflow.

## Three-minute judging sequence

Preflight: start a real run before judging; keep its completed evidence available. Live calls can take several minutes. Never present a saved run as happening live. The page labels saved results with time and ID.

1. **0:00–0:20 — Problem/persona.** “An ML platform engineer wants to move an embedding worker from CUDA to TPU. A patch that looks correct is not enough to switch traffic.”
2. **0:20–0:40 — Hardware orientation.** Show the 3D source, agent gate and target. Say “This is a visualization. The source files and agent work you are about to see are real.”
3. **0:40–1:15 — Actual Argon work.** Show the saved real interaction, source versus output, changed device/batch/backend import, and artifact hashes in the downloaded report. Choose a different batch size and start a live run if time permits; label it as pending.
4. **1:15–1:55 — Independent evidence.** Expand the checks. Explain that the verifier is outside the agent environment, and the agent cannot turn its own prose into a passing gate. If no live run is active, click “Inject regression & ask Argon to repair.” Show the actual failed normalization checks and feedback event. Do not wait silently for the repair; continue the pitch.
5. **1:55–2:30 — Release decision.** Show “Blocked · hardware evidence required.” Explain that passing source checks is insufficient to route user traffic. Show the separate CSV runtime evidence only if judges ask for executed behavioral comparisons.
6. **2:30–3:00 — Product direction.** “Next we attach authenticated GPU/TPU workers, freeze numerical/ranking/latency requirements, replay the same corpus, and permit a canary only when those measurements pass.” End on the real artifact and verification evidence, not a fabricated performance chart.

## One-minute video sequence

- 0–10 seconds: persona, problem, 3D source/target.
- 10–25 seconds: actual saved Argon interaction and source changes. Caption: “Recorded real run — source preparation, no accelerator execution.”
- 25–45 seconds: injected regression, failing checks, real follow-up interaction; use the saved completed repair evidence if available, clearly labeled.
- 45–60 seconds: corrected source checks plus the still-blocked hardware release. “Generate the change. Verify the contract. Show the remaining risk.”

## Track positioning

The supplied participant guide gives working live demo 50%, usefulness 25%, originality 15%, clarity 10% in the first round. The most defensible fit is **Million Token Engineering / migration tooling**, plus **Best use of Managed Agents**. SupportSearch is the specimen, not a basic RAG product. The 3D interface explains evidence; it is not the core product. Do not enter the More Dimensions story on the strength of this visualization alone: Argon did not generate, watch, critique and repair the 3D renderer.

Show original hackathon contributions accurately. Repository publication and submission are separate actions; this work has not published the repository or submitted the project.

## Sources

- Participant guide supplied by the user, October 25, 2026.
- [Managed Agent API](https://ai.google.dev/gemini-api/docs/antigravity-agent): remote tools, background runs and continuation in the same environment.
- [TorchTPU project](https://github.com/google-pytorch/torch_tpu) and [Hugging Face Google TPU guidance](https://huggingface.co/docs/transformers/main/google_tpu): target backend and shape considerations. These references do not establish compatibility of this specimen.
