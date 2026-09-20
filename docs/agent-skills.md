# Agent skills for this project

Evaluation of [Matt Pocock's skills](https://github.com/mattpocock/skills) for
JobFinder, and how they slot into the workflow. Install with
`npx skills@latest add mattpocock/skills` (editable copies in the repo) or as
the Claude Code plugin, then run `/setup-matt-pocock-skills` once.

This repo is already prepared for them: `AGENTS.md` exists, `CONTEXT.md`
holds the domain vocabulary, `docs/adr/` holds decisions, issues live on
GitHub, and the five triage labels exist in the repo.

## Recommended: use from day one

| Skill                      | Why it fits                                                                                                                                                                                                               | When                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `setup-matt-pocock-skills` | Wires the other skills to GitHub issues, our triage labels and `CONTEXT.md` / `docs/adr/`. Choose **GitHub**, default labels, **single-context** domain docs.                                                             | Once, first session.                                                         |
| `grill-with-docs`          | Every phase has real design branches (adapter interface, cancellation semantics, score weights, shortcut model). It interviews you and updates `CONTEXT.md` and ADRs inline, which is exactly how this repo is organised. | Before starting each milestone and before any issue labelled `needs-design`. |
| `to-tickets`               | Turns the grilled plan into tracer-bullet GitHub issues with blocking links. Matches the "vertical slices" rule in `AGENTS.md`.                                                                                           | Right after `grill-with-docs`.                                               |
| `tdd`                      | **Mandatory** for `domain/` and `application/` (ADR 0002). Always red-first. Adapters get fixture/contract tests the same way.                                                                                            | During `/implement` for every issue that touches `apps/api` or `packages/*`. |
| `implement`                | Drives `/tdd` at the ports (agreed seams) and finishes with `/code-review`.                                                                                                                                               | Per issue.                                                                   |
| `code-review`              | Two-axis review (standards vs spec). Standards include ADR 0002 layer rules and red-first. Catches sidebars, hand-written boilerplate, tables outside Drizzle, domain importing adapters.                                 | Before every commit/PR.                                                      |
| `handoff`                  | Sessions will be long (ingestion pipeline, UI work). A handoff doc keeps the next session from re-deriving state.                                                                                                         | End of every session.                                                        |

## Useful: situational

| Skill                       | Why it fits                                                                                                                               | When                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `diagnosing-bugs`           | BullMQ retries, SSE disconnects and LLM output parsing produce bugs that need a reproducible red test before a fix.                       | Any non-trivial bug.                             |
| `domain-modeling`           | Model-invoked companion to `grill-with-docs`. Keeps `CONTEXT.md` sharp as terms like _run_, _stage_, _match_ evolve.                      | Whenever a new noun shows up in a discussion.    |
| `codebase-design`           | Deep modules behind small interfaces — the vocabulary behind ADR 0002 ports. Read before designing a new port.                            | When adding a port or aggregate.                 |
| `prototype`                 | Score-weight tuning and the tag-bar interaction are best explored as throwaway HTML variants before committing to shadcn components.      | Phase 2/3 UI questions.                          |
| `research`                  | Upstream API behaviour (BA API pagination, Adzuna limits, Ollama JSON mode quirks) should be captured as cited notes in `docs/research/`. | Before each new adapter.                         |
| `triage`                    | Only pays off once issues arrive from outside your own head. Labels are already created.                                                  | When the backlog grows beyond what you remember. |
| `wizard`                    | Interactive bash wizard for human-only steps: obtaining Adzuna keys, GPU passthrough, first-time server setup.                            | Phase 4.                                         |
| `resolving-merge-conflicts` | Single developer + agents rarely conflict, but useful if parallel agent branches are used.                                                | As needed.                                       |
| `wait-what`                 | Cheap way to re-explain an agent message using `CONTEXT.md` vocabulary.                                                                   | Whenever something doesn't land.                 |

## Low value here

| Skill                           | Reason                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wayfinder`                     | Designed for work larger than one session can hold and multiple decision tickets. The roadmap already maps the way; `grill-with-docs` + `to-tickets` per milestone is enough. Reconsider if Phase 4 balloons. |
| `improve-codebase-architecture` | Survey tool for existing, aging codebases. Nothing to survey yet; run it every few weeks from Phase 2 on.                                                                                                     |
| `to-spec`                       | Publishes a spec from a conversation without an interview. `grill-with-docs` -> `to-tickets` covers the same ground with better alignment. Use only for small, already-discussed changes.                     |
| `to-questionnaire`, `teach`     | Aimed at async stakeholders / learning. Single-developer project has neither.                                                                                                                                 |
| `grill-me`                      | Superseded by `grill-with-docs` for code work; keep for non-code planning.                                                                                                                                    |
| `ask-matt`                      | Router over the others; helpful the first week, redundant afterwards.                                                                                                                                         |

## Suggested loop per issue

1. `/grill-with-docs` on the issue (skip for `type:chore`).
2. `/to-tickets` if the grill split it into several slices.
3. `/implement` (drives `/tdd`, ends with `/code-review`).
4. `npm run check`, commit referencing the issue.
5. `/handoff` at the end of the session.

## Project-specific guardrails to feed into the skills

When grilled or reviewed, the agent should be checking against these; they
are the failure modes most likely in this project:

- UI creeping toward a sidebar or multi-page layout.
- Hand-written TanStack/Vite/shadcn scaffolding instead of the CLI.
- Tables or indexes created outside Drizzle migrations.
- Business rules in `http/` or `workers/` instead of use cases / domain.
- `domain/` or `application/` importing an adapter or I/O library.
- A port with a single implementation and no test fake (violates ADR 0002 D3).
- New behaviour shipped without a preceding red test.
- Upstream API payload types leaking out of an adapter module.
- A paid source hard-failing when its key is missing.
