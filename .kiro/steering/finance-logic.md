# Finance Logic — Trạng thái hiện tại

Tài liệu này mô tả toàn bộ logic tính toán tài chính hiện đang hoạt động trong app.
Đọc file này trước khi thay đổi bất kỳ công thức nào liên quan đến số dư, net worth, thu/chi, debt, savings.

---

## 1. Transaction Types

Có 4 loại giao dịch (`type` field trong `Transaction_Fact`):

| type | Ý nghĩa | Ảnh hưởng số dư account |
|---|---|---|
| `income` | Thu nhập | **+** amount |
| `expense` | Chi tiêu | **-** amount |
| `transfer_in` | Tiền chuyển vào account | **+** amount |
| `transfer_out` | Tiền chuyển ra khỏi account | **-** amount |

**Quy tắc quan trọng:**
- `transfer_in` và `transfer_out` ảnh hưởng số dư account nhưng **KHÔNG được tính vào income/expense** trong bất kỳ summary hay chart nào.
- Tất cả `amount` là **số nguyên dương (VND)**. Chiều thu/chi encode bằng `type`, không dùng số âm.
- `transfer_in/out` hiện **không có ràng buộc cặp** — hai giao dịch chuyển khoản là độc lập nhau trong DB.

Helper functions tại `frontend/lib/transaction-types.ts`:
```ts
isPositiveTransactionType(type) → type === 'income' || type === 'transfer_in'
isNegativeTransactionType(type) → type === 'expense' || type === 'transfer_out'
isTransferTransactionType(type) → type === 'transfer_in' || type === 'transfer_out'
```

---

## 2. Số dư tài khoản (`current_balance`)

**Tính hoàn toàn client-side** — không lưu trong DB. `Account_Dim` chỉ có `initial_balance`.

```
current_balance(account) =
  initial_balance
  + Σ amount WHERE account_id = X AND type IN ('income', 'transfer_in')
  - Σ amount WHERE account_id = X AND type IN ('expense', 'transfer_out')
```

Áp dụng tại:
- `frontend/components/dashboard/AccountsSummary.tsx` → hàm `computeBalance()`
- `frontend/hooks/useDashboard.ts` → trong `totalBalance` reducer
- `frontend/components/dashboard/DynamicChart.tsx` → hàm `currentAccountBalance()` và `accountBalanceAtDate()`

---

## 3. Tổng số dư tất cả accounts (`totalBalance`)

```
totalBalance = Σ current_balance(account) cho tất cả accounts của user
```

Tính tại: `useDashboard.ts`

---

## 4. Tổng tài sản ròng snapshot (`netWorth`)

```
netWorth = totalBalance + totalSaved - totalDebt
```

Trong đó:
- `totalSaved` = Σ `current_balance` của savings goals có `status != 'cancelled'`
- `totalDebt` = Σ `outstanding_balance` của debts có `debt_type = 'debt'` AND `status = 'active'`

Tính tại: `useDashboard.ts`

> ⚠️ **Mâu thuẫn đã biết:** `DynamicChart.tsx` khi tính `debtOffset` dùng `status IN ('active', 'overdue')`,
> còn `useDebts.ts` chỉ dùng `status = 'active'`. Cần thống nhất.

---

## 5. Thu nhập / Chi tiêu tháng hiện tại

```
monthlyIncome   = Σ amount WHERE type = 'income' AND transaction_date LIKE 'YYYY-MM%'
monthlyExpenses = Σ amount WHERE type = 'expense' AND transaction_date LIKE 'YYYY-MM%'
netSavings      = monthlyIncome - monthlyExpenses
```

- **transfer_in/out bị loại hoàn toàn** — không tính vào income hay expense.
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
- `Savings_Dim.current_balance` — lưu trong DB, cập nhật khi thêm/xóa contribution.

### Công thức cập nhật
```
Thêm contribution:  current_balance += amount
Xóa contribution:   current_balance = MAX(0, current_balance - amount)
Auto-complete:      IF current_balance >= target_amount AND status = 'active' → status = 'completed'
```

### `totalSaved`
```
totalSaved = Σ current_balance WHERE status != 'cancelled'
```
Tính tại: `useDebts.ts` hook → field `totalSaved` (thực ra là `useSavings.ts`)

### Liên kết với transaction
- Contribution có field `transaction_id` (nullable) để liên kết với `Transaction_Fact`.
- **Không có ràng buộc DB** — app không tự động tạo transaction khi thêm contribution.
- AI widget có thể tạo cả `transfer_out` transaction lẫn contribution — có nguy cơ double-count nếu không quản lý đúng.

---

## 8. Debts

### Storage
- `Debt_Dim.outstanding_balance` — lưu trong DB, cập nhật khi thêm/xóa payment.

### Công thức cập nhật
```
Thêm payment:  outstanding_balance -= amount_paid; IF <= 0 → status = 'settled'
Xóa payment:   outstanding_balance += amount_paid; IF was 'settled' → status = 'active'
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
- Payment có field `transaction_id` (nullable).
- **Không có ràng buộc DB** — tương tự savings.
- AI widget có thể tạo cả `expense` transaction lẫn payment — có nguy cơ double-count.

---

## 9. Expense by Category (tháng hiện tại)

```
expenseByCategory[category_id] = Σ amount WHERE type = 'expense' AND month = currentMonth
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
| 2 | Net worth chart không cộng savings / trừ debt theo thời gian | `DynamicChart.tsx` | Low (tên chart đã đổi) |
| 3 | `transfer_in/out` không có ràng buộc cặp trong DB | `Transaction_Fact` | Medium |
| 4 | Savings contribution và expense transaction có thể double-count khi dùng AI | `AIChatWidget.tsx` | High |
| 5 | Debt payment và expense transaction có thể double-count khi dùng AI | `AIChatWidget.tsx` | High |
| 6 | Schema `schema.sql` lỗi thời — thiếu `user_id`, `is_deleted`, `payee_id`, `location`, `Debt_Dim`, `Savings_Dim`, `split_transactions` | `database/schema.sql` | Low (chỉ là doc) |

---

## 12. Nguồn dữ liệu cho Dashboard

| Metric | Source |
|---|---|
| Số dư từng account | Tính từ `transactions` (client-side) |
| `totalBalance` | `useDashboard` ← `useAccounts` + `useTransactions` |
| `netWorth` | `useDashboard` ← trên + `useDebts` + `useSavings` |
| `monthlyIncome/Expenses` | `useDashboard` ← `useTransactions` filter tháng hiện tại |
| `totalDebt` | `useDebts` ← `GET /api/debts` |
| `totalSaved` | `useSavings` ← `GET /api/savings` |
| Charts | `DynamicChart.tsx` nhận raw data từ `_authenticated/index.tsx` |
