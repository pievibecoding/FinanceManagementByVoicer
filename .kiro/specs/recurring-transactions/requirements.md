# Requirements Document — Recurring Transactions (Week 4)

## Introduction

This feature adds a `recurring_transactions` table to schedule automatic transaction generation for repeating financial events — salary, rent, subscriptions, utility bills. Instead of manually logging the same transaction every month, the user defines a recurring rule once and the system generates it automatically.

**Depends on:** `multi-user-auth-isolation` (Week 1) complete.

## Glossary

- **Recurring Transaction**: A rule that generates a real transaction on a defined schedule
- **frequency**: How often the transaction repeats — `monthly`, `weekly`, `yearly`
- **next_run_date**: The date the next transaction will be generated
- **is_active**: Whether the recurring rule is currently enabled

---

## Requirements

### Requirement 1: Recurring Transactions Table

**User Story:** As a user, I want to define recurring financial events, so that regular transactions are logged automatically.

#### Acceptance Criteria

1. THE System SHALL create a `recurring_transactions` table with columns: `recurring_id` (INTEGER PRIMARY KEY AUTOINCREMENT), `user_id` (INTEGER NOT NULL), `account_id` (TEXT NOT NULL), `category_id` (TEXT NOT NULL), `payee_id` (INTEGER, nullable), `amount` (INTEGER NOT NULL), `type` (TEXT NOT NULL), `note` (TEXT), `frequency` (TEXT NOT NULL), `next_run_date` (TEXT NOT NULL), `end_date` (TEXT, nullable), `is_active` (INTEGER NOT NULL DEFAULT 1)
2. THE System SHALL enforce CHECK constraint: `frequency IN ('daily', 'weekly', 'monthly', 'yearly')`
3. THE System SHALL add FOREIGN KEY from `user_id` to `users`
4. THE System SHALL add FOREIGN KEY from `account_id` to `Account_Dim`
5. THE System SHALL add FOREIGN KEY from `category_id` to `Category_Dim`

### Requirement 2: Recurring Transactions API — CRUD

**User Story:** As a user, I want to create, view, update, and delete my recurring transaction rules.

#### Acceptance Criteria

1. THE Backend_API SHALL provide `GET /api/recurring` returning all recurring rules for the authenticated user
2. THE Backend_API SHALL provide `POST /api/recurring` accepting `{account_id, category_id, amount, type, note?, frequency, next_run_date, end_date?, payee_id?}` returning HTTP 201 with `{recurring_id}`
3. THE Backend_API SHALL provide `PUT /api/recurring/:id` to update any field of a recurring rule
4. THE Backend_API SHALL provide `DELETE /api/recurring/:id` to delete a rule owned by the authenticated user
5. THE Backend_API SHALL provide `PATCH /api/recurring/:id/toggle` to flip `is_active` between 0 and 1
6. ALL recurring endpoints SHALL require authentication (401 if no valid token)

### Requirement 3: Automatic Transaction Generation

**User Story:** As a user, I want due recurring transactions to be generated automatically when I open the app, so that I never miss logging a regular payment.

#### Acceptance Criteria

1. THE Backend_API SHALL provide `POST /api/recurring/process` endpoint that checks all active recurring rules
2. WHEN `next_run_date` is today or in the past AND `is_active = 1`, THE Backend_API SHALL create a new row in `Transaction_Fact` for that rule
3. WHEN a transaction is generated, THE Backend_API SHALL advance `next_run_date` to the next occurrence based on `frequency`
4. WHEN `end_date` is set and `next_run_date` exceeds `end_date`, THE Backend_API SHALL set `is_active = 0`
5. THE Backend_API SHALL return `{generated: number}` indicating how many transactions were created
6. THE Frontend SHALL call `POST /api/recurring/process` on application startup (after authentication)

### Requirement 4: Recurring Transactions UI

**User Story:** As a user, I want to manage my recurring transactions in the UI, so that I can see what is scheduled.

#### Acceptance Criteria

1. THE Frontend SHALL display a list of active recurring rules showing: account, category, amount, frequency, next_run_date
2. THE Frontend SHALL allow creating a new recurring rule via a form
3. THE Frontend SHALL allow toggling a rule on/off (is_active)
4. THE Frontend SHALL allow deleting a rule
5. THE Frontend SHALL show a badge or notification count when recurring transactions were auto-generated on login

### Requirement 5: Date Advancement Logic

**User Story:** As a developer, I want predictable next-date calculation, so that recurring transactions fire on the correct dates.

#### Acceptance Criteria

1. WHEN `frequency = 'monthly'`, THE System SHALL advance `next_run_date` by exactly 1 calendar month (e.g. 2026-06-01 → 2026-07-01)
2. WHEN `frequency = 'weekly'`, THE System SHALL advance `next_run_date` by 7 days
3. WHEN `frequency = 'yearly'`, THE System SHALL advance `next_run_date` by 1 calendar year
4. WHEN `frequency = 'daily'`, THE System SHALL advance `next_run_date` by 1 day
5. WHEN a monthly advance would produce an invalid date (e.g. Jan 31 → Feb 31), THE System SHALL use the last valid day of the target month
