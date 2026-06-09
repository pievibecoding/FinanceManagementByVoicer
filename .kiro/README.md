# Kiro-Lite Workflow For Codex

This repository uses a lightweight Kiro-style workflow for safer AI coding.

## Daily Flow

### Quick Fix

Use for small, clear changes.

```txt
Read .kiro/steering/* first.
Fix exactly this issue: <issue>.
Do not create a spec.
Run cd frontend && npm run build.
```

### Feature Plan

Use for broad or risky features.

```txt
Read .kiro/steering/* first.
Do not code.
Create or update .kiro/specs/<feature>/requirements.md, design.md, and tasks.md.
Run the spec pushback and alignment manual hooks.
```

### Feature Execute

Use after a spec exists.

```txt
Read .kiro/steering/* and .kiro/specs/<feature>/*.
Implement only task <N>.
Do not expand scope.
Run verification from tasks.md.
```

## Manual Hooks

Manual hook prompts live in `.kiro/manual-hooks/`.

- `01-prompt-gate.md`: classify task and prevent vague execution.
- `02-spec-pushback.md`: find missing/ambiguous requirements.
- `03-spec-alignment.md`: check requirements/design/tasks match.
- `04-pre-commit-review.md`: review changed files before commit.
- `05-i18n-sync-check.md`: keep locale files and UI text aligned.

## Specs

Specs live in `.kiro/specs/`.

Use specs for large features only. Start from `.kiro/specs/_template/`.

Current recommended next feature:

- `.kiro/specs/analytics-fix/`

## Required Verification

For normal frontend work:

```powershell
cd frontend; npm run build
git diff --check
```

For API/auth/AI/i18n work, also run the targeted searches listed in the relevant steering file.
