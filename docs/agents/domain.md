# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **single-context**: one `CONTEXT.md` at the root and one `docs/adr/`
directory. The npm workspaces (`apps/*`, `packages/*`) are packages of one
product and share one vocabulary; they do not get their own `CONTEXT.md`.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root: the domain vocabulary (job, run, stage, match, skill chip, source, ...).
- **`docs/adr/`**: read ADRs that touch the area you're about to work in. `docs/adr/README.md` explains the format.
- **`docs/ARCHITECTURE.md`** and **`docs/ROADMAP.md`** for the data model and phase scope.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── README.md
│   └── 0001-foundational-decisions.md
├── apps/
└── packages/
```

If the project ever splits into genuinely separate bounded contexts, switch to a
root `CONTEXT-MAP.md` pointing at one `CONTEXT.md` per context, each with its
own `docs/adr/`. Until then, keep everything at the root.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`). `AGENTS.md` makes this a rule: add the term to `CONTEXT.md` first, then use it.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (foundational decisions), but worth reopening because…_
