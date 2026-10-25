# MigrationProof — product and hackathon plan

**Status:** Original design plan, written October 25, 2026, before implementation. Historical proposals below are not a statement of current capabilities. See README.md for the implemented demonstrations and verification results.

## The one-sentence pitch

MigrationProof lets a coding agent modernize a codebase, then produces reproducible evidence that the new version still behaves like the old one on important inputs.

## Mission and product vision

**Mission:** Make large software migrations safer to review by finding behavior changes before a human accepts the rewrite.

**Long-term vision:** Every agent-created migration arrives with a proof bundle: what changed, what behavior was compared, which cases passed, which diverged, what the agent repaired, and what still needs human judgment. This is evidence for review, not a claim of formal equivalence.

**First user:** A small engineering team responsible for an old internal data importer or API service. Its maintainer wants to modernize the implementation but cannot manually inspect every behavior across the project.

**Job to be done:** "Move this working service to a maintainable stack without silently changing its outputs for existing customers. Show me exactly what you checked."

The current workaround is a codemod or coding agent plus existing tests and manual review. Existing tests often cover expected examples but miss valid edge cases. MigrationProof adds independent comparisons against the running old implementation and makes any mismatch a concrete repair task.

## Why this fits Gemini 4 Argon and Managed Agents

The participant guide's Million Token Engineering problem statement calls for a large engineering task and measured improvement over a baseline. Google's Argon announcement highlights codebase migrations and says its own large rewrites receive automated and manual auditing. Argon has a shared input/output window of up to 1 million tokens. Google's current API guide explicitly supports `gemini-4-argon` in the Antigravity Managed Agent through `agent_config`.

We use Google's managed sandbox for reading and changing source code. We build the verification protocol and report around it. The agent's work is real only when a fresh candidate build and an independent comparison produce evidence.

## Key product decision

**Initial product:** A local-first command with a simple browser report. Input is a repository snapshot plus a migration request. Output is a candidate patch and proof bundle. The main experience is watching a migration and its verification, rather than browsing a dashboard.

**MVP migration:** A small Node.js CommonJS inventory CSV importer becomes a TypeScript implementation. Both versions accept the same CSV input and emit JSON. This is a controlled fixture created for the hackathon; it represents the kind of cross-file migration a real team faces. The fixture itself is identified separately from the MigrationProof tool in the public repository.

**Why inventory data:** The visible edge case is a text identifier such as `00127`. A rewrite that converts IDs to numbers appears to work for ordinary rows, but changes `00127` to `127`. That gives a judge an immediate, understandable failure to watch the verifier find and the agent fix.

## User flow

1. Select the example project and state the migration goal: "Convert the importer to TypeScript while preserving the JSON contract."
2. MigrationProof snapshots the legacy version and runs its existing tests and reference inputs.
3. The Argon Managed Agent receives the repository and migration instructions. It edits only the candidate implementation, builds it, and reports what it changed.
4. MigrationProof runs both versions on the same corpus. It normalizes only explicitly irrelevant differences, such as JSON object key order; it does not normalize IDs, values, error messages, or record order.
5. A mismatch becomes a repair request containing the input and both outputs. The agent may attempt up to two repairs.
6. The final report shows the patch, baseline and candidate results, first and final mismatches, repairs, unverified areas, and the exact command to reproduce the run.

## Architecture and trust boundary

```text
                    migration request + legacy source
                                  |
                                  v
                       Argon Managed Agent
                       edits candidate source
                                  |
                                  v
                        candidate artifact
                                  |
                   +--------------+--------------+
                   |                             |
          frozen legacy runner            candidate runner
                   |                             |
                   +---------- comparator --------+
                                  |
                     mismatch -> agent repair
                                  |
                           proof bundle
```

The verifier owns the legacy snapshot, input generator, hidden cases, comparison code, and result ledger. The agent may inspect the public acceptance cases but cannot edit the frozen baseline or hidden verification corpus. Verification runs outside the agent's editable project tree. A fixed seed makes generated cases repeatable.

For the demo, execute only the controlled fixture in disposable environments. Arbitrary public repository support is later work because running untrusted project code needs stricter isolation and resource limits.

Google's Environments API documents uploading files, retrieving agent-created files, and persisting a remote sandbox. The first technical checkpoint is a live smoke test of the event credential, the model/agent combination, and file round-trip. If that fails, preserve the independent verifier and run Argon as a direct model call with local patch application; label this as a fallback, not Managed Agents use.

## What the verifier actually checks

**Observable contract:** Given a CSV file, both programs produce JSON records or a documented error. The comparison checks process exit status, record count, values and types, row order when order is part of the contract, and error category.

**Input corpus:**

| Class | Example | Failure it can reveal |
|---|---|---|
| Ordinary | Two valid inventory rows | Broken basic migration |
| Identifier | `00127` | Numeric coercion / lost zeros |
| Quoting | `"Nuts, bolts"` | Incorrect CSV parsing |
| Escapes | `"He said ""hi"""` | Escaped quote handling |
| Line endings | CRLF and LF | Platform-dependent parsing |
| Unicode | `café` | Encoding errors |
| Empty optional field | Blank description | Null/empty/string drift |
| Zero value | Quantity `0` | Falsey-value bug |
| Invalid row | Missing required ID | Changed error behavior |
| Multiple rows | Duplicate ID | Changed duplicate policy |

Use hand-authored edge cases plus seeded combinations of valid fields. Keep several cases held out from the agent. Hash and save the corpus before a migration run so the test oracle cannot change mid-run.

**Comparison rules:** JSON object key order is ignored. Array order, data types, leading zeros, row count, and explicit error categories are compared exactly. Any intentional contract change must be declared before the run and shown as an exception in the final report.

