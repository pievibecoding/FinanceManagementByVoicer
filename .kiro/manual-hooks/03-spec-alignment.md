# Manual Hook: Spec Alignment

Use this after `requirements.md`, `design.md`, and `tasks.md` exist.

## Trigger

Manual. Run before executing tasks from a spec.

## Agent Prompt

Audit the spec package for alignment:

- Every requirement has a design path.
- Every design component has at least one task.
- Every task maps back to a requirement.
- Tasks are ordered so backend/data contracts are stable before UI wiring.
- Verification steps are present and executable.
- Out-of-scope items are explicit.
- The plan does not violate `.kiro/steering/*.md`.

Return:

- **Ready to execute** if aligned.
- Otherwise list required spec edits before implementation.

Do not implement code during this hook.
