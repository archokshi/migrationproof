# MigrationProof

MigrationProof is an interactive workbench for AI-assisted application and workload migrations. Gemini 4 Argon and Managed Agents generate and repair migration candidates; independent checks make changes, failures, and repair results inspectable. The included examples cover a CommonJS-to-TypeScript inventory importer and source preparation for a GPU-to-TPU embedding worker.

The sample inventory importer is an example workload. The product is the migration, verification, repair, and evidence workflow.

## Run locally

Requires Node.js 24 or newer and a Gemini API key with access to `gemini-4-argon` and `antigravity-preview-09-2026`. The accelerator source checker additionally requires Python 3.10+ (`python` on PATH or the `PYTHON` environment variable).

1. Run `npm install`.
2. For live agent calls, copy `.env.example` to `.env` and set `GEMINI_API_KEY` there. The prepared 60-second demo and seeded CSV example work without a key. The key is used only by the Node server. `.env` is ignored by Git.
3. Run `npm test`.
4. Run `npm run build`.
5. Run `npm start`, then open [http://localhost:8787](http://localhost:8787).

The server binds to `127.0.0.1`. For UI development, run `npm start` and `npm run dev` in separate terminals, then open [http://localhost:5173](http://localhost:5173).

## Demo paths

- **Prepared 3D migration** at [http://localhost:8787/demo](http://localhost:8787/demo): a 60-second replay of the verified real preparation and repair pair, with compressed waits, original events and checks, and visible REPLAY labels. Start once; pause/resume retains elapsed progress. No new agent calls or quota use. Sanitized evidence from the verified real run is bundled in `fixtures/prepared-demo/`, so the replay works from a fresh checkout without API access. Remote interaction and environment IDs are replaced with labeled placeholders. Artifact contents, hashes, checks and timestamps are retained; missing or invalid evidence fails closed. Final TPU handover stays a preview.
- **Automatic live 3D demo** at [http://localhost:8787/demo?mode=live](http://localhost:8787/demo?mode=live): start once to create a fresh Argon preparation run. The migration view waits for real generated files and checks, injects a normalization fault, automatically invokes a real repair in the same managed environment, and resumes only when that repair passes fresh checks. No repair click or timer bypass is available. It uses Gemini API quota and can take several minutes. The final TPU handover is explicitly a preview; the summary reports repaired regressions, recovered checks, agent attempts and the source-check percentage, not production readiness. Pausing the migration view does not cancel the background agent task. Connection loss keeps the gate closed while polling retries.
- **3D GPU → TPU studio** at [http://localhost:8787/accelerator-demo](http://localhost:8787/accelerator-demo) illustrates the SupportSearch embedding workload moving from NVIDIA/CUDA to a Google TPU candidate. Click **Play migration**, inspect the hardware with **GPU close-up** and **TPU close-up**, and follow the six stages. With the ranking regression enabled, Verify blocks the switch; **Show repair & replay** demonstrates a correction and the subsequent handover. **Focus view** is intended for presenting or screen recording.
- The studio now includes **Run Argon migration**: a real Managed Agent prepares the included SupportSearch CUDA specimen for a TPU trial, with a selectable batch size. Inspect the actual source/output files, interaction IDs, remote tool events, 18 independent source-contract checks and downloadable hashed evidence. **Inject regression & ask Argon to repair** deliberately changes a copy's L2 normalization to L1, checks the failure locally and asks Argon to repair it in the same remote environment. The original good artifact is retained in its report.
- Hardware geometry and search rankings remain illustrative. Actual-run mode never authorizes a simulated traffic switch: no GPU/TPU inference or hardware performance was measured. Source-contract checks are AST/JSON checks, not runtime parity. The agent-authored plan requires human review. See [the judging script and claim boundaries](HACKATHON-DEMO-STORY.md).
- **See a caught regression** runs a deliberately flawed migration. Its only behavioral difference is that ID `00127` becomes `127`. The workbench should show 14 of 15 matches, one mismatch, and the exact differing field.
- **Run live migration** sends the legacy source to Argon Managed Agent in a remote environment. The app downloads `candidate/cli.ts`, checks its types, compiles it, runs the parity corpus, and sends diagnostics back for up to two repair attempts. A live run can take several minutes and uses your Gemini API quota.
- **Custom probe** submits your CSV to both programs after a run and shows the actual results side by side.
- **Download evidence report** saves the run's events, source, attempts, case results, and probes as JSON.

## What the status means

“Passed” means the candidate type-checked and matched the legacy program on the current 15-case corpus. It is evidence of observed parity, not proof of equivalence for every possible input. “Mismatch” means at least one case differed after the repair limit. “Failed” means the workflow stopped before a valid comparison completed. The seeded regression is clearly labeled as a demonstration, not an Argon output.

## Architecture

- `src/agent.js`: Gemini Argon Managed Agent calls, remote file retrieval, strict TypeScript check, compilation, and progress events.
- `src/verifier.js`: runs both programs with a Node filesystem permission boundary, stripped environment, output limit, and timeout, then compares structured outputs.
- `src/corpus.js`: frozen behavior cases kept outside the agent's initial remote workspace.
- `src/runs.js`: run orchestration, repair loop, persisted reports, and custom probes.
- `src/server.js`: local JSON API and built frontend.
- `src/accelerator-runs.js`: remote SupportSearch preparation and follow-up repair; reports under `.runs/accelerator/`.
- `src/accelerator-checks.js` and `src/check-accelerator.py`: independent source-contract verification; Python parses source as data and never imports or executes generated code.
- `web/`: React workbench and Three.js evidence graph, with a text case list as an accessible alternative.
- `fixtures/`: legacy workload and a seeded regression.

Generated code is executed only in a child process with no inherited API key. Node's permission model limits filesystem reads to the run or fixture area. This is a controlled local demonstration workload; it is not yet a service for executing arbitrary uploaded repositories.

## API

- `GET /api/health`: model, agent, and server-side key configuration status.
- `GET /api/accelerator/prepared-demo`: the pinned, validated preparation/repair reports used by the 1:00 recording mode.
- `GET /api/accelerator/input`, `GET /api/accelerator/run`, `POST /api/accelerator/run` with `{"batchSize":16}`, `POST /api/accelerator/challenge`, and `GET /api/accelerator/report`: live accelerator preparation, repair challenge and evidence.
- `GET /api/scenario`: workload and behavior contract.
- `POST /api/runs` with `{"mode":"agent"}` or `{"mode":"seeded"}`.
- `GET /api/runs/:id`: run state and evidence.
- `POST /api/runs/:id/probe` with `{"input":"id,name,quantity,description\n..."}`.
- `GET /api/runs/:id/report`: downloadable JSON report.

Reports and generated code are stored under ignored `.runs/`. Runs survive a server restart when a report has been saved.

## Verified locally on October 25, 2026

- Live Argon run `841b673d-a01f-4a1f-ac9b-aadc249bc643`: strict TypeScript check passed; 15/15 frozen behavior cases matched.
- Seeded regression: 14/15 cases matched; the verifier identified `output.value[0].id` changing from `"00127"` to `"127"`.
- A new browser-entered probe combining a leading-zero ID, quoted comma, and escaped quotes matched.
- Automated tests passed, including the HTTP workflow, credential isolation, filesystem boundary, execution timeout, simulation gate transitions, source gates rejecting normalization regressions and misleading comments, and fresh-run repair gating. A stale candidate ID is rejected before starting a repair.
- Automatic live 3D workflow verified in the browser: preparation `878192f5-cec6-4bdf-ade8-5c627eb06de4` led to repair `40cc6425-6f17-456a-a717-c2c4964b6389` without a repair click. The animation held at 16/18, then resumed only after 18/18. The summary reported one injected regression repaired, two failed checks recovered, and two agent attempts. No GPU or TPU execution occurred. Desktop and narrow layouts were checked; no browser console errors were observed.
- Real SupportSearch Argon preparation `2e4f3c04-d078-47ac-b561-2757d0eb6dce`: generated three candidate files; 18/18 source-contract checks passed. Hardware validation remains pending.
- Real follow-up repair `2d046235-0dcc-4b4c-aa3f-733c6837ad28`: deliberately injected L1 normalization failed 2 checks (16/18); Argon repaired the candidate in the original remote environment and restored 18/18. The injection was made by MigrationProof, not Argon.
- The 3D studio was checked in the browser: regression blocks the switch, repair replays and reaches the TPU handover, hardware close-ups work, and phone layout has no page-width overflow. No browser console errors were observed.
- The frontend production build succeeded. Phone layout was checked at 390 × 844 with no page-width overflow.
- The saved successful run was restored after a server restart.

The current MVP supports the included CSV migration scenario and constrained SupportSearch source preparation/repair. Repository uploads, multiple languages, authentication, and hosted multi-user execution are not implemented.

API references: [Managed Agents](https://ai.google.dev/gemini-api/docs/antigravity-agent), [remote environments](https://ai.google.dev/gemini-api/docs/agent-environment), and [background execution](https://ai.google.dev/gemini-api/docs/background-execution).