**Important limit:** The old implementation is a behavioral reference, not necessarily correct. Passing sampled cases does not prove equivalence for all inputs. The report names what was tested and what was not. Human reviewers decide whether the preserved behavior is desirable.

## Experimental validation

### Baseline and comparison

Run the same migration scenario in two conditions:

1. **One-pass baseline:** Give Argon the migration request and existing tests, then stop after its first candidate. Run the frozen verifier once.
2. **MigrationProof:** Start from the same legacy snapshot, use the same request and corpus, feed any mismatches back to the agent, and allow up to two repair iterations.

Record: build success, existing-test pass count, differential cases passed/total, mismatches by category, repair iterations, elapsed time, and approximate API usage. Save both candidate patches. Do not claim improvement unless the measured result supports it.

### Demo reliability

For a guaranteed explanation during judging, include a clearly labeled **seeded-regression fixture** whose candidate converts `00127` to `127`. Show that MigrationProof detects and repairs it. If the fully generated migration produces a natural mismatch, show that run as the primary live example. Do not present a seeded error as an unexpected model failure.

### Adversarial and failure tests

- A candidate that exits unsuccessfully must be reported as a failed build/run, not as "zero mismatches."
- A candidate that drops the last row must fail record-count comparison.
- A candidate that reorders rows must fail when order is contractually significant.
- A candidate that changes `"0"` to numeric `0` must fail type comparison where the legacy contract uses strings.
- A timeout or agent API error must leave an explicit incomplete result and retain the baseline snapshot.
- A claimed repair must be rerun against the same failing input and the full corpus, not only the one example.

## What qualifies as an MVP today

1. One real Argon Managed Agent interaction with the `gemini-4-argon` model edits candidate source in Google's remote sandbox.
2. The verifier runs both versions of the importer on at least ten cases, including at least four edge cases unavailable to the agent.
3. A known regression is detected with exact before/after outputs, and a repair run is independently verified.
4. The proof bundle contains reproducible input seed, source revision/hash, tool and model identity, results, patch/diff, and honest remaining limitations.
5. A judge can supply a new CSV row during the live demo and see the comparison result.
6. The public repository and one-minute video clearly label what the team built during the hackathon, as required by the participant guide.

## Build order for the remaining hackathon window

**Checkpoint 0 — 15 minutes: API feasibility.** Rotate the API key previously exposed in chat before placing a replacement in a local environment variable. Make a minimal Argon Managed Agent call and confirm remote file upload/download. If this is unavailable, pivot immediately to the direct Argon API for the main track and stop claiming Managed Agents eligibility.

**Checkpoint 1 — 45 minutes: Behavioral oracle.** Create the small inventory importer fixture, freeze its source, and build a deterministic old-vs-new runner with a fixed corpus. Prove it catches the seeded leading-zero regression before adding AI.

**Checkpoint 2 — 60 minutes: Agent loop.** Send the migration request to the Managed Agent, retrieve candidate files, build, compare, and feed back one concrete mismatch. Keep a maximum of two repairs and a per-run time budget.

**Checkpoint 3 — 45 minutes: Proof bundle.** Generate a concise HTML or terminal report with diff, mismatch input/output, result counts, and reproduction command. Provide a text entry box for the judge's new CSV row if time allows.

**Checkpoint 4 — 45 minutes: End-to-end rehearsal.** Run from a clean fixture, repeat the demo, capture the one-minute video, document exact hackathon-created files, and publish the permitted source before submission. Reserve remaining time for API delays and the submission form.

Priority if time shrinks: a working verifier + one agent repair + proof report. Additional file types, automatic GitHub PRs, arbitrary repositories, animated UI, and dashboards are future work.

## Three-minute judging story

1. **0:00–0:25 — Pain:** "A migration can pass tests and still alter customer data. Here is an ID with a leading zero."
2. **0:25–1:05 — Agent:** Show Argon in the Managed Agent migrating the importer and the candidate build.
3. **1:05–1:50 — Proof:** Run the frozen comparison. Show the exact CSV input and the diverging JSON output.
4. **1:50–2:30 — Repair:** Send the mismatch back; rerun the full corpus and display the corrected result and diff.
5. **2:30–3:00 — Live input:** Accept a judge-supplied row, then state exactly what the proof covers and what remains for a human reviewer.

## Longer-term product path

After the hackathon, test on a permissively licensed, real open-source migration with its license preserved and upstream code clearly distinguished from ours. Add adapters for HTTP APIs and database transformations. A team should be able to attach MigrationProof to a pull request and receive a reviewable proof bundle. Customer discovery should test whether maintainers trust and use the report, not just whether the agent can produce a patch.

## Assumptions to revisit after the first smoke test

- The event credentials permit Argon inside Managed Agents. The public API documents support, but this particular key has not been tested.
- The remote sandbox supports the Node and TypeScript toolchain needed for the fixture within the event time budget.
- A CSV importer is sufficient to demonstrate the core verification idea; a larger repository is a follow-up benchmark.
- The participant guide's timing and submission process are current. The project should be submitted by 5:00 PM Pacific on October 25, 2026 according to that guide.

## Sources

- Participant guide supplied by the user: hackathon tracks, judging criteria, new-work rule, public repository, demo and submission timing.
- Google Argon API guide: https://ai.google.dev/gemini-api/docs/latest-model
- Google Argon announcement and migration examples: https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/
- Managed Agent configuration: https://ai.google.dev/gemini-api/docs/custom-agents
- Managed environment file APIs: https://ai.google.dev/gemini-api/docs/agent-environment
