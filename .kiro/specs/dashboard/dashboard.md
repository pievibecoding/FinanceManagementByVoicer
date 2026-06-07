# Dashboard Requirements

## Overview
Dashboard is the main landing page after login, providing a high-level overview of the user's financial status.

## Features

### 1. Key Metrics Cards
- **Total Balance**: Sum of all account balances
- **Monthly Income**: Total income for current month
- **Monthly Expenses**: Total expenses for current month
- **Net Savings**: Income - Expenses for current month
- **Budget Status**: Percentage of budget used

### 2. Recent Transactions
- Display last 10 transactions
- Show transaction icon, category, amount, date
- Click to view transaction details or navigate to Transactions page
- Filter by: All, Income, Expenses

### 3. Budget Overview
- List of active budgets
- Progress bar showing spending vs limit
- Color-coded: Green (under 50%), Yellow (50-80%), Red (over 80%)
- Click to navigate to Budgets page

### 4. Quick Actions
- "Add Transaction" button - opens modal to add new transaction
- "View All Transactions" - navigate to Transactions page
- "View Analytics" - navigate to Analytics page

### 5. Account Summary
- List of all accounts with current balance
- Show account type (Bank, Cash, Credit Card)
- Click to view account details or navigate to Accounts page

## Data Requirements
- Fetch total balance from accounts API
- Fetch current month transactions from transactions API
- Fetch active budgets from budgets API
- Fetch all accounts from accounts API

## UI Components Needed
- Metric cards with icons
- Transaction list item component
- Budget progress bar component
- Account card component
- Add transaction modal/dialog

## Priority
- High: Key metrics, Recent transactions
- Medium: Budget overview, Account summary
- Low: Quick actions (can be implemented later)
