# Manual Hook: Pre-Commit Review

Use this after implementation and before committing.

## Trigger

Manual. Run after code changes are complete.

## Agent Prompt

Review changed files against `.kiro/steering/*.md`.

Run or request these checks:

```powershell
cd frontend; npm run build
git diff --check
git status --short
rg -n "/api/analytics|gemini-|routeTree.gen.ts" frontend backend
```

Audit for:

1. Secrets or credentials in tracked files.
2. Invented API endpoints.
3. Manual edits to generated files.
4. Gemini model changes.
5. Duplicate transaction query keys/fetchers.
6. Unsafe auth changes or reintroduced auth store.
7. Missing i18n keys if UI text changed.
8. Unrelated refactors or scope creep.

Return findings first, ordered by severity, with file references.

If clean, say the change is ready to commit and suggest a concise commit message.
