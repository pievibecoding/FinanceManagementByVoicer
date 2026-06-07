# Budgets Requirements

## Overview
Budgets page allows users to set spending limits per category and track their progress against those limits.

## Features

### 1. Budget List
- Display all active budgets
- Show: Category name, Limit, Spent, Remaining, Progress bar, Period (Monthly)
- Sort by: Category name, Progress percentage
- Color-coded progress: Green (<50%), Yellow (50-80%), Red (>80%)

### 2. Add Budget
- Button to open "Add Budget" modal/dialog
- Fields:
  - Category (dropdown - expense categories only)
  - Limit amount (positive integer in VND)
  - Period (dropdown: Monthly, Weekly - default Monthly)
  - Start date (date picker)
  - Description (optional textarea)
- Validation: Required fields, limit > 0, category must be expense type
- Submit to backend API

### 3. Edit Budget
- Click on budget to open edit modal
- Pre-fill with existing data
- Same fields as Add Budget
- Update via backend API

### 4. Delete Budget
- Delete button in edit modal or separate action
- Confirmation dialog before delete
- Soft delete (set is_deleted=1) via backend API

### 5. Budget Details
- View full budget details
- Show spending breakdown by transaction
- Show daily spending trend
- Show remaining days in period
- Calculate projected spending

### 6. Budget Progress
- Visual progress bar showing spent vs limit
- Show percentage and amount
- Alert when over budget or approaching limit

### 7. Budget Alerts
- Warning when spending exceeds 80% of limit
- Critical alert when spending exceeds 100% of limit
- Notification settings (can be configured in Settings)

### 8. Budget History
- Show budget performance over time
- Compare with previous periods

## Data Requirements
- Fetch budgets from `/api/budgets` endpoint
- Filter by user_id for data isolation
- Calculate spent amount from transactions
- Fetch transactions for budget details
- Period-based filtering (monthly, weekly)

## UI Components Needed
- Budget card/list component
- Add/Edit budget modal/dialog
- Delete confirmation dialog
- Progress bar component
- Budget detail view
- Alert/notification component

## Priority
- High: Budget list, Add budget, Budget progress
- Medium: Edit budget, Delete budget, Budget alerts
- Low: Budget details, Budget history

## Dependencies
- Requires categories API for dropdown
- Requires transactions API to calculate spent amount
