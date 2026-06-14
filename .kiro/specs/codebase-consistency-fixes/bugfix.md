# Bugfix Requirements Document

## Introduction

Tài liệu này ghi lại 5 lỗi nhất quán trong codebase frontend của Finance Management by Voicer,
được phát hiện qua kiểm tra codebase. Các lỗi được sắp xếp theo thứ tự ưu tiên: CRITICAL → HIGH → MEDIUM → LOW.

Phạm vi: toàn bộ là lỗi frontend. Backend không cần thay đổi.

**Các lỗi:**
- Bug 1 (CRITICAL): `confirmEntry` đọc `parsed` thay vì `draft` cho debt operations — `AIChatWidget.tsx`
- Bug 2 (HIGH): `accountBalanceAtDate()` bỏ sót `inner_transfer` — `DynamicChart.tsx`
- Bug 3 (MEDIUM): Legacy `opType === 'new_debt'` còn sót — `AIChatWidget.tsx`
- Bug 4 (MEDIUM): `invalidateQueries(['dashboard'])` vô dụng — `useAccounts.ts`
- Bug 5 (LOW): 3 i18n keys thiếu trong `en/common.json`

## Bug Analysis

### Current Behavior (Defect)

<!-- Bug 1 (CRITICAL): confirmEntry đọc parsed thay vì draft cho debt operations -->

1.1 WHEN user chỉnh sửa draft của `debt_disbursement` (thay đổi account, sửa amount, sửa note) rồi nhấn Confirm THEN the system gọi `debtsApi.createDebt()` với dữ liệu từ `parsed` (dữ liệu AI gốc) thay vì từ `draft` (giá trị user đã chỉnh sửa)

1.2 WHEN user chỉnh sửa draft của `debt_payment` (thay đổi debt được chọn, thay đổi account, sửa amount) rồi nhấn Confirm THEN the system gọi `debtsApi.createPayment()` với `parsed.debt_id`, `parsed.account_id`, `parsed.amount` thay vì giá trị từ `draft`, bao gồm trường hợp `parsed.debt_id` là `null`

1.3 WHEN `syncParsedFromDraft()` tồn tại trong codebase và xử lý đúng cho cả `debt_disbursement` lẫn `debt_payment` THEN the system không gọi hàm này trong `confirmEntry` trước khi thực thi debt operations

<!-- Bug 2 (HIGH): accountBalanceAtDate() bỏ sót inner_transfer -->

1.4 WHEN tính toán balance lịch sử của một account tại một ngày cụ thể để vẽ biểu đồ asset-fluctuation THEN the system bỏ qua các giao dịch `inner_transfer` vì `cashDirectionForTransaction()` trả về `'neutral'`, khiến balance không được cộng/trừ cho loại giao dịch này

1.5 WHEN một account có giao dịch `inner_transfer` với vai trò `source_account_id` hoặc `destination_account_id` THEN the system hiển thị balance lịch sử sai trên biểu đồ asset-fluctuation

<!-- Bug 3 (MEDIUM): Legacy 'new_debt' còn sót -->

1.6 WHEN code trong `buildDraft()` và `confirmEntry()` kiểm tra loại operation cho debt disbursement THEN the system dùng điều kiện `opType === 'debt_disbursement' || opType === 'new_debt'`, giữ lại legacy string `'new_debt'` không còn là naming chuẩn

<!-- Bug 4 (MEDIUM): invalidateQueries(['dashboard']) vô dụng -->

1.7 WHEN các mutation `useAddAccount`, `useUpdateAccount`, `useDeleteAccount`, `useTransferBetweenAccounts` hoàn thành THEN the system gọi `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` nhưng không có `useQuery` nào dùng key `['dashboard']`, khiến lệnh invalidate không có tác dụng

<!-- Bug 5 (LOW): 3 i18n keys thiếu trong en/common.json -->

1.8 WHEN user chọn ngôn ngữ EN và ứng dụng render key `dashboard.budgetTitle` THEN the system hiển thị raw key string thay vì text tiếng Anh do key không tồn tại trong `en/common.json`

1.9 WHEN user chọn ngôn ngữ EN và ứng dụng render key `dashboard.noBudgetForMonth` THEN the system hiển thị raw key string thay vì text tiếng Anh

1.10 WHEN user chọn ngôn ngữ EN và ứng dụng render key `dashboard.budgetLoadError` THEN the system hiển thị raw key string thay vì text tiếng Anh

### Expected Behavior (Correct)

<!-- Bug 1 fixes -->

2.1 WHEN user chỉnh sửa draft của `debt_disbursement` rồi nhấn Confirm THEN the system SHALL gọi `syncParsedFromDraft(parsed, draft)` để sync dữ liệu trước khi thực thi, và đọc `debt_name`, `debt_type`, `lender`, `debtor`, `amount`, `account_id`, `note` từ kết quả đã sync khi gọi `debtsApi.createDebt()`

