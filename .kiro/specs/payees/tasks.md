# Tasks — Payees (Week 3)

## Task 1: Create payees table + Transaction_Fact migration in database.py

**File:** `backend/database.py`

- [ ] Add `_create_payees_table(db)`:
  ```python
  db.execute("""
      CREATE TABLE IF NOT EXISTS payees (
          payee_id            INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id             INTEGER NOT NULL,
          payee_name          TEXT    NOT NULL,
          default_category_id TEXT,
          UNIQUE (user_id, payee_name),
          FOREIGN KEY (user_id)             REFERENCES users(user_id),
          FOREIGN KEY (default_category_id) REFERENCES Category_Dim(category_id)
      )
  """)
  db.execute("CREATE INDEX IF NOT EXISTS idx_payees_user ON payees(user_id)")
  ```
- [ ] Add `_migrate_payee_column(db)`:
  ```python
  try:
      db.execute("ALTER TABLE Transaction_Fact ADD COLUMN payee_id INTEGER REFERENCES payees(payee_id)")
      logger.info("Migrated Transaction_Fact: added payee_id")
  except Exception:
      pass  # column already exists
  ```
- [ ] Call both from `initialize_db()` after `_migrate_budgets_from_categories(db)`:
  ```python
  _create_payees_table(db)
  _migrate_payee_column(db)
  ```

**Verify:** `python main.py` starts without errors; `payees` table visible in Turso.

---

## Task 2: Create backend/routes/payees.py

**File:** `backend/routes/payees.py` (new file)

- [ ] Create Flask Blueprint `payees_bp`
- [ ] Implement `GET /api/payees` (`@require_auth`):
  - `SELECT payee_id, payee_name, default_category_id FROM payees WHERE user_id = ? ORDER BY payee_name`
  - Return `jsonify(rows_to_dicts(result)), 200`
- [ ] Implement `POST /api/payees` (`@require_auth`):
  - Body: `{payee_name: str, default_category_id?: str}`
  - Validate `payee_name` is non-empty string
  - `INSERT INTO payees (user_id, payee_name, default_category_id) VALUES (?,?,?)`
  - Catch UNIQUE constraint violation → return 409 `{error: "Payee already exists"}`
  - Return `{payee_id, payee_name}` 201
- [ ] Implement `PUT /api/payees/<payee_id>` (`@require_auth`):
  - Body: `{payee_name?: str, default_category_id?: str}`
  - Check row exists for `(payee_id, user_id)` → 404 if not
  - Build partial UPDATE for provided fields only
  - Return `{message: "Payee updated"}` 200
- [ ] Implement `DELETE /api/payees/<payee_id>` (`@require_auth`):
  - Check row exists for `(payee_id, user_id)` → 404 if not
  - `DELETE FROM payees WHERE payee_id = ? AND user_id = ?`
  - Return `{message: "Payee deleted"}` 200

**Verify:**
```bash
# Create
curl -X POST http://localhost:5000/api/payees \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payee_name":"Grab","default_category_id":"transport"}'
# → 201 {payee_id: 1, payee_name: "Grab"}

# List
curl http://localhost:5000/api/payees -H "Authorization: Bearer TOKEN"
# → [{payee_id:1, payee_name:"Grab", default_category_id:"transport"}]

# Duplicate → 409
curl -X POST http://localhost:5000/api/payees \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payee_name":"Grab"}'
# → 409
```

---

## Task 3: Register payees blueprint in main.py

**File:** `backend/main.py`

- [ ] Add import: `from routes.payees import payees_bp`
- [ ] Add: `app.register_blueprint(payees_bp)`

**Verify:** `GET /api/payees` returns 401 without token, 200 with token.

---

## Task 4: Accept payee_id in POST /api/transactions

**File:** `backend/routes/transactions.py`

- [ ] In `create_transaction()`, extract optional field:
  ```python
  payee_id = data.get("payee_id")  # may be None
  ```
- [ ] Update INSERT to include `payee_id`:
  ```python
  db.execute(
      "INSERT INTO Transaction_Fact (transaction_id, transaction_date, account_id, category_id, amount, type, note, user_id, payee_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [transaction_id, transaction_date, account_id, category_id, int(amount), tx_type, note, g.user_id, payee_id],
  )
  ```

**Verify:** `POST /api/transactions` with `{..., "payee_id": 1}` stores payee_id; `GET /api/transactions` returns `payee_id` field (null when absent).

---

## Task 5: Inject payee list into Gemini prompt in server.ts

**File:** `frontend/server.ts`

- [ ] After the existing `accountList` fetch, add payee fetch:
  ```typescript
  let payeeList: Array<{ payee_id: number; payee_name: string; default_category_id: string | null }> = [];
  try {
    const payeeRes = await fetch(`${FLASK_URL}/api/payees`, {
      headers: { "Authorization": authHeader },
    });
    payeeList = await payeeRes.json();
  } catch {
    payeeList = [];
  }
  ```
