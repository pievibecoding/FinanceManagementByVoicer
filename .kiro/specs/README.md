# Specs Workflow

Use specs only for large or risky work:

- New feature routes/pages.
- API or database changes.
- AI parser behavior changes.
- Cross-cutting refactors.
- Bug fixes that require architecture decisions.

Do not create specs for small, clear fixes.

## Required Files

Each feature spec should contain:

```txt
.kiro/specs/<feature>/
  requirements.md
  design.md
  tasks.md
```

## Workflow

1. Draft `requirements.md`.
2. Run `.kiro/manual-hooks/02-spec-pushback.md`.
3. Draft `design.md` and `tasks.md`.
4. Run `.kiro/manual-hooks/03-spec-alignment.md`.
5. Execute tasks one at a time.
6. Run `.kiro/manual-hooks/04-pre-commit-review.md` before commit.
