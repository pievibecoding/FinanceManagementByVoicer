# Analytics Design

## Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (Left)  │  Main Content Area (Right)          │
│                  │                                      │
│  - Dashboard     │  ┌─────────────────────────────────┐ │
│  - Transactions  │  │  Header: Analytics               │ │
│  - Accounts     │  │  [Period: This Month ▼]         │ │
│  - Categories   │  └─────────────────────────────────┘ │
│  - Analytics    │                                      │
│  - Budgets      │  ┌─────────────────────────────────┐ │
│  - Settings     │  │  Overview Cards (4 cards)        │ │
│                  │  │  [Income] [Expense] [Savings]  │ │
│                  │  │   [Avg Daily]                   │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Income vs Expense Chart        │ │
│                  │  │  [Line/Bar Chart]               │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Spending by Category (Pie)      │ │
│                  │  │  [Pie Chart]                    │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Monthly Trend (Bar)            │ │
│                  │  │  [Bar Chart]                    │ │
│                  │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Time Period Selector
**Layout:** Dropdown in header

```
┌─────────────────────────────────────────┐
│  Period: [This Month ▼]               │
│         [Last Month]                    │
│         [Last 3 Months]                 │
│         [Last 6 Months]                 │
│         [Last Year]                     │
│         [Custom Range...]               │
└─────────────────────────────────────────┘
```

**Custom Range:**
- Date range picker
- Apply button

### 2. Overview Cards
**Layout:** Grid of 4 cards (2x2 on desktop)

**Card Content:**
```
┌─────────────────────┐
│  💰 Total Income    │
│  20,000,000 VND    │
│  +10% vs last month │
└─────────────────────┘
```

**Cards:**
- Total Income
- Total Expenses
- Net Savings
- Average Daily Spending

**Styling:**
- Glassmorphism card
- Trend indicator (green/red arrow)
- Percentage change

### 3. Income vs Expense Chart
**Layout:** Large chart area

**Chart Type:** Line chart or Bar chart (toggle)

**Chart Elements:**
- X-axis: Time (days/weeks/months)
- Y-axis: Amount (VND)
- Income line: Green
- Expense line: Red
- Legend: Income, Expense
- Tooltip on hover

**Toggle:**
```
[📊 Bar] [📈 Line]
```

### 4. Spending by Category
**Layout:** Pie chart with legend

**Chart Elements:**
- Pie chart with category colors
- Legend on right
- Percentage labels
- Click category to filter

**Category Breakdown:**
```
┌─────────────────────────────────────┐
│  🍔 Food: 30% (6,000,000 VND)      │
│  🚗 Transport: 20% (4,000,000 VND)  │
│  🏠 Housing: 25% (5,000,000 VND)    │
│  🎬 Entertainment: 15% (3,000,000)  │
│  💡 Utilities: 10% (2,000,000 VND)  │
└─────────────────────────────────────┘
```

### 5. Monthly Trend
**Layout:** Bar chart

**Chart Elements:**
- X-axis: Months
- Y-axis: Amount (VND)
- Income bars: Green
- Expense bars: Red
- Comparison with previous period

**Comparison:**
```
┌─────────────────────────────────────┐
│  June 2026 vs May 2026              │
│  Income: +5%                        │
│  Expenses: -10%                      │
└─────────────────────────────────────┘
```

### 6. Top Expenses
**Layout:** List of top 10 expenses

**List Item:**
```
┌─────────────────────────────────────────────────┐
│  1. 🍔 Food - Lunch at restaurant               │
│     15/06/2026 - 500,000 VND                    │
├─────────────────────────────────────────────────┤
│  2. 🚗 Transport - Gas refill                   │
│     14/06/2026 - 300,000 VND                    │
└─────────────────────────────────────────────────┘
```

**Styling:**
- Numbered list
- Category icon
- Date and amount
- Hover effect

### 7. Account Balance Trend
**Layout:** Line chart

**Chart Elements:**
- X-axis: Time
- Y-axis: Balance
- Multiple lines (one per account)
- Account selector

**Account Selector:**
```
[All Accounts ▼]
[Vietcombank]
[Cash]
[Credit Card]
```

### 8. Export Button
**Layout:** Button in header

```
[📥 Export as CSV] [📄 Export as PDF]
```

**Export Options:**
- CSV: Raw data
- PDF: Charts and tables

## Color Scheme
- Income: Green (#74d3ae)
- Expense: Red (#dd9787)
- Savings: Blue
- Chart background: Transparent
- Grid lines: Semi-transparent white

## Typography
- Card titles: Bold, uppercase
- Amounts: Tabular nums, bold
- Labels: Regular
- Chart labels: Small, regular

## Responsive Design
- Desktop: 2x2 card grid, full-width charts
- Tablet: 2x1 card grid, stacked charts
- Mobile: 1x1 card grid, stacked charts

## Interactions
- Hover effects on cards
- Chart tooltips on hover
- Click category to filter
- Period selector updates all charts
- Export button opens download dialog
