# Requirements Document

## Introduction

Tài liệu này mô tả các yêu cầu cho việc refactor logic tài chính của ứng dụng **Finance Management by Voicer** theo **Option B** — tập trung vào bốn vấn đề cốt lõi:

1. **Transfer pair ràng buộc**: Đảm bảo hai transaction chuyển tiền luôn được tạo và xóa cùng nhau.
2. **Debt payment atomic**: Gộp việc tạo transaction và cập nhật `outstanding_balance` vào một DB transaction.
3. **Savings contribution atomic**: Gộp việc tạo transaction và cập nhật `current_balance` vào một DB transaction.
4. **Account `current_balance` server-side**: Lưu số dư account vào DB, cập nhật trong cùng DB transaction với mỗi INSERT/DELETE, để frontend không cần tính lại client-side.

Ngoài ra, thống nhất filter `totalDebt` giữa `useDebts` hook và `DynamicChart`.

Phạm vi **không bao gồm**: thay đổi UX trang Debts/Savings, thay đổi Gemini model hay AI prompt, thay đổi cấu trúc `Debt_Dim`/`Savings_Dim`.

---

## Glossary

- **Transaction_Fact**: Bảng DB lưu tất cả giao dịch tài chính. Mỗi hàng là một giao dịch đơn.
- **Account_Dim**: Bảng DB lưu thông tin tài khoản người dùng.
- **Debt_Dim**: Bảng DB lưu thông tin khoản nợ/cho vay.
- **Savings_Dim**: Bảng DB lưu thông tin mục tiêu tiết kiệm.
- **Debt_Payment_Fact**: Bảng DB lưu lịch sử thanh toán nợ.
- **Savings_Contribution_Fact**: Bảng DB lưu lịch sử nộp tiền tiết kiệm.
- **DB transaction**: Một đơn vị xử lý database đảm bảo tất cả các thao tác bên trong đều thành công hoặc đều rollback — sử dụng `BEGIN`/`COMMIT`/`ROLLBACK` của SQLite.
- **transfer_pair_id**: Cột TEXT nullable trong `Transaction_Fact`, định danh cặp transaction chuyển tiền giữa hai account. Format: `"pair-{timestamp_ms}"`.
- **transfer_in**: Loại transaction ghi tiền vào account (source trong cặp transfer).
- **transfer_out**: Loại transaction trừ tiền khỏi account (destination trong cặp transfer).
- **outstanding_balance**: Số dư nợ còn lại trong `Debt_Dim`.
- **current_balance** (Savings_Dim): Số tiền đã tích lũy trong mục tiêu tiết kiệm.
- **current_balance** (Account_Dim): Số dư hiện tại của account, lưu server-side sau refactor.
- **initial_balance**: Số dư ban đầu khi tạo account, vẫn giữ nguyên trong `Account_Dim`.
- **Backend**: Python Flask API chạy trên port 5000.
- **Frontend**: React 19 + TypeScript chạy qua Express BFF port 3000.
- **libsql_client**: Thư viện Python kết nối Turso/libSQL, không hỗ trợ stored procedures.
- **AIChatWidget**: Component frontend xử lý lệnh tài chính qua giọng nói/văn bản.
- **useDashboard**: Hook TanStack Query tổng hợp metrics cho dashboard.
- **useDebts**: Hook TanStack Query quản lý danh sách khoản nợ.
- **DynamicChart**: Component dashboard hiển thị các biểu đồ tài chính.
- **totalDebt**: Tổng số dư nợ (`debt_type = 'debt'`) của user, dùng trong `netWorth`.
- **Migration**: Script SQL chạy một lần để cập nhật schema DB, phải backward-compatible.

---

## Requirements

### Requirement 1: Transfer Pair Constraint

**User Story:** As a user, I want transfers between two accounts to stay in sync, so that my account balances are always accurate and money cannot disappear if one side of a transfer is deleted.

#### Acceptance Criteria

