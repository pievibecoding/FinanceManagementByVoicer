# Accounts Requirements

## Overview
Accounts page allows users to manage their financial accounts (bank accounts, cash, credit cards).

## Features

### 1. Account List
- Display all accounts in card or list view
- Show: Account name, Type, Balance, Currency (VND), Last updated
- Sort by: Name, Balance, Type
- Group by: Account type (Bank, Cash, Credit Card)

### 2. Add Account
- Button to open "Add Account" modal/dialog
- Fields:
  - Account name (text input)
  - Type (dropdown: Bank Account, Cash, Credit Card, Other)
  - Initial balance (positive integer in VND)
  - Currency (default: VND)
  - Description (optional textarea)
  - Icon (optional icon picker)
- Validation: Required fields, balance >= 0
- Submit to backend API

### 3. Edit Account
- Click on account to open edit modal
- Pre-fill with existing data
- Same fields as Add Account
- Update via backend API

### 4. Delete Account
- Delete button in edit modal or separate action
- Confirmation dialog before delete
- Check if account has transactions before allowing delete
- Soft delete (set is_deleted=1) via backend API

### 5. Account Details
- View full account details
- Show transaction history for this account
- Show balance history/trend
- Cannot be edited from details view (must use edit modal)

### 6. Account Balance
- Display current balance
- Show income/expense breakdown
- Calculate total balance across all accounts

## Data Requirements
- Fetch accounts from `/api/accounts` endpoint
- Filter by user_id for data isolation
- Fetch transactions for account details
- Calculate balance from transactions

## UI Components Needed
- Account card/list component
- Add/Edit account modal/dialog
- Delete confirmation dialog
- Account detail view
- Transaction history list for account

## Priority
- High: Account list, Add account, Edit account
- Medium: Delete account, Account details
- Low: Balance history/trend visualization
