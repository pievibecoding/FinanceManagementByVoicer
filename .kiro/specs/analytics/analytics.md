# Analytics Requirements

## Overview
Analytics page provides visual reports and insights about spending patterns, income trends, and financial health.

## Features

### 1. Time Period Selector
- Dropdown to select time period: This Month, Last Month, Last 3 Months, Last 6 Months, Last Year, Custom Range
- Date range picker for custom selection

### 2. Overview Cards
- Total Income for selected period
- Total Expenses for selected period
- Net Savings (Income - Expenses)
- Average daily spending
- Top spending category

### 3. Income vs Expense Chart
- Line or bar chart showing income vs expenses over time
- Group by: Day, Week, Month
- Show trend lines

### 4. Spending by Category
- Pie chart or donut chart showing expense distribution by category
- Click on category to view details
- Show percentage and amount

### 5. Income by Category
- Pie chart or donut chart showing income distribution by category
- Click on category to view details
- Show percentage and amount

### 6. Monthly Trend
- Bar chart showing monthly income and expenses
- Compare with previous period
- Show growth/decline percentage

### 7. Top Expenses
- List of top 10 expense transactions
- Show: Date, Category, Amount, Description
- Sort by amount (highest first)

### 8. Account Balance Trend
- Line chart showing balance changes over time
- Show all accounts or selected account

### 9. Export Reports
- Export data as CSV or PDF
- Include charts and tables

## Data Requirements
- Fetch transactions from `/api/transactions` endpoint
- Filter by date range and user_id
- Aggregate data by category, date, account
- Calculate totals and averages

## UI Components Needed
- Chart components (Line, Bar, Pie)
- Date range picker
- Overview metric cards
- Transaction list for top expenses
- Export button

## Priority
- High: Time period selector, Income vs Expense chart, Spending by Category
- Medium: Monthly trend, Top expenses, Overview cards
- Low: Account balance trend, Export reports

## Dependencies
- Requires chart library (Recharts already installed)
- Requires date library (date-fns already installed)