1. WHEN the Backend creates a transfer between two accounts, THE Backend SHALL create both the `transfer_out` and `transfer_in` transactions inside a single DB transaction using a shared `transfer_pair_id`.
2. WHEN a transfer transaction is deleted, THE Backend SHALL delete both the `transfer_out` and `transfer_in` transaction records belonging to the same `transfer_pair_id` inside a single DB transaction.
3. THE Backend SHALL add a `transfer_pair_id` column of type TEXT (nullable) to `Transaction_Fact` via a backward-compatible migration that sets existing rows to NULL.
4. WHEN a new transfer pair is created, THE Backend SHALL generate the `transfer_pair_id` with the format `"pair-{timestamp_ms}"` where `{timestamp_ms}` is the current Unix timestamp in milliseconds.
5. WHEN a transfer transaction that has no `transfer_pair_id` is deleted, THE Backend SHALL delete only that single transaction and SHALL NOT attempt to delete a paired record.
6. THE Backend SHALL expose a `POST /api/accounts/transfer` endpoint that accepts `from_account_id`, `to_account_id`, `amount`, `date`, and `note`, and creates the transfer pair atomically.
7. IF a DB error occurs during transfer creation after the first transaction is inserted, THEN THE Backend SHALL rollback the entire DB transaction so that no partial transfer is persisted.

---

### Requirement 2: Atomic Debt Payment

**User Story:** As a user, I want recording a debt payment to always update both the transaction history and the outstanding balance together, so that my debt status is never inconsistent even if a network error occurs.

#### Acceptance Criteria

1. WHEN a request is made to `POST /api/debts/<id>/payments`, THE Backend SHALL create the `transfer_out` (or `transfer_in` for loans) transaction record AND update `Debt_Dim.outstanding_balance` inside a single DB transaction.
2. IF a DB error occurs after inserting the payment record but before updating `outstanding_balance`, THEN THE Backend SHALL rollback the entire DB transaction so that neither the payment record nor the balance change is persisted.
3. WHEN the atomic endpoint creates the linked transaction, THE Backend SHALL set the `transaction_id` field of the `Debt_Payment_Fact` row to the ID of the created transaction.
4. THE `POST /api/debts/<id>/payments` endpoint SHALL accept `amount_paid`, `payment_date`, `account_id`, and optional `note` in the request body.
5. IF `account_id` is not provided in the request body, THEN THE Backend SHALL create the `Debt_Payment_Fact` record without creating a linked transaction.
6. WHEN the Frontend confirms a debt payment via `AIChatWidget`, THE Frontend SHALL call only `POST /api/debts/<id>/payments` (single API call) instead of calling `createTransferTransaction` and `debtsApi.createPayment` separately.
7. WHEN `Debt_Dim.outstanding_balance` reaches zero or below after a payment, THE Backend SHALL set `Debt_Dim.status` to `'settled'` in the same DB transaction.

---

### Requirement 3: Atomic Savings Contribution

**User Story:** As a user, I want recording a savings contribution to always update both the transaction history and the savings balance together, so that my savings progress is never inconsistent even if a network error occurs.

#### Acceptance Criteria

1. WHEN a request is made to `POST /api/savings/<id>/contributions`, THE Backend SHALL create the `transfer_out` transaction record AND update `Savings_Dim.current_balance` inside a single DB transaction.
2. IF a DB error occurs after inserting the contribution record but before updating `current_balance`, THEN THE Backend SHALL rollback the entire DB transaction so that neither the contribution record nor the balance change is persisted.
3. WHEN the atomic endpoint creates the linked transaction, THE Backend SHALL set the `transaction_id` field of the `Savings_Contribution_Fact` row to the ID of the created transaction.
4. THE `POST /api/savings/<id>/contributions` endpoint SHALL accept `amount`, `contribution_date`, `account_id`, and optional `note` in the request body.
5. IF `account_id` is not provided in the request body, THEN THE Backend SHALL create the `Savings_Contribution_Fact` record without creating a linked transaction.
6. WHEN the Frontend confirms a savings contribution via `AIChatWidget`, THE Frontend SHALL call only `POST /api/savings/<id>/contributions` (single API call) instead of calling `createTransferTransaction` and `savingsApi.createContribution` separately.
7. WHEN `Savings_Dim.current_balance` reaches or exceeds `target_amount` after a contribution, THE Backend SHALL set `Savings_Dim.status` to `'completed'` in the same DB transaction.

---

### Requirement 4: Server-Side Account current_balance

**User Story:** As a user, I want account balances to load instantly without recalculating from transaction history, so that the dashboard is responsive even after years of data.

#### Acceptance Criteria

