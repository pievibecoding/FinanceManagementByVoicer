# Manual Hook: Prompt Gate

Use this before starting a non-trivial task.

## Trigger

Manual. Run when the user asks for a feature, architecture change, API change, database change, AI parser change, or broad refactor.

## Agent Prompt

Read all relevant `.kiro/steering/*.md` files first.

Classify the request:

1. **Quick fix**: small, clear, low-risk bug or text/UI change.
2. **Feature plan**: feature is broad, touches API/data model, or has product ambiguity.
3. **Feature execute**: a spec already exists and the user asks to implement a specific task.

Then respond with one of these:

- For quick fix: state the exact files likely involved, success criteria, and verification command.
- For feature plan: do not code. Audit the repo and produce a decision-complete plan/spec.
- For feature execute: read `.kiro/specs/<feature>/*`, identify the next task, and implement only that task.

Block or ask clarification if:

- The request implies an API that does not exist.
- The request conflicts with steering.
- The scope is too large for a single safe implementation pass.
- Acceptance criteria are missing for a high-risk change.

Default verification:

```powershell
cd frontend; npm run build
git diff --check
```
