# Requirements: Debt & Savings Management

## Overview

Mở rộng Finance Management by Voicer để theo dõi **nợ/vay** và **tiết kiệm có mục tiêu**. Cả hai tính năng được tích hợp với AI parser hiện có để người dùng có thể nhập liệu bằng ngôn ngữ tự nhiên tiếng Việt.

---

## Feature 1: Debt Management (Quản lý Nợ/Vay)

### 1.1 Khái niệm nghiệp vụ

Một khoản nợ/vay (debt record) ghi lại mối quan hệ tài chính giữa hai bên:

| Thuật ngữ | Định nghĩa |
|---|---|
| **Lender** (Người cho vay) | Bên cung cấp tiền |
| **Debtor** (Người nhận tiền / người nợ) | Bên nhận tiền và có nghĩa vụ hoàn trả |
| **debt_type = "debt"** | Tôi là Debtor — tôi vay của người khác |
| **debt_type = "loan"** | Tôi là Lender — người khác vay của tôi |

### 1.2 Yêu cầu chức năng

**REQ-D1: Tạo debt record thủ công**
- User có thể tạo một khoản nợ/vay với các thông tin:
  - `name` — tên khoản nợ (bắt buộc, ví dụ: "Vay Hiền tiền nhà")
  - `debt_type` — `"debt"` (tôi nợ) hoặc `"loan"` (tôi cho vay), bắt buộc
  - `lender` — tên người cho vay (text, không dùng payee FK để linh hoạt)
  - `debtor` — tên người nợ (text)
  - `principal` — số tiền gốc ban đầu (VND, bắt buộc, > 0)
  - `outstanding_balance` — số tiền còn lại phải trả/thu (mặc định = principal)
  - `start_date` — ngày phát sinh (mặc định hôm nay)
  - `due_date` — hạn thanh toán (tuỳ chọn)
  - `note` — ghi chú thêm
  - `status` — `"active"` | `"settled"` | `"overdue"` (mặc định: `"active"`)

**REQ-D2: Xem danh sách debt records**
- Hiển thị tất cả debt records của user, phân nhóm theo `debt_type`:
  - Section "Tôi đang nợ" (debt_type = debt)
  - Section "Người khác nợ tôi" (debt_type = loan)
- Mỗi item hiển thị: tên, lender/debtor, số tiền gốc, số tiền còn lại, hạn, status
- Filter theo status (active / settled / overdue)

**REQ-D3: Ghi nhận thanh toán (Record Payment)**
- User có thể ghi nhận một lần thanh toán cho một debt record
- Nhập: `amount_paid`, `payment_date`, liên kết tuỳ chọn với một `transaction_id`
- Hệ thống tự động cập nhật `outstanding_balance = outstanding_balance - amount_paid`
- Khi `outstanding_balance <= 0`, tự động chuyển `status = "settled"`

**REQ-D4: Sửa và xóa debt record**
- User có thể sửa tất cả các field trừ `debt_id` và `user_id`
- Xóa là hard delete (debt record không cần soft delete)
- Khi xóa debt record, các payment records liên quan cũng bị xóa (cascade)

**REQ-D5: Xem lịch sử thanh toán**
- Với mỗi debt record, user có thể xem danh sách các lần đã thanh toán

**REQ-D6: Chỉ báo hạn thanh toán (Due Date Alert)**
- Nếu `due_date` đã qua và `status = "active"`, hiển thị badge "Quá hạn" màu đỏ
- Nếu `due_date` còn < 7 ngày và `status = "active"`, hiển thị badge "Sắp đến hạn" màu vàng

### 1.3 AI Parser — Nhận dạng ngôn ngữ tự nhiên

**REQ-D7: AI nhận dạng câu về nợ/vay**

Khi user nhập câu có liên quan đến vay mượn, AI phải:
- Xác định `debt_type`: nếu **tôi vay / tôi mượn / tôi nợ** → `"debt"`;  nếu **tôi cho vay / tôi cho mượn / người khác mượn tôi** → `"loan"`
- Extract `lender` và `debtor` từ nội dung câu
- Extract `principal` (số tiền)
- Extract `due_date` nếu có đề cập ("trả sau 1 tuần", "hạn cuối tháng")

**Ví dụ nhận dạng:**

| Câu nhập | debt_type | lender | debtor | principal |
|---|---|---|---|---|
| "tôi vay Hiền 100k" | debt | Hiền | Tôi | 100,000 |
| "mượn tiền anh Nam 500k" | debt | anh Nam | Tôi | 500,000 |
| "cho Tuấn mượn 2 củ" | loan | Tôi | Tuấn | 2,000,000 |
| "Lan nợ tôi 300k" | loan | Tôi | Lan | 300,000 |
| "trả Hiền 50k" | payment | — | — | 50,000 (payment) |

**Từ đồng nghĩa AI phải nhận dạng:**
- Vay = mượn = nợ = cần tiền từ = xin tiền
- Cho vay = cho mượn = cho tiền = ứng tiền