2.2 WHEN user chỉnh sửa draft của `debt_payment` rồi nhấn Confirm THEN the system SHALL gọi `syncParsedFromDraft(parsed, draft)` để sync dữ liệu trước khi thực thi, và đọc `debt_id`, `account_id`, `amount`, `transaction_date`, `note` từ kết quả đã sync khi gọi `debtsApi.createPayment()`, tránh trường hợp `debt_id` là `null`

<!-- Bug 2 fix -->

2.3 WHEN `accountBalanceAtDate()` gặp giao dịch `inner_transfer` THEN the system SHALL trừ `tx.amount` nếu account là `source_account_id`, và cộng `tx.amount` nếu account là `destination_account_id` — dùng `operationTypeForTransaction(tx)` để nhận diện loại giao dịch thay vì `cashDirectionForTransaction(tx)`

<!-- Bug 3 fix -->

2.4 WHEN code kiểm tra debt disbursement operation type trong `AIChatWidget.tsx` THEN the system SHALL chỉ dùng `opType === 'debt_disbursement'`, loại bỏ `|| opType === 'new_debt'` khỏi tất cả condition checks

<!-- Bug 4 fix -->

2.5 WHEN `useAddAccount`, `useUpdateAccount`, `useDeleteAccount` hoàn thành THEN the system SHALL xóa lệnh `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` thừa khỏi từng mutation's `onSuccess`

2.6 WHEN `useTransferBetweenAccounts` hoàn thành THEN the system SHALL xóa lệnh `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` thừa, giữ nguyên invalidation cho `['accounts']` và `['transactions']`

<!-- Bug 5 fix -->

2.7 WHEN user chọn ngôn ngữ EN và ứng dụng render key `dashboard.budgetTitle` THEN the system SHALL hiển thị `"Budget"` từ `en/common.json`

2.8 WHEN user chọn ngôn ngữ EN và ứng dụng render key `dashboard.noBudgetForMonth` THEN the system SHALL hiển thị `"No budget for {{month}}."` từ `en/common.json`

2.9 WHEN user chọn ngôn ngữ EN và ứng dụng render key `dashboard.budgetLoadError` THEN the system SHALL hiển thị `"Could not load budget data for the selected month."` từ `en/common.json`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN user xác nhận `inner_transfer` draft không chỉnh sửa hoặc đã chỉnh sửa THEN the system SHALL CONTINUE TO đọc đúng từ `draft` và gọi `accountsApi.transferBetweenAccounts()` với dữ liệu chính xác

3.2 WHEN user xác nhận `savings_contribution` hoặc `savings_withdrawal` draft THEN the system SHALL CONTINUE TO đọc đúng từ `parsed` (đã sync từ draft) và gọi đúng savings API

3.3 WHEN user xác nhận `transaction` (income/expense) draft THEN the system SHALL CONTINUE TO lưu đúng dữ liệu từ draft thông qua `addTransaction`

3.4 WHEN user không chỉnh sửa debt draft và xác nhận ngay THEN the system SHALL CONTINUE TO lưu đúng dữ liệu gốc từ AI parse (sync từ draft không làm mất dữ liệu gốc)

3.5 WHEN `accountBalanceAtDate()` xử lý giao dịch `income` THEN the system SHALL CONTINUE TO cộng `tx.amount` vào balance

3.6 WHEN `accountBalanceAtDate()` xử lý giao dịch `expense` THEN the system SHALL CONTINUE TO trừ `tx.amount` khỏi balance

3.7 WHEN biểu đồ asset-fluctuation hiển thị accounts không có inner_transfer THEN the system SHALL CONTINUE TO tính balance lịch sử đúng như trước

3.8 WHEN AI parse trả về `operation_type === 'debt_disbursement'` THEN the system SHALL CONTINUE TO xử lý đúng luồng tạo debt mới

3.9 WHEN `operationTypeForTransaction()` trong `lib/transaction-types.ts` cần xử lý legacy data có `operation_type === 'new_debt'` từ database THEN the system SHALL CONTINUE TO giữ nguyên backward compatibility trong lib (không thay đổi file này)

3.10 WHEN `useAddAccount` hoàn thành THEN the system SHALL CONTINUE TO invalidate `['accounts']` để danh sách account refresh ngay

3.11 WHEN `useTransferBetweenAccounts` hoàn thành THEN the system SHALL CONTINUE TO invalidate `['accounts']` và `['transactions']`

3.12 WHEN user dùng ngôn ngữ VI THEN the system SHALL CONTINUE TO hiển thị đúng các key `dashboard.budgetTitle`, `dashboard.noBudgetForMonth`, `dashboard.budgetLoadError` từ `vi/common.json`

3.13 WHEN tất cả các key i18n khác trong cả hai locale files THEN the system SHALL CONTINUE TO hoạt động không thay đổi
