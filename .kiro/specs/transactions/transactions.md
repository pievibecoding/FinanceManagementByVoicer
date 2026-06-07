# Transactions Requirements

## Overview
Transactions page allows users to view, add, edit, and delete financial transactions.

## Features

### 1. Transaction List
- Display all transactions in a table or list view
- Show: Date, Category, Account, Amount, Description, Type (Income/Expense)
- Sort by: Date (default), Amount, Category
- Pagination or infinite scroll for large datasets

### 2. Filters
- **Date Range**: Start date, End date picker
- **Type**: All, Income, Expense
- **Category**: Dropdown to select specific category
- **Account**: Dropdown to select specific account
- **Search**: Search by description or amount

### 3. Add Transaction
- Button to open "Add Transaction" modal/dialog
- Fields:
  - Type (Income/Expense) - Radio or toggle
  - Amount (positive integer in VND)
  - Category (dropdown with icons)
  - Account (dropdown)
  - Date (date picker, default today)
  - Description (text input)
  - Notes (optional textarea)
- Validation: Required fields, amount > 0
- Submit to backend API

### 4. Edit Transaction
- Click on transaction to open edit modal
- Pre-fill with existing data
- Same fields as Add Transaction
- Update via backend API

### 5. Delete Transaction
- Delete button in edit modal or separate action
- Confirmation dialog before delete
- Soft delete (set is_deleted=1) via backend API

### 6. Transaction Details
- View full transaction details
- Show related information (category icon, account details)
- Cannot be edited from details view (must use edit modal)

## Data Requirements
- Fetch transactions from `/api/transactions` endpoint
- Filter by user_id for data isolation
- Support pagination parameters
- Fetch categories from `/api/categories` for dropdown
- Fetch accounts from `/api/accounts` for dropdown

## UI Components Needed
- Transaction table/list component
- Filter panel with date pickers and dropdowns
- Add/Edit transaction modal/dialog
- Delete confirmation dialog
- Transaction detail view

## Priority
- High: Transaction list, Add transaction, Filters
- Medium: Edit transaction, Delete transaction
- Low: Transaction details view
