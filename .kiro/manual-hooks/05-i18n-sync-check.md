# Manual Hook: i18n Sync Check

Use this whenever UI text or locale files change.

## Trigger

Manual, or after editing:

- `frontend/src/i18n/locales/**/*.json`
- `frontend/components/**/*.tsx`
- `frontend/src/routes/**/*.tsx`

## Agent Prompt

Check i18n consistency.

Steps:

1. Parse all locale JSON files.
2. Compare English and Vietnamese key paths.
3. Find UI strings added without `t()`.
4. Confirm user-created data is not translated.
5. Confirm date/currency uses `useLocaleFormat()` instead of hardcoded locale formatting.
6. Mark missing translations as blockers; do not silently invent large copy unless asked.

Useful commands:

```powershell
node -e "JSON.parse(require('fs').readFileSync('frontend/src/i18n/locales/en/common.json','utf8')); JSON.parse(require('fs').readFileSync('frontend/src/i18n/locales/vi/common.json','utf8')); console.log('locale json ok')"
rg -n "vi-VN|en-US| VND|đ|[À-ỹ]" frontend/components frontend/src -g "*.tsx" -g "*.ts"
cd frontend; npm run build
```

Return:

- Missing keys.
- Hardcoded user-facing strings.
- Formatting issues.
- Verification result.
