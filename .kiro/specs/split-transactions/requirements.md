# Requirements Document — Split Transactions (Week 5)

## Introduction

This feature allows a single transaction to be split across multiple categories. The classic use case: a supermarket trip for 500,000 VND = 300,000 VND food + 200,000 VND household supplies. Without splits, users must log two separate transactions. With splits, one parent transaction holds the total amount, and child split rows distribute it across categories.

**Depends on:** `multi-user-auth-isolation` (Week 1) complete.

## Glossary

- **Parent Transaction**: The original `Transaction_Fact` row holding the total amount and account
- **Split**: A child row in `split_transactions` allocating a portion of the parent amount to a specific category
- **split_amount**: The VND amount assigned to one split category (all splits must sum to parent amount)

---

## Requirements

### Requirement 1: Split Transactions Table

**User Story:** As a user, I want to split a single transaction across multiple categories, so that mixed purchases are accurately categorized.

#### Acceptance Criteria

1. THE System SHALL create a `split_transactions` table with columns: `split_id` (INTEGER PRIMARY KEY AUTOINCREMENT), `transaction_id` (TEXT NOT NULL), `category_id` (TEXT NOT NULL), `amount` (INTEGER NOT NULL), `note` (TEXT)
2. THE System SHALL add a FOREIGN KEY from `transaction_id` to `Transaction_Fact`
3. THE System SHALL add a FOREIGN KEY from `category_id` to `Category_Dim`
4. WHEN a transaction has split rows, THE `Transaction_Fact.category_id` SHALL be set to a reserved value `'split'` to indicate it is a split transaction
5. THE System SHALL add a `category_type` value `'split'` to `Category_Dim` as a system category (not user-facing)

### Requirement 2: Split Transaction API — Create

**User Story:** As a user, I want to create a transaction with multiple category splits, so that I can accurately record mixed purchases.

#### Acceptance Criteria

1. THE Backend_API `POST /api/transactions` SHALL accept an optional `splits` array field
2. WHEN `splits` is provided, each split object SHALL contain `{category_id, amount, note?}`
3. WHEN `splits` is provided, THE Backend_API SHALL validate that the sum of all `split.amount` values equals the parent `amount`
4. WHEN validation passes, THE Backend_API SHALL insert the parent row into `Transaction_Fact` with `category_id = 'split'`
5. THE Backend_API SHALL insert one row per split into `split_transactions`
6. WHEN `splits` is NOT provided, THE Backend_API SHALL behave exactly as before (no change to existing flow)
7. WHEN split amounts do not sum to parent amount, THE Backend_API SHALL return HTTP 400 with `{error: "Split amounts must sum to total amount"}`

### Requirement 3: Split Transaction API — Read

**User Story:** As a user, I want split details returned with transactions, so that I can see how a transaction was divided.

#### Acceptance Criteria

1. THE Backend_API `GET /api/transactions` SHALL include a `splits` array on each transaction
2. WHEN a transaction has no splits, THE `splits` field SHALL be an empty array `[]`
3. WHEN a transaction has splits, each split object SHALL contain `{split_id, category_id, amount, note}`
4. THE Backend_API SHALL join `split_transactions` to `Transaction_Fact` in a single query for efficiency

### Requirement 4: Split Transaction API — Delete

**User Story:** As a user, I want deleting a transaction to also remove its splits, so that no orphaned split rows remain.

#### Acceptance Criteria

1. WHEN `DELETE /api/transactions/:id` is called (soft delete from Week 1), THE Backend_API SHALL also set a `is_deleted` flag or physically delete the corresponding `split_transactions` rows
2. THE Backend_API SHALL handle the delete atomically (both parent and splits in same operation)

### Requirement 5: Frontend Split UI

**User Story:** As a user, I want to optionally split a transaction when creating it manually, so that I can allocate amounts to multiple categories.

#### Acceptance Criteria

1. THE Frontend manual transaction form SHALL include an "Add Split" button
2. WHEN the user clicks "Add Split", THE Frontend SHALL show additional rows for category + amount input
3. THE Frontend SHALL display a running total of split amounts vs. the parent amount
4. WHEN split amounts do not equal parent amount, THE Frontend SHALL disable the submit button and show a validation error
5. THE Frontend transaction list SHALL visually distinguish split transactions (e.g. a split icon or "Nhiều danh mục" label)
6. THE Frontend SHALL display split details when expanding a split transaction row

### Requirement 6: Balance Computation Update

**User Story:** As a developer, I want balance calculations to correctly handle split transactions, so that account balances remain accurate.

#### Acceptance Criteria

1. THE Frontend `computeBalances()` function SHALL treat split transactions the same as regular transactions (use parent `amount` and `type` for balance delta)
2. THE Frontend budget alert logic SHALL sum split amounts by category (not parent amount) when checking budget consumption
3. WHEN displaying "spending by category" analytics, THE Frontend SHALL use split amounts per category, not the parent transaction's category
