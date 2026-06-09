# Manual Hook: Spec Pushback

Use this after drafting `requirements.md` and before writing implementation design.

## Trigger

Manual. Run for large features before implementation.

## Agent Prompt

Review the current spec requirements against `.kiro/steering/*.md`.

Find problems before coding:

1. Ambiguous product behavior.
2. Missing user flows.
3. Missing failure modes.
4. Security or data isolation risks.
5. Conflicts with existing API contract.
6. Requirements that imply nonexistent backend routes.
7. Requirements that duplicate existing hooks/query keys.
8. Cases where the requested feature already exists.

Return:

- **Blockers**: must resolve before design/code.
- **Warnings**: can proceed with explicit assumptions.
- **Suggested requirement edits**: concise replacement text.
- **Questions**: only if the answer cannot be discovered from the repo.

Do not implement code during this hook.
