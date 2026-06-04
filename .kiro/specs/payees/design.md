# Design Document — Payees (Week 3)

## Overview

Add a `payees` table so users can maintain a list of known merchants/recipients. Transactions optionally link to a payee via a nullable `payee_id` FK on `Transaction_Fact`. Gemini auto-matches payee names from voice input. Frontend shows a payee manager and per-payee spending analytics.

---

## Database

### New table: `payees`

```sql
CREATE TABLE IF NOT EXISTS payees (
    payee_id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL REFERENCES users(user_id),
    payee_name          TEXT    NOT NULL,
    default_category_id TEXT    REFERENCES Category_Dim(category_id),
    UNIQUE (user_id, payee_name)
);
CREATE INDEX IF NOT EXISTS idx_payees_user ON payees(user_id);
```

### Schema migration on `Transaction_Fact`

```sql
ALTER TABLE Transaction_Fact ADD COLUMN payee_id INTEGER REFERENCES payees(payee_id);
```

Both changes are idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE` wrapped in `try/except`).

---

## Backend

### New route file: `backend/routes/payees.py`

Flask Blueprint `payees_bp`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/payees` | ✅ | List user's payees |
| POST | `/api/payees` | ✅ | Create payee `{payee_name, default_category_id?}` → 201 |
| PUT | `/api/payees/:id` | ✅ | Update `{payee_name?, default_category_id?}` → 200 |
| DELETE | `/api/payees/:id` | ✅ | Delete payee (user-owned only) → 200 / 404 |

**POST:** Returns `{payee_id, payee_name}`. Returns 409 on duplicate `(user_id, payee_name)`.

**DELETE:** Returns 404 if row not found or belongs to another user.

### Modified: `backend/routes/transactions.py`

**POST `/api/transactions`** — accept optional `payee_id` field, store it in the INSERT.

**GET `/api/transactions`** — `payee_id` already returned by `SELECT *`; ensure `null` is returned when absent (libsql returns `None` → serializes to JSON `null` automatically).

### Modified: `backend/database.py`

- Add `_create_payees_table(db)` — creates the `payees` table + index.
- Add `_migrate_payee_column(db)` — `ALTER TABLE Transaction_Fact ADD COLUMN payee_id INTEGER`.
- Call both from `initialize_db()` after existing migration steps.

### Register blueprint: `backend/main.py`

Import and register `payees_bp`.

---

## BFF Server (`frontend/server.ts`)

### Payee list injection into Gemini prompt

Before calling Gemini in `/api/parse-transaction`:
1. Fetch `GET /api/payees` from Flask using the forwarded `authHeader`.
2. Build a `payeeList` string: `"Grab (Di chuyển), Bách Hóa Xanh (Ăn uống), ..."`.
3. Add to `systemInstruction`:
   ```
   Known payees for this user: [{payee list}].
   If the user mentions a business or person matching one of these payees, return payee_name as the exact name from the list.
   If no match, return payee_name as empty string "".
   ```
4. Add `payee_name` to the Gemini response schema (STRING, optional).
5. After Gemini returns, resolve `payee_name` → `payee_id` by looking up the fetched payee list.
6. Include `payee_id` (or `null`) in the Flask `POST /api/transactions` body.

---

## Frontend

### New type: `Payee`

```typescript
// frontend/types.ts
export interface Payee {
  payee_id: number;
  payee_name: string;
  default_category_id: string | null;
}
```

### Updated type: `Transaction`

```typescript
payee_id?: number | null;
```

### State additions in `index.tsx`

```typescript
const [payees, setPayees] = useState<Payee[]>([]);
```

Fetched on mount alongside accounts/categories/transactions.

### Payee Manager UI (in Tables tab)

A new section under the existing Category_Dim table:

- Lists all payees with name and default category.
- Input + button to add a new payee (calls `POST /api/payees`).
- Delete button per row (calls `DELETE /api/payees/:id`).

### Per-Payee Analytics (in Dashboard tab)

A new panel in the Dashboard tab below the existing budget monitor:

- Displays top payees by total spending for the current period.
- Each row: payee name, total spent, transaction count.
- Computed client-side from `transactions` + `payees` state.
- Only shown when `payees.length > 0` and there are transactions with a `payee_id`.

### Manual transaction modal

Add a `payee_id` dropdown (optional) to the "Chèn Bản Ghi" modal, populated from `payees` state.

---

## Data flow

```
Voice input → /api/parse-transaction (Express BFF)
    │
    ├─ fetch GET /api/payees → payeeList
    ├─ call Gemini with payeeList in system prompt
    │   └─ Gemini returns payee_name (matched or "")
    ├─ resolve payee_name → payee_id (null if no match)
    └─ POST /api/transactions {…, payee_id}
           │
           └─ stored in Transaction_Fact.payee_id
```

---

## Backward compatibility

- `payee_id` on `Transaction_Fact` is nullable — all existing transactions have `NULL`, API returns `null`.
- `GET /api/transactions` is unchanged in shape (extra field added, not removed).
- No existing frontend code reads `payee_id`, so no breakage until the new UI is added.
