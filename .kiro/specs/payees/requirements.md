# Requirements Document — Payees (Week 3)

## Introduction

This feature adds a `payees` table to track merchants and recipients (e.g. "Grab", "Bách Hóa Xanh", "Công ty ABC"). Instead of free-text notes, transactions can reference a known payee, enabling analytics by merchant and smart auto-suggestions when Gemini parses voice input.

**Depends on:** `multi-user-auth-isolation` (Week 1) complete.

## Glossary

- **Payee**: A merchant, business, or person involved in a transaction (e.g. "Grab", "Lương công ty")
- **default_category_id**: The category automatically suggested when a known payee is selected
- **payee_id**: Foreign key on `Transaction_Fact` linking a transaction to a payee

---

## Requirements

### Requirement 1: Payees Table

**User Story:** As a user, I want to maintain a list of known payees, so that I can quickly assign transactions to familiar merchants.

#### Acceptance Criteria

1. THE System SHALL create a `payees` table with columns: `payee_id` (INTEGER PRIMARY KEY AUTOINCREMENT), `user_id` (INTEGER NOT NULL), `payee_name` (TEXT NOT NULL), `default_category_id` (TEXT)
2. THE System SHALL enforce a UNIQUE constraint on `(user_id, payee_name)`
3. THE System SHALL add a FOREIGN KEY from `user_id` to `users`
4. THE System SHALL add a FOREIGN KEY from `default_category_id` to `Category_Dim`
5. THE System SHALL add a nullable `payee_id` column to `Transaction_Fact`

### Requirement 2: Payees API — CRUD

**User Story:** As a user, I want to create, list, and delete my payees, so that I can manage my merchant list.

#### Acceptance Criteria

1. THE Backend_API SHALL provide `GET /api/payees` returning all payees for the authenticated user
2. THE Backend_API SHALL provide `POST /api/payees` accepting `{payee_name, default_category_id?}` returning HTTP 201 with `{payee_id, payee_name}`
3. WHEN a duplicate `payee_name` is submitted for the same user, THE Backend_API SHALL return HTTP 409
4. THE Backend_API SHALL provide `DELETE /api/payees/:id` that deletes the payee only if it belongs to the authenticated user
5. THE Backend_API SHALL provide `PUT /api/payees/:id` accepting `{payee_name?, default_category_id?}` to update a payee
6. ALL payee endpoints SHALL require authentication (401 if no valid token)

### Requirement 3: Transaction Payee Association

**User Story:** As a user, I want to link a transaction to a payee, so that I can track spending per merchant.

#### Acceptance Criteria

1. THE Backend_API `POST /api/transactions` SHALL accept an optional `payee_id` field
2. WHEN `payee_id` is provided, THE Backend_API SHALL store it on the `Transaction_Fact` row
3. THE Backend_API `GET /api/transactions` SHALL include `payee_id` in each returned transaction object
4. WHEN `payee_id` is null, THE Backend_API SHALL return `null` for that field (not omit it)

### Requirement 4: Gemini Auto-Payee Mapping

**User Story:** As a user, I want Gemini to automatically match known payees from my voice input, so that transactions are linked to payees without manual selection.

#### Acceptance Criteria

1. THE BFF_Server SHALL fetch the authenticated user's payee list from Flask before calling Gemini
2. THE BFF_Server SHALL include the payee list in the Gemini system prompt
3. WHEN Gemini identifies a merchant matching a known payee name, THE BFF_Server SHALL include `payee_id` in the transaction POST to Flask
4. WHEN no matching payee is found, THE BFF_Server SHALL set `payee_id` to null

### Requirement 5: Payee Analytics

**User Story:** As a user, I want to see spending grouped by payee, so that I know which merchants I spend most at.

#### Acceptance Criteria

1. THE Backend_API `POST /api/sql-query` SHALL continue to work with the updated schema (payee_id column visible in Transaction_Fact)
2. THE Frontend analytics section SHALL display a "by payee" grouping option when payee data is available
3. THE Frontend SHALL show total spending per payee for the selected period
