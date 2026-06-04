# Technical Design Document — Recurring Transactions

## 1. System Architecture

### 1.1 Component Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  App (index.tsx)                                           │  │
│  │  - Recurring tab / section in existing sidebar nav        │  │
│  │  - RecurringList: active rules summary                     │  │
│  │  - RecurringForm: create new rule                          │  │
│  │  - Auto-process badge: shows generated count on login      │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────┘
                                   │ Authorization: Bearer {token}
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Flask Backend API (port 5000)                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  New Recurring Routes (/api/recurring/*)                 │    │
│  │   GET    /api/recurring          — list user's rules      │    │
│  │   POST   /api/recurring          — create rule            │    │
│  │   PUT    /api/recurring/:id      — update rule            │    │
│  │   DELETE /api/recurring/:id      — delete rule            │    │
│  │   PATCH  /api/recurring/:id/toggle — flip is_active       │    │
│  │   POST   /api/recurring/process  — run due rules          │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Turso Database (libSQL)                      │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  recurring_transactions (new table)                      │    │
│  │   recurring_id, user_id, account_id, category_id,        │    │
│  │   payee_id, amount, type, note, frequency,               │    │
│  │   next_run_date, end_date, is_active                      │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Transaction_Fact (existing — receives generated rows)   │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Transaction Generation Flow

```
App startup (after login)
  │
  ▼
Frontend calls POST /api/recurring/process
  │
  ▼
Flask: query all active rules WHERE user_id = g.user_id
  │
  ▼
For each rule WHERE next_run_date <= today AND is_active = 1:
  │
  ├── INSERT into Transaction_Fact
  │   (transaction_id, user_id, account_id, category_id,
  │    amount, type, note, transaction_date = next_run_date,
  │    is_deleted = 0)
  │
  ├── Advance next_run_date (frequency-based logic)
  │
  └── If end_date set AND new next_run_date > end_date:
        SET is_active = 0
  │
  ▼
Return { generated: <count> }
  │
  ▼
Frontend: if generated > 0, show badge notification
          reload transactions list
```

---

## 2. Database Schema Design

### 2.1 New Table

```sql
CREATE TABLE IF NOT EXISTS recurring_transactions (
    recurring_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    account_id    TEXT    NOT NULL,
    category_id   TEXT    NOT NULL,
    payee_id      INTEGER,                            -- nullable
    amount        INTEGER NOT NULL,
    type          TEXT    NOT NULL,
    note          TEXT,
    frequency     TEXT    NOT NULL,
    next_run_date TEXT    NOT NULL,                   -- 'YYYY-MM-DD'
    end_date      TEXT,                               -- nullable, 'YYYY-MM-DD'
    is_active     INTEGER NOT NULL DEFAULT 1,
    CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    CHECK (type IN ('income', 'expense', 'investment')),
    FOREIGN KEY (user_id)     REFERENCES users(user_id),
    FOREIGN KEY (account_id)  REFERENCES Account_Dim(account_id),
    FOREIGN KEY (category_id) REFERENCES Category_Dim(category_id)
);

CREATE INDEX IF NOT EXISTS idx_recurring_user
    ON recurring_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_next_run
    ON recurring_transactions(next_run_date, is_active);
```

**Design rationale:**
- `next_run_date` / `end_date` store date only (`YYYY-MM-DD`), not datetime — recurring events are day-level, not time-level.
- `amount` follows the existing convention: always a positive integer in VND. `type` encodes direction.
- `is_active` uses INTEGER 0/1 to stay consistent with `is_deleted` pattern in the rest of the schema.
- Two indexes: one for user-scoped list queries, one for the process endpoint which filters by date + active status.

---

## 3. Backend API Design

### 3.1 New File Structure

```
backend/
└── routes/
    ├── recurring.py   ← NEW: all /api/recurring/* endpoints
    └── ...            (existing files unchanged)
```

All endpoints in `recurring.py` use `@require_auth` from `backend/auth/jwt_utils.py` and scope every query by `g.user_id`.

### 3.2 Endpoint Specifications

#### GET /api/recurring
Returns all recurring rules belonging to the authenticated user.

**Response 200:**
```json
[
  {
    "recurring_id": 1,
    "account_id": "vcb",
    "category_id": "2-salary",
    "payee_id": null,
    "amount": 15000000,
    "type": "income",
    "note": "Lương tháng",
    "frequency": "monthly",
    "next_run_date": "2026-07-01",
    "end_date": null,
    "is_active": 1
  }
]
```

#### POST /api/recurring
Creates a new recurring rule.

**Request body (required fields starred):**
```json
{
  "account_id*":    "vcb",
  "category_id*":  "2-salary",
  "amount*":        15000000,
  "type*":          "income",
  "frequency*":     "monthly",
  "next_run_date*": "2026-07-01",
  "note":           "Lương tháng",
  "end_date":       null,
  "payee_id":       null
}
```

**Response 201:**
```json
{ "recurring_id": 1, "message": "Recurring transaction created" }
```

**Errors:**
- 400: Missing required field or invalid frequency/type value
- 400: amount ≤ 0

#### PUT /api/recurring/:id
Updates any field of a recurring rule owned by the authenticated user.

**Request body:** any subset of POST fields.

**Response 200:**
```json
{ "message": "Recurring transaction updated" }
```

**Errors:**
- 404: Rule not found or belongs to another user
- 400: Invalid field value

#### DELETE /api/recurring/:id
Hard deletes a recurring rule owned by the authenticated user. (No soft delete — the rule itself is not a financial record; generated transactions remain in `Transaction_Fact`.)

**Response 200:**
```json
{ "message": "Recurring transaction deleted" }
```

**Errors:**
- 404: Rule not found or belongs to another user

#### PATCH /api/recurring/:id/toggle
Flips `is_active` between 0 and 1.

**Response 200:**
```json
{ "message": "Recurring transaction updated", "is_active": 0 }
```

**Errors:**
- 404: Rule not found or belongs to another user

#### POST /api/recurring/process
Processes all due recurring rules for the authenticated user. Called by the frontend on startup.

**Response 200:**
```json
{ "generated": 3 }
```

**Logic (pseudo-code):**
```python
today = date.today().isoformat()          # 'YYYY-MM-DD'
rules = db.execute(
    "SELECT * FROM recurring_transactions "
    "WHERE user_id = ? AND is_active = 1 AND next_run_date <= ?",
    [g.user_id, today]
)
generated = 0
for rule in rules:
    # Insert transaction
    tx_id = f"tx-{int(time.time() * 1000)}"
    db.execute(
        "INSERT INTO Transaction_Fact (...) VALUES (...)",
        [tx_id, g.user_id, rule.account_id, rule.category_id,
         rule.amount, rule.type, rule.note or "",
         f"{rule.next_run_date} 00:00:00", 0]
    )
    generated += 1

    # Advance next_run_date
    new_date = advance_date(rule.next_run_date, rule.frequency)

    # Check end_date
    if rule.end_date and new_date > rule.end_date:
        db.execute(
            "UPDATE recurring_transactions SET next_run_date=?, is_active=0 WHERE recurring_id=?",
            [new_date, rule.recurring_id]
        )
    else:
        db.execute(
            "UPDATE recurring_transactions SET next_run_date=? WHERE recurring_id=?",
            [new_date, rule.recurring_id]
        )
return {"generated": generated}
```

**Important:** If a rule is overdue by multiple periods (e.g., app not opened for 3 months), only **one** transaction is generated per run. `next_run_date` is advanced once. This prevents flooding the transaction history on first login after a long absence. The user can run process again or manually create missed entries.

### 3.3 Date Advancement Logic

Isolated in a single helper function in `recurring.py`:

```python
from datetime import date, timedelta
import calendar

def advance_date(date_str: str, frequency: str) -> str:
    """Advance a YYYY-MM-DD string by one frequency unit."""
    d = date.fromisoformat(date_str)

    if frequency == 'daily':
        return (d + timedelta(days=1)).isoformat()

    if frequency == 'weekly':
        return (d + timedelta(weeks=1)).isoformat()

    if frequency == 'monthly':
        # Clamp to last valid day if target month is shorter
        month = d.month + 1 if d.month < 12 else 1
        year  = d.year + 1 if d.month == 12 else d.year
        day   = min(d.day, calendar.monthrange(year, month)[1])
        return date(year, month, day).isoformat()

    if frequency == 'yearly':
        # Handle Feb 29 → Feb 28 on non-leap years
        try:
            return d.replace(year=d.year + 1).isoformat()
        except ValueError:
            return d.replace(year=d.year + 1, day=28).isoformat()

    raise ValueError(f"Unknown frequency: {frequency}")
```

**This function is pure (no DB side effects) and fully unit-testable.**

### 3.4 Register Blueprint in main.py

```python
# backend/main.py
from routes.recurring import recurring_bp
app.register_blueprint(recurring_bp)
```

---

## 4. Frontend Design

### 4.1 State Additions (index.tsx)

```typescript
// New state in App component
const [recurringRules, setRecurringRules] = useState<RecurringTransaction[]>([]);
const [generatedCount, setGeneratedCount] = useState<number>(0);   // from process endpoint
const [showRecurringForm, setShowRecurringForm] = useState(false);
```

### 4.2 Startup Sequence

```typescript
// Called once after auth token is confirmed (alongside loadData)
async function processRecurring() {
  const res = await fetch("http://localhost:5000/api/recurring/process", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.generated > 0) {
    setGeneratedCount(data.generated);
    loadTransactions();   // reload so generated txs appear
  }
}
```

### 4.3 TypeScript Types (types.ts)

```typescript
interface RecurringTransaction {
  recurring_id: number;
  account_id: string;
  category_id: string;
  payee_id: number | null;
  amount: number;
  type: 'income' | 'expense' | 'investment';
  note: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_run_date: string;   // 'YYYY-MM-DD'
  end_date: string | null;
  is_active: number;       // 0 | 1
}
```

### 4.4 UI Layout

The recurring transactions feature is added as a new **tab/section** inside the existing sidebar navigation. No new page or route — stays within the SPA pattern.

```
Sidebar nav (existing):
  [Dashboard]  [Transactions]  [Analytics]  [Recurring ← new]

Recurring panel content:
┌─────────────────────────────────────────────────────────────┐
│  Giao dịch định kỳ              [+ Thêm mới]                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  💰 Tiền lương            15,000,000đ / tháng        │   │
│  │  Tài khoản: VCB  |  Danh mục: Tiền lương             │   │
│  │  Lần tiếp: 01/07/2026              [Tắt]  [Xóa]      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🏠 Tiền nhà              5,000,000đ / tháng         │   │
│  │  Tài khoản: MoMo  |  Danh mục: Khác                  │   │
│  │  Lần tiếp: 01/07/2026  ● Đã tắt  [Bật]  [Xóa]       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Generated transaction badge:**
```
When generatedCount > 0 after startup:
  → Show toast / banner: "✓ Đã tạo 3 giao dịch định kỳ"
  → Badge on Recurring tab showing the count
```

**Create form fields:**
| Field | Input type | Required |
|---|---|---|
| Số tiền | number | ✓ |
| Loại | select: income/expense/investment | ✓ |
| Tài khoản | select from accounts | ✓ |
| Danh mục | select from categories | ✓ |
| Tần suất | select: daily/weekly/monthly/yearly | ✓ |
| Ngày đầu tiên | date picker | ✓ |
| Ngày kết thúc | date picker | optional |
| Ghi chú | text | optional |

---

## 5. Requirements Traceability

| Requirement | Design Element |
|---|---|
| Req 1: recurring_transactions table | Section 2.1 — DDL with all columns, CHECK constraints, FKs, indexes |
| Req 2.1: GET /api/recurring | Section 3.2 — GET endpoint, user-scoped |
| Req 2.2: POST /api/recurring | Section 3.2 — POST endpoint, 201 response |
| Req 2.3: PUT /api/recurring/:id | Section 3.2 — PUT endpoint, 404 on wrong user |
| Req 2.4: DELETE /api/recurring/:id | Section 3.2 — DELETE (hard delete), 404 on wrong user |
| Req 2.5: PATCH toggle | Section 3.2 — PATCH toggle, returns new is_active value |
| Req 2.6: Auth on all routes | Section 3.1 — all routes use @require_auth |
| Req 3.1: POST /api/recurring/process | Section 3.2 — process endpoint |
| Req 3.2: Generate tx when due | Section 3.2 — INSERT into Transaction_Fact |
| Req 3.3: Advance next_run_date | Section 3.3 — advance_date() helper |
| Req 3.4: Deactivate past end_date | Section 3.2 — process logic sets is_active=0 |
| Req 3.5: Return generated count | Section 3.2 — returns {generated: n} |
| Req 3.6: Frontend calls process on startup | Section 4.2 — processRecurring() on mount |
| Req 4.1: List active rules | Section 4.4 — RecurringList UI |
| Req 4.2: Create form | Section 4.4 — Create form with all fields |
| Req 4.3: Toggle on/off | Section 4.4 — toggle button per row |
| Req 4.4: Delete rule | Section 4.4 — delete button per row |
| Req 4.5: Generated badge | Section 4.4 — generatedCount banner |
| Req 5.1: monthly advance | Section 3.3 — advance_date() monthly branch |
| Req 5.2: weekly advance | Section 3.3 — timedelta(weeks=1) |
| Req 5.3: yearly advance | Section 3.3 — replace(year+1) |
| Req 5.4: daily advance | Section 3.3 — timedelta(days=1) |
| Req 5.5: month-end clamping | Section 3.3 — calendar.monthrange() clamp |
