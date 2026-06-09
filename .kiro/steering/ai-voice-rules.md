# AI Voice And Parser Rules

Use this before changing `frontend/server.ts`, AI prompts, voice input, or AI transaction parsing.

## Gemini

- The Gemini model is `gemini-3.1-flash-lite`.
- Never rename or swap the model unless the user explicitly asks and accepts the risk.
- `GEMINI_API_KEY` is server-side only and must not be exposed to the browser.

## Request Flow

- Browser sends parse requests to Express at `/api/parse-transaction`.
- Express calls Gemini and then uses Flask REST APIs to save data.
- Keep Flask as the persistence boundary; do not write directly to Turso from the frontend.

## Parser Behavior

- Vietnamese voice/text input is the primary workflow.
- Preserve support for normal transactions while adding new intents.
- AI output must be validated before saving.
- If parser confidence or matching is ambiguous, show a confirmation/picker in UI instead of silently saving the wrong record.

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
