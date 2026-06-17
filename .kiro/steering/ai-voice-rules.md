# AI Voice And Parser Rules

Use this before changing `frontend/server.ts`, AI prompts, voice input, or AI transaction parsing.

## Gemini

- The Gemini model is `gemini-3.1-flash-lite`.
- Never rename or swap the model unless the user explicitly asks and accepts the risk.
- `GEMINI_API_KEY` is server-side only and must not be exposed to the browser.

## Request Flow

- Browser sends parse requests to Express at `/api/parse-transaction`.
- Express calls Gemini and returns a user-reviewable draft for standard transactions.
- Standard transactions must be saved only after the user confirms or edits and confirms the draft in `AIChatWidget`.
- Debt and savings operations must stay explicit: save only after confirmation or after the user selects a match from the picker.
- Keep Flask as the persistence boundary; do not write directly to Turso from the frontend.

## Parser Behavior

- Vietnamese voice/text input is the primary workflow.
- Preserve support for normal transactions while adding new intents.
- AI output must be validated before saving.
- Parsing must not silently create standard transactions, accounts, or payees before the user confirms the draft.
- For AI operations that move money through an account, parse and preserve the cash-flow account so the UI can show source → destination before confirmation.
- If parser confidence or matching is ambiguous, show a confirmation/picker in UI instead of silently saving the wrong record.

### Inner Transfer — Dual-Layer Override

Inner transfers (chuyển khoản nội bộ) use a two-layer safety net to prevent them from being misclassified as expenses:

**Layer 1 — server-side rule override in `server.ts`:**
`detectInnerTransfer(prompt)` runs before returning the Gemini result. If the prompt matches `/\b(chuyen|chuyen khoan|chuyen tien|ck)\b/` AND has the pattern `từ X sang/qua/vào/đến Y`, it resolves both accounts by fuzzy name match and forcefully sets `operation_type='inner_transfer'`, `type='neutral'`, `source_account`, `destination_account`, `source_account_id`, `destination_account_id` — overriding whatever Gemini returned.

**Layer 2 — client-side fallback in `AIChatWidget.tsx`:**
`detectInnerTransferFromText(text)` runs on the parsed response in `handleSubmit`. If the server missed it (e.g., model drift), the client re-applies the same pattern and corrects the parsed data before `buildDraft()` is called.

**Prompt & schema:** Gemini schema now includes `source_account` and `destination_account` fields. The system prompt includes an explicit example: `"chuyển khoản nội bộ từ OCB sang MOMO 4000k" → operation_type="inner_transfer"`.

Do not remove or weaken these overrides without adding equivalent protection.

## Voice Recognition

- Current microphone recognition is tuned for Vietnamese (`vi-VN`).
- Do not change speech recognition language just because UI language changes unless a spec explicitly covers bilingual voice parsing.

## Verification

Before committing AI parser changes:

```powershell
rg -n "gemini-3.1-flash-lite|parse-transaction|rec.lang" frontend/server.ts frontend/components
cd frontend; npm run build
git diff --check
```
