# Architecture Decision Records

One file per decision with lasting impact. Numbered, never deleted; supersede
instead of editing history.

```
docs/adr/NNNN-short-title.md
```

Template:

```markdown
# NNNN – Title

- Status: proposed | accepted | superseded by NNNN
- Date: YYYY-MM-DD

## Context

What forces are at play. One or two paragraphs.

## Decision

What we do. Imperative, concrete.

## Consequences

What becomes easier, what becomes harder, what we must remember.
```

Write an ADR when a decision would surprise a future reader, is expensive to
reverse, or resolves a genuine trade-off. Small choices go in code comments.

| #    | Title                  | Status   |
| ---- | ---------------------- | -------- |
| 0001 | Foundational decisions | accepted |
| 0002 | Layering and TDD       | accepted |
| 0003 | Ingestion pipeline design | accepted |