1. THE Backend SHALL add a `current_balance` column of type INTEGER to `Account_Dim` via a backward-compatible migration.
2. WHEN the migration runs for the first time, THE Backend SHALL recompute and populate `current_balance` for all existing accounts by summing their `Transaction_Fact` records (positive for `income`/`transfer_in`, negative for `expense`/`transfer_out`), using `initial_balance` as the starting value.
3. WHEN a new transaction is inserted into `Transaction_Fact`, THE Backend SHALL update `Account_Dim.current_balance` for the affected account inside the same DB transaction.
4. WHEN a transaction is soft-deleted from `Transaction_Fact`, THE Backend SHALL reverse the transaction's contribution to `Account_Dim.current_balance` for the affected account inside the same DB transaction.
5. THE `GET /api/accounts` endpoint SHALL include `current_balance` in each account object returned to the Frontend.
6. WHEN the Frontend receives account data from `GET /api/accounts`, THE Frontend `AccountsSummary` component SHALL display `account.current_balance` directly instead of recomputing balance from transactions.
7. WHEN the Frontend receives account data from `GET /api/accounts`, THE `useDashboard` hook SHALL compute `totalBalance` by summing `account.current_balance` from the accounts list instead of iterating over all transactions.
8. WHEN the `DynamicChart` component renders the `account-distribution` chart, THE Chart SHALL use `account.current_balance` from the accounts list instead of calling `currentAccountBalance()` with the full transaction history.
9. WHEN a new account is created via `POST /api/accounts`, THE Backend SHALL set `current_balance` equal to `initial_balance` in the INSERT statement.
10. WHEN `Account_Dim.initial_balance` is updated via `PUT /api/accounts/<id>`, THE Backend SHALL recalculate `current_balance` as `new_initial_balance + Σ(transaction contributions)` in the same DB transaction.

---

### Requirement 5: Unified totalDebt Filter

**User Story:** As a user, I want the debt total shown in my net worth and debt breakdown chart to always be the same number, so that I am not confused by inconsistent figures across the dashboard.

#### Acceptance Criteria

1. THE `useDebts` hook SHALL compute `totalDebt` by summing `outstanding_balance` for records WHERE `debt_type = 'debt'` AND `status IN ('active', 'overdue')`.
2. THE `DynamicChart` component SHALL compute `debtOffset` for the `asset-fluctuation` chart using the same filter: `debt_type = 'debt'` AND `status IN ('active', 'overdue')`.
3. THE `useDashboard` hook SHALL receive `totalDebt` from `useDebts` and use it unchanged for `netWorth` computation, so that all three locations (`useDebts`, `useDashboard`, `DynamicChart`) reference the same value.
4. WHEN a debt's `status` changes to `'overdue'`, THE `useDebts` hook SHALL include that debt's `outstanding_balance` in `totalDebt`.
5. WHEN a debt's `status` is `'settled'` or `'cancelled'`, THE `useDebts` hook SHALL exclude that debt from `totalDebt`.

---

### Requirement 6: Migration Safety and Data Integrity

**User Story:** As a developer, I want all schema changes to be backward-compatible and reversible, so that existing user data is never lost during deployment.

#### Acceptance Criteria

1. WHEN the migration for `transfer_pair_id` is applied, THE Migration SHALL use `ALTER TABLE Transaction_Fact ADD COLUMN transfer_pair_id TEXT` so that existing rows default to NULL without data loss.
2. WHEN the migration for `Account_Dim.current_balance` is applied, THE Migration SHALL use `ALTER TABLE Account_Dim ADD COLUMN current_balance INTEGER NOT NULL DEFAULT 0` and then immediately execute an UPDATE to recompute balances from `Transaction_Fact`.
3. THE Backend SHALL execute migrations at application startup in a safe, idempotent manner so that restarting the server does not corrupt data.
4. IF a migration has already been applied, THEN THE Backend SHALL skip re-running it without raising an error.
5. WHEN a debt payment is deleted via `DELETE /api/debts/<id>/payments/<payment_id>`, THE Backend SHALL reverse both the `Debt_Dim.outstanding_balance` change and soft-delete the linked transaction (if any) inside a single DB transaction.
6. WHEN a savings contribution is deleted via `DELETE /api/savings/<id>/contributions/<contribution_id>`, THE Backend SHALL reverse both the `Savings_Dim.current_balance` change and soft-delete the linked transaction (if any) inside a single DB transaction.
7. WHEN the Backend updates `Account_Dim.current_balance` due to a transaction soft-delete, THE Backend SHALL reverse exactly the amount that was originally applied, preserving the sign direction based on transaction type.
