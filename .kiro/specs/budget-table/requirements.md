# Requirements Document — Budget Table

## Introduction

This feature replaces the static `budget` column on `Category_Dim` with a dedicated `Budget` table that supports per-user, per-month budget limits. After Week 1 (multi-user auth), each user has isolated categories. This week gives each user the ability to set different budget amounts for each calendar month, enabling month-over-month budget tracking instead of a single static limit.

**Depends on:** `multi-user-auth-isolation` spec (Week 1) must be complete.

## Glossary

- **Budget**: A monthly spending limit in VND for a specific category and user
- **Budget_Table**: The new `budgets` table replacing `Category_Dim.budget`
- **month**: A string in `YYYY-MM` format representing a calendar month (e.g. `2026-06`)
- **amount_limit**: The maximum spending allowed in VND for a category in a given month (0 = no limit)
- **user_id**: Foreign key from the `users` table (added in Week 1)

---

## Requirements

### Requirement 1: Budget Table Creation

**User Story:** As a user, I want monthly budget limits stored per month, so that I can set different spending limits for different months.

#### Acceptance Criteria

1. THE System SHALL create a `budgets` table with columns: `budget_id` (INTEGER PRIMARY KEY AUTOINCREMENT), `user_id` (INTEGER NOT NULL), `category_id` (TEXT NOT NULL), `month` (TEXT NOT NULL), `amount_limit` (INTEGER NOT NULL DEFAULT 0)
2. THE System SHALL enforce a UNIQUE constraint on `(user_id, category_id, month)` to prevent duplicate budget entries
3. THE System SHALL add a FOREIGN KEY from `user_id` to the `users` table
4. THE System SHALL add a FOREIGN KEY from `category_id` to `Category_Dim`
5. THE System SHALL create an index on `(user_id, month)` for query performance

### Requirement 2: Budget Migration from Category_Dim

**User Story:** As a system administrator, I want existing budget data preserved, so that no budget configuration is lost during migration.

#### Acceptance Criteria

1. WHEN the migration runs, THE System SHALL read all non-zero `budget` values from `Category_Dim`
2. THE System SHALL insert one row into `budgets` for each non-zero `budget` value using the current month as `month`
3. THE System SHALL assign these migrated rows to `user_id = 1` (the system user from Week 1)
4. THE System SHALL set `amount_limit` equal to the original `budget` column value
5. THE Migration SHALL be idempotent — running it twice SHALL NOT create duplicate rows
6. THE System SHALL keep the `budget` column on `Category_Dim` for backward compatibility during transition (do NOT drop it yet)

### Requirement 3: Budget API — Get Budgets

**User Story:** As a user, I want to retrieve my budget limits for a given month, so that I can see my spending plan.

#### Acceptance Criteria

1. THE Backend_API SHALL provide `GET /api/budgets?month=YYYY-MM` endpoint
2. WHEN `month` query parameter is omitted, THE Backend_API SHALL default to the current calendar month
3. THE Backend_API SHALL return only budgets belonging to the authenticated user
4. THE Backend_API SHALL return an array of `{budget_id, category_id, month, amount_limit}` objects
5. WHEN no budget exists for a category in the requested month, THE Backend_API SHALL NOT include that category in the response (sparse representation)

### Requirement 4: Budget API — Set/Update Budget

**User Story:** As a user, I want to set or update a monthly budget for a category, so that I can control my spending plan.

#### Acceptance Criteria

1. THE Backend_API SHALL provide `PUT /api/budgets/:category_id` endpoint accepting `{amount_limit: number, month: string}`
2. WHEN `month` is omitted from the request body, THE Backend_API SHALL default to the current calendar month
3. WHEN a budget row already exists for `(user_id, category_id, month)`, THE Backend_API SHALL update `amount_limit`
4. WHEN no budget row exists for `(user_id, category_id, month)`, THE Backend_API SHALL insert a new row (upsert)
5. THE Backend_API SHALL validate that `amount_limit` is a non-negative integer
6. THE Backend_API SHALL return HTTP 200 with `{message, budget_id}`
7. THE Backend_API SHALL require authentication (401 if no valid token)

### Requirement 5: Budget API — Delete Budget

**User Story:** As a user, I want to remove a budget limit for a category/month, so that I can revert to "no limit" for that period.

#### Acceptance Criteria

1. THE Backend_API SHALL provide `DELETE /api/budgets/:category_id?month=YYYY-MM` endpoint
2. THE Backend_API SHALL only delete the budget row belonging to the authenticated user
3. WHEN the row is deleted, THE Backend_API SHALL return HTTP 200 with `{message}`
4. WHEN no matching row exists, THE Backend_API SHALL return HTTP 404

### Requirement 6: Categories API Backward Compatibility

**User Story:** As a developer, I want the existing `GET /api/categories` response to still include a `budget` field, so that the frontend does not break during transition.

#### Acceptance Criteria

1. THE Backend_API `GET /api/categories` response SHALL continue to include a `budget` field per category
2. WHEN a budget exists for the current month for that category, THE `budget` field SHALL reflect `amount_limit` from the `budgets` table
3. WHEN no budget exists for the current month, THE `budget` field SHALL return `0`
4. THE Backend_API `PUT /api/categories/:id` endpoint SHALL remain functional and also write to the `budgets` table for the current month

### Requirement 7: Frontend Budget UI

**User Story:** As a user, I want to see and edit my monthly budget per category in the UI, so that I can manage my spending plan visually.

#### Acceptance Criteria

1. THE Frontend SHALL display a month selector (defaulting to current month) in the budget/analytics section
2. WHEN the user changes the selected month, THE Frontend SHALL reload budget data from `GET /api/budgets?month=YYYY-MM`
3. THE Frontend SHALL allow editing the `amount_limit` for each category inline
4. WHEN a budget is saved, THE Frontend SHALL call `PUT /api/budgets/:category_id` with the new amount and selected month
5. THE Frontend budget alert display SHALL use budget data from the `budgets` table for the selected month, not the static `Category_Dim.budget` column
6. THE Frontend `computeBalances()` utility SHALL remain unchanged (budgets do not affect balance calculation)
