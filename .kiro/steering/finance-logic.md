# Finance Logic — Trạng thái hiện tại

Tài liệu này mô tả toàn bộ logic tính toán tài chính hiện đang hoạt động trong app.
Đọc file này trước khi thay đổi bất kỳ công thức nào liên quan đến số dư, net worth, thu/chi, debt, savings.

---

## 1. Domain Fact Model

Finance data is split by domain. Do not put debt or savings cash movement rows in `Transaction_Fact`.

### `Transaction_Fact`

Only stores:

| transaction_type | Meaning | Account effect |
|---|---|---|
| `expense` | Spending from one account to an external payee | `account_id -= amount` |
| `income` | Income from an external payee/source into one account | `account_id += amount` |
| `inner_transfer` | Internal account-to-account movement | `source_account_id -= amount`, `destination_account_id += amount` |

Rules:
- `expense` and `income` require `account_id` and `category_id`; `payee_id` is optional external counterparty.
- `inner_transfer` requires `source_account_id` and `destination_account_id`; `category_id` and `payee_id` should be null.
- Route Giao dịch displays only this table.
- `account_transfer` is legacy naming only; new code must use `inner_transfer`.
- Legacy `type`, `operation_type`, `transfer_in`, and `transfer_out` can exist only for migration/read compatibility.

### `Debt_Transaction_Fact`

Stores all debt/loan cash movements:

| debt_transaction_type | debt_type | cash_direction | Meaning |
|---|---|---|---|
| `disbursement` | `debt` | `in` | lender/payee -> account |
| `disbursement` | `loan` | `out` | account -> borrower/payee |
| `payment` | `debt` | `out` | account -> lender/payee |
| `payment` | `loan` | `in` | borrower/payee -> account |

`payee_id` is the external lender/borrower counterparty. These rows update account balance and `Debt_Dim.outstanding_balance`, but never count as income/expense.

### `Savings_Transaction_Fact`

Stores all savings cash movements:

| savings_transaction_type | cash_direction | Meaning |
|---|---|---|
| `contribution` | `out` | account -> savings goal |
| `withdrawal` | `in` | savings goal -> account |

These rows update account balance and `Savings_Dim.current_balance`, but never count as income/expense.

**Global rules:**
- All `amount` values are positive VND integers.
- Payee means external counterparty only, never an account.
- Old debt/savings movement tables have been removed. Use only `Debt_Transaction_Fact` and `Savings_Transaction_Fact`.

Helper functions tại `frontend/lib/transaction-types.ts`:
```ts
cashDirectionForTransaction(tx) → 'in' | 'out' | 'neutral'
operationTypeForTransaction(tx) → one of the 7 operation types
isPositiveTransactionType(type) → type === 'in' (legacy income/transfer_in also supported)
isNegativeTransactionType(type) → type === 'out' (legacy expense/transfer_out also supported)
```

---

## 2. Số dư tài khoản (`current_balance`)

`Account_Dim.current_balance` được lưu trong DB và cập nhật **server-side** bởi Flask khi tạo/sửa/xóa transaction hoặc nghiệp vụ liên quan.

```
current_balance(account) =
  initial_balance
  + Transaction_Fact income/inner_transfer deltas
  + Debt_Transaction_Fact cash_direction deltas
  + Savings_Transaction_Fact cash_direction deltas
```

**Frontend đọc trực tiếp `acc.current_balance` từ `GET /api/accounts` — KHÔNG tự tính lại.**

Áp dụng tại:
- `frontend/components/dashboard/AccountsSummary.tsx` → đọc `acc.current_balance` trực tiếp
- `frontend/hooks/useDashboard.ts` → `totalBalance = Σ acc.current_balance`
- `frontend/components/dashboard/DynamicChart.tsx` → `accountBalanceAtDate()` vẫn dùng transaction history để reconstruct balance tại một mốc thời gian cụ thể (cho chart time-series), nhưng snapshot hiện tại lấy từ `current_balance`

---

## 3. Tổng số dư tất cả accounts (`totalBalance`)

```
totalBalance = Σ current_balance(account) cho tất cả accounts của user
```

Tính tại: `useDashboard.ts`

---

## 4. Tổng tài sản ròng snapshot (`netWorth`)

```
netWorth = totalBalance + totalSaved + totalLoan - totalDebt
```

Trong đó:
- `totalSaved` = Σ `current_balance` của savings goals có `status != 'cancelled'`
- `totalDebt` = Σ `outstanding_balance` của debts có `debt_type = 'debt'` AND `status = 'active'`
- `totalLoan` = Σ `outstanding_balance` của debts có `debt_type = 'loan'` AND status còn mở; đây là khoản phải thu, bù lại account cash đã giảm khi cho vay.

Tính tại: `useDashboard.ts`

> ⚠️ **Mâu thuẫn đã biết:** `DynamicChart.tsx` khi tính `debtOffset` dùng `status IN ('active', 'overdue')`,
> còn `useDebts.ts` chỉ dùng `status = 'active'`. Cần thống nhất.

---

## 5. Thu nhập / Chi tiêu tháng hiện tại

```
monthlyIncome   = Σ amount WHERE Transaction_Fact.transaction_type = 'income' AND transaction_date LIKE 'YYYY-MM%'
monthlyExpenses = Σ amount WHERE Transaction_Fact.transaction_type = 'expense' AND transaction_date LIKE 'YYYY-MM%'
netSavings      = monthlyIncome - monthlyExpenses
```