**REQ-D8: AI suggest debt record khi nhập payment**
- Nếu user nhập "trả Hiền 50k", AI tìm trong debt records các khoản có lender = "Hiền" đang active
- Nếu tìm thấy, trả về gợi ý "Bạn có muốn ghi nhận thanh toán cho khoản nợ 'Vay Hiền' không?"
- User confirm → tạo payment record và cập nhật outstanding_balance

### 1.4 Dashboard Integration

**REQ-D9: Debt summary trên Dashboard**
- Dashboard hiển thị 2 số: "Tổng tôi đang nợ" và "Tổng người nợ tôi"
- Chỉ tính các record có `status = "active"`
- Click → navigate đến /debts

---

## Feature 2: Savings Management (Quản lý Tiết kiệm)

### 2.1 Khái niệm nghiệp vụ

Savings là **quỹ tiết kiệm có mục tiêu** — user tạo một quỹ với mục tiêu số tiền cần đạt, và ghi nhận các lần đóng góp (contribution) vào quỹ đó.

Ví dụ: "Quỹ mua nhà — mục tiêu 500 triệu", mỗi tháng tiết kiệm 5 triệu thì contribution = 5 triệu.

### 2.2 Yêu cầu chức năng

**REQ-S1: Tạo savings goal**
- User có thể tạo một quỹ tiết kiệm với:
  - `name` — tên quỹ (bắt buộc, ví dụ: "Quỹ mua nhà", "Quỹ du lịch Nhật")
  - `target_amount` — mục tiêu số tiền cần đạt (VND, bắt buộc, > 0)
  - `current_balance` — số tiền đã có (mặc định 0)
  - `target_date` — ngày mục tiêu (tuỳ chọn)
  - `linked_account_id` — liên kết với tài khoản nguồn (tuỳ chọn)
  - `note` — ghi chú
  - `status` — `"active"` | `"completed"` | `"cancelled"` (mặc định: `"active"`)

**REQ-S2: Xem danh sách savings goals**
- Hiển thị tất cả savings goals của user
- Mỗi item hiển thị: tên, progress bar (current/target), %, ngày mục tiêu, status
- Filter theo status

**REQ-S3: Ghi nhận contribution (đóng tiền vào quỹ)**
- User có thể ghi nhận một lần đóng tiền vào quỹ
- Nhập: `amount`, `contribution_date`, liên kết tuỳ chọn với `transaction_id`
- Hệ thống tự động cập nhật `current_balance += amount`
- Khi `current_balance >= target_amount`, tự động chuyển `status = "completed"`

**REQ-S4: Xem lịch sử contribution**
- Với mỗi savings goal, user có thể xem danh sách các lần đã đóng tiền

**REQ-S5: Sửa và xóa savings goal**
- User có thể sửa tất cả field trừ `savings_id` và `user_id`
- Xóa là hard delete, contribution records bị xóa cascade

**REQ-S6: Progress indicator**
- Hiển thị % hoàn thành: `current_balance / target_amount * 100`
- Màu progress bar: xanh khi < 80%, vàng khi 80–99%, emerald khi 100% (completed)
- Nếu `target_date` đã qua mà `status != "completed"`, hiển thị badge "Chậm tiến độ"

### 2.3 AI Parser — Nhận dạng ngôn ngữ tự nhiên

**REQ-S7: AI nhận dạng câu về tiết kiệm**

Khi user nhập câu liên quan đến để dành/tiết kiệm, AI phải:
- Xác định đây là savings contribution (không phải expense)
- Extract `amount`
- Extract tên quỹ từ nội dung câu (nếu có)
- Nếu tên quỹ khớp với savings goal đang active → ghi nhận contribution vào quỹ đó
- Nếu không tìm thấy quỹ phù hợp → gợi ý tạo quỹ mới

**Ví dụ nhận dạng:**

| Câu nhập | Hành động AI |
|---|---|
| "để dành 500k vào quỹ mua nhà" | contribution 500k → tìm savings goal "mua nhà" |
| "tiết kiệm 1 củ cho chuyến du lịch" | contribution 1,000,000 → tìm goal "du lịch" |
| "để dành 200k" | contribution 200k → hỏi user chọn quỹ nào |
| "nạp vào quỹ khẩn cấp 300k" | contribution 300k → tìm goal "khẩn cấp" |

**Từ đồng nghĩa AI phải nhận dạng:**
- Để dành = tiết kiệm = dành dụm = để ra = cất vào = nạp vào quỹ = bỏ heo

**REQ-S8: Tạo savings goal qua AI**
- Nếu user nhập "lập quỹ mua xe mục tiêu 200 triệu" → AI tạo savings goal mới
- AI extract: tên quỹ, target_amount, target_date (nếu có)

### 2.4 Dashboard Integration

**REQ-S9: Savings summary trên Dashboard**
- Dashboard hiển thị tổng số tiền đã tiết kiệm (tổng `current_balance` của tất cả active goals)
- Hiển thị savings goal nào gần đạt mục tiêu nhất (% cao nhất)
- Click → navigate đến /savings

---

## Feature 3: AI Chat Widget — Mở rộng

### 3.1 Yêu cầu mở rộng parser