- [ ] Build payee context string:
  ```typescript
  const payeeContext = payeeList.length > 0
    ? payeeList.map(p => `"${p.payee_name}"`).join(", ")
    : "none";
  ```
- [ ] Add to `systemInstruction` (append before "Return ONLY valid JSON"):
  ```
  Known payees for this user: [${payeeContext}].
  If the merchant or recipient in the transaction matches one of the known payees exactly or closely, set payee_name to the exact payee name from the list.
  If no match, set payee_name to empty string "".
  ```
- [ ] Add `payee_name` to Gemini response schema:
  ```typescript
  payee_name: { type: Type.STRING, description: "Matched payee name from the known list, or empty string if none" }
  ```
  Add `"payee_name"` to the `required` array.
- [ ] After Gemini returns, resolve `payee_name` → `payee_id`:
  ```typescript
  const matchedPayee = payeeList.find(
    p => p.payee_name.toLowerCase() === (parsedData.payee_name || "").toLowerCase()
  );
  const resolvedPayeeId = matchedPayee?.payee_id ?? null;
  ```
- [ ] Include `payee_id: resolvedPayeeId` in the Flask `POST /api/transactions` body.

**Verify:** Voice input "đi Grab tốn 25k momo" → transaction saved with `payee_id` matching Grab's ID (if Grab exists in payees).

---

## Task 6: Add Payee type and update Transaction type in types.ts

**File:** `frontend/types.ts`

- [ ] Add `Payee` interface:
  ```typescript
  export interface Payee {
    payee_id: number;
    payee_name: string;
    default_category_id: string | null;
  }
  ```
- [ ] Add `payee_id` to `Transaction`:
  ```typescript
  payee_id?: number | null;
  ```

---

## Task 7: Add payees state + fetch to index.tsx

**File:** `frontend/index.tsx`

- [ ] Add import: `Payee` to the types import line
- [ ] Add state after `budgets` state:
  ```typescript
  const [payees, setPayees] = useState<Payee[]>([]);
  ```
- [ ] Add payees fetch to the `Promise.all` block (5th entry):
  ```typescript
  fetch(`${FLASK_API}/api/payees`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  ```
  Update the destructure: `([accs, cats, txs, bdgs, pyees])` and add:
  ```typescript
  if (Array.isArray(pyees)) setPayees(pyees);
  ```

---

## Task 8: Add Payee Manager UI in Tables tab

**File:** `frontend/index.tsx`

- [ ] Add a new section in the Tables tab (after the Category_Dim table), titled "Danh Sách Payees [Bảng: payees]":
  - Table with columns: `payee_id`, `payee_name`, `default_category_id`, action
  - Each row has a Delete button that calls:
    ```typescript
    await fetch(`${FLASK_API}/api/payees/${p.payee_id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setPayees(prev => prev.filter(x => x.payee_id !== p.payee_id));
    ```
- [ ] Add an inline "Add Payee" form below the table:
  - Two inputs: `payee_name` (text) and `default_category_id` (select from `categories`)
  - On submit: `POST /api/payees`, append result to `payees` state
  - Show error if 409 (duplicate)

---

## Task 9: Add per-payee spending panel in Dashboard tab

**File:** `frontend/index.tsx`

- [ ] Add a new panel in the Dashboard tab (after the Account Breakdown panel), only rendered when `payees.length > 0`:
  - Title: "Chi Tiêu Theo Payee"
  - Compute spending per payee client-side:
    ```typescript
    const payeeSums: Record<number, number> = {};
    transactions.forEach(t => {
      if (t.type === 'expense' && t.payee_id) {
        payeeSums[t.payee_id] = (payeeSums[t.payee_id] || 0) + t.amount;
      }
    });
    ```
  - Render sorted list: payee name, total spent, transaction count
  - Show "Chưa có dữ liệu payee" if no transactions have `payee_id`

---

## Task 10: Add payee dropdown to manual transaction modal

**File:** `frontend/index.tsx`

- [ ] In `manualTx` state, add `payee_id: null as number | null`
- [ ] Add a `<select>` in the manual modal for payee (optional, first option = "Không chọn"):
  ```tsx
  <select value={manualTx.payee_id ?? ''} onChange={e => setManualTx(prev => ({ ...prev, payee_id: e.target.value ? Number(e.target.value) : null }))}>
    <option value="">-- Không chọn payee --</option>
    {payees.map(p => <option key={p.payee_id} value={p.payee_id}>{p.payee_name}</option>)}
  </select>
  ```
- [ ] Include `payee_id: manualTx.payee_id` in the `POST /api/transactions` body in `handleInsertManual`
- [ ] Reset `payee_id: null` in the modal reset after submit