- Inner transfers, savings movements, and debt movements are excluded from income/expense.
- Tính tại: `useDashboard.ts`

---

## 6. Net worth theo thời gian (chart `asset-fluctuation`)

```
monthlyNetWorth[month] = Σ accountBalanceAtDate(account, lastDayOfMonth)
```

> ⚠️ **Khác với netWorth snapshot:** Chart này **chỉ cộng account balance**, không cộng savings và không trừ debt theo từng mốc thời gian.
> Tên chart là "asset-fluctuation" (biến động tài sản), không phải "net worth" thực sự.

Tính tại: `DynamicChart.tsx` → `dailyNetWorthData`

---

## 7. Savings Goals

### Storage
- `Savings_Dim.current_balance` — lưu trong DB, cập nhật từ `Savings_Transaction_Fact`.

### Công thức cập nhật
```
Contribution:  account -= amount; savings += amount
Withdrawal:    savings -= amount; account += amount
Auto-complete:      IF current_balance >= target_amount AND status = 'active' → status = 'completed'
```

### `totalSaved`
```
totalSaved = Σ current_balance WHERE status != 'cancelled'
```
Tính tại: `useDebts.ts` hook → field `totalSaved` (thực ra là `useSavings.ts`)

### Liên kết với transaction
- Savings movements are not mirrored into `Transaction_Fact`.
- Backend writes `Savings_Transaction_Fact` and updates account/savings balance in one batch.

---

## 8. Debts

### Storage
- `Debt_Dim.outstanding_balance` — lưu trong DB, cập nhật từ `Debt_Transaction_Fact`.

### Công thức cập nhật
```
Disbursement: outstanding_balance += amount
Payment:      outstanding_balance -= amount; IF <= 0 → status = 'settled'
```

### `totalDebt`
```
totalDebt = Σ outstanding_balance WHERE debt_type = 'debt' AND status = 'active'
```
Tính tại: `useDebts.ts`

### Debt types
| debt_type | Ý nghĩa |
|---|---|
| `debt` | Mình nợ người khác |
| `loan` | Người khác nợ mình |

Chỉ `debt` (mình nợ) được trừ vào `netWorth`. `loan` (mình cho vay) không tính vào debt offset.

### Liên kết với transaction
- Debt movements are not mirrored into `Transaction_Fact`.
- Backend writes `Debt_Transaction_Fact` and updates account/debt balance in one batch.
- Tạo debt/loan mới phải có `account_id` để phát sinh dòng tiền rõ ràng:
  - `debt`: nguồn là người cho vay/payee, đích là account nhận tiền (`cash_direction='in'`).
  - `loan`: nguồn là account của mình, đích là người vay/payee (`cash_direction='out'`).

---

## 9. Expense by Category (tháng hiện tại)

```
expenseByCategory[category_id] = Σ amount WHERE Transaction_Fact.transaction_type = 'expense' AND month = currentMonth
```

Dùng cho: donut chart "Phân bổ chi tiêu" trên dashboard.
Tính tại: `useDashboard.ts` và `DynamicChart.tsx` → `expenseAllocationData`

---

## 10. Budget

- Mỗi category có `budget` field (ngân sách tháng, VND).
- Budget được upsert riêng qua `PUT /api/budgets/<category_id>?month=YYYY-MM`.
- So sánh với `expenseByCategory` để hiển thị progress bar trong `BudgetOverview`.
- Budget **không tự động trừ** — chỉ là mục tiêu để so sánh.

---

## 11. Các vấn đề đã biết (Known Issues)

| # | Vấn đề | Nơi xảy ra | Mức độ |
|---|---|---|---|
| 1 | `totalDebt` dùng `status='active'` nhưng chart dùng `'active'\|'overdue'` | `useDebts.ts` vs `DynamicChart.tsx` | Medium |
| 2 | Net worth chart không cộng savings / trừ debt theo thời gian (chart chỉ track account balance) | `DynamicChart.tsx` | Low (tên chart đã đổi thành asset-fluctuation) |
| 3 | Schema `schema.sql` lỗi thời — thiếu nhiều migration runtime | `database/schema.sql` | Low (chỉ là doc) |
| 4 | Analytics page gọi `/api/analytics/*` không tồn tại — Flask chỉ có `POST /api/sql-query` | `analytics/index.tsx`, `api/analytics.ts`, `hooks/useAnalytics.ts` | High (page broken) |

---

## 12. Nguồn dữ liệu cho Dashboard

| Metric | Source |
|---|---|
| Số dư từng account | `acc.current_balance` từ `GET /api/accounts` (server-maintained) |
| `totalBalance` | `useDashboard` → `Σ acc.current_balance` |
| `netWorth` | `useDashboard` → `totalBalance + totalSaved + totalLoan - totalDebt` |
| `monthlyIncome/Expenses` | `useDashboard` ← `useTransactions` filter tháng hiện tại |
| `totalDebt` | `useDebts` ← `GET /api/debts` |
| `totalSaved` | `useSavings` ← `GET /api/savings` |
| Charts | `DynamicChart.tsx` nhận raw data từ `_authenticated/index.tsx` |