**REQ-A1: Output schema mở rộng**

AI parser hiện tại trả về: `{valid, amount, type, category, account, note, transaction_date, payee_name}`

Cần mở rộng thêm field `intent`:

```
intent: "transaction" | "debt_create" | "debt_payment" | "savings_contribution" | "savings_create"
```

Khi `intent != "transaction"`, trả về thêm các field tương ứng:

**Với debt_create:**
```json
{
  "intent": "debt_create",
  "debt_type": "debt" | "loan",
  "lender": "string",
  "debtor": "string",
  "principal": number,
  "due_date": "YYYY-MM-DD" | null,
  "note": "string"
}
```

**Với debt_payment:**
```json
{
  "intent": "debt_payment",
  "counterparty": "string",  // tên người liên quan
  "amount": number,
  "payment_date": "YYYY-MM-DD HH:MM:SS"
}
```

**Với savings_contribution:**
```json
{
  "intent": "savings_contribution",
  "savings_name": "string",  // tên quỹ, empty nếu không xác định
  "amount": number,
  "contribution_date": "YYYY-MM-DD HH:MM:SS"
}
```

**Với savings_create:**
```json
{
  "intent": "savings_create",
  "savings_name": "string",
  "target_amount": number,
  "target_date": "YYYY-MM-DD" | null,
  "note": "string"
}
```

**REQ-A2: AIChatWidget xử lý intent mới**
- Khi nhận intent `debt_create` → hiện card confirm với lender/debtor/amount/type
- Khi nhận intent `debt_payment` → tìm debt record phù hợp, hiện card confirm
- Khi nhận intent `savings_contribution` → tìm savings goal phù hợp, hiện card confirm
- Khi nhận intent `savings_create` → hiện card confirm với tên quỹ và target

---

## Feature 4: Backend API Requirements

### 4.1 Debt API

```
GET    /api/debts                        — list user's debt records
POST   /api/debts                        — create debt record
PUT    /api/debts/<debt_id>              — update debt record
DELETE /api/debts/<debt_id>              — hard delete

GET    /api/debts/<debt_id>/payments     — list payments for a debt
POST   /api/debts/<debt_id>/payments     — record a payment
DELETE /api/debts/<debt_id>/payments/<payment_id>  — delete payment
```

### 4.2 Savings API

```
GET    /api/savings                              — list user's savings goals
POST   /api/savings                              — create savings goal
PUT    /api/savings/<savings_id>                 — update savings goal
DELETE /api/savings/<savings_id>                 — hard delete

GET    /api/savings/<savings_id>/contributions   — list contributions
POST   /api/savings/<savings_id>/contributions   — add contribution
DELETE /api/savings/<savings_id>/contributions/<contribution_id>  — delete contribution
```

### 4.3 Database Schema (đã có trong codebase, cần điều chỉnh)

**Debt_Dim — cần bỏ các field không dùng:**
```sql
-- Giữ lại:
debt_id, user_id, name, debt_type CHECK IN ('loan','debt'),
lender, debtor, principal, outstanding_balance,
start_date, due_date, status CHECK IN ('active','settled','overdue'),
note, created_at

-- Bỏ (không cần vì không dùng lãi suất):
interest_rate, interest_type, minimum_payment, payment_frequency
```

**Savings_Dim — cần bỏ các field không dùng:**
```sql
-- Giữ lại:
savings_id, user_id, name, target_amount, current_balance,
target_date, linked_account_id, status CHECK IN ('active','completed','cancelled'),
note, created_at

-- Bỏ:
category, interest_rate
```

---

## Feature 5: Frontend Routes

```
/debts       — Debt management page (list, add, edit, record payment)
/savings     — Savings management page (list, add, edit, add contribution)
```

Cả hai route nằm trong `/_authenticated` và có link trong sidebar.

---

## Acceptance Criteria tóm tắt

| # | Scenario | Expected |
|---|---|---|
| D1 | User nhập "tôi vay Hiền 100k" vào AI chat | Hiện card: debt, lender=Hiền, debtor=Tôi, 100,000đ |
| D2 | User confirm → debt record được tạo với status=active | ✅ Xuất hiện trong /debts section "Tôi đang nợ" |
| D3 | User nhập "trả Hiền 50k" | AI tìm khoản nợ Hiền, gợi ý payment 50k |
| D4 | User confirm payment → outstanding_balance giảm | 100k → 50k |
| D5 | User nhập "trả Hiền 50k" lần nữa | outstanding_balance = 0, status = settled |
| S1 | User tạo quỹ "Mua nhà" mục tiêu 500 triệu | Xuất hiện trong /savings với progress 0% |
| S2 | User nhập "để dành 500k vào quỹ mua nhà" | AI nhận dạng savings_contribution, khớp quỹ "Mua nhà" |
| S3 | User confirm → contribution 500k được ghi nhận | current_balance += 500k, progress cập nhật |
| S4 | Khi current_balance >= target_amount | status tự động = completed |
| A1 | Dashboard hiển thị tổng nợ + tổng tiết kiệm | Số liệu đúng, click navigate đúng route |
