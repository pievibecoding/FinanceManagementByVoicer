# Dashboard Design

## Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (Left)  │  Main Content Area (Right)          │
│                  │                                      │
│  - Dashboard     │  ┌─────────────────────────────────┐ │
│  - Transactions  │  │  Header: Dashboard              │ │
│  - Accounts     │  └─────────────────────────────────┘ │
│  - Categories   │                                      │
│  - Analytics    │  ┌─────────────────────────────────┐ │
│  - Budgets      │  │  Key Metrics Cards (4 cards)    │ │
│  - Settings     │  │  [Balance] [Income] [Expense]   │ │
│                  │  │   [Savings]                     │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Budget Overview (3 budgets)    │ │
│                  │  │  [Food: 60%] [Transport: 40%]  │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Recent Transactions (10 items) │ │
│                  │  │  [Transaction List]             │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Account Summary (4 accounts)   │ │
│                  │  │  [Account Cards]                │ │
│                  │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Key Metrics Cards
**Layout:** Grid of 4 cards (2x2 on desktop, 1x4 on mobile)

**Card Style:**
- Glassmorphism card with blur effect
- Border: `rgba(255, 255, 255, 0.18)`
- Background: `rgba(255, 255, 255, 0.06)`
- Padding: 1.5rem
- Border radius: 0.625rem

**Card Content:**
```
┌─────────────────────┐
│  💰 Total Balance  │
│  15,000,000 VND    │
│  +5% from last month│
└─────────────────────┘
```

**Color Coding:**
- Income: Green accent (`#74d3ae`)
- Expense: Red accent (`#dd9787`)
- Savings: Blue accent
- Balance: Primary accent (`#dd9787`)

### 2. Budget Overview
**Layout:** Horizontal scroll or grid of budget cards

**Budget Card:**
```
┌─────────────────────────────┐
│  🍔 Food                    │
│  ████████░░ 60%            │
│  3,000,000 / 5,000,000 VND │
└─────────────────────────────┘
```

**Progress Bar:**
- Green: < 50%
- Yellow: 50-80%
- Red: > 80%

### 3. Recent Transactions
**Layout:** List view with table-like structure

**Transaction Item:**
```
┌─────────────────────────────────────────────────┐
│  🍔 Food  │  15/06/2026  │  -500,000 VND       │
│  Lunch at restaurant                             │
└─────────────────────────────────────────────────┘
```

**Styling:**
- Hover effect: slight brightness increase
- Income: Green text
- Expense: Red text
- Category icon on left

### 4. Account Summary
**Layout:** Grid of account cards

**Account Card:**
```
┌─────────────────────────┐
│  🏦 Vietcombank          │
│  10,000,000 VND          │
│  Bank Account            │
└─────────────────────────┘
```

**Account Types:**
- Bank: 🏦
- Cash: 💵
- Credit Card: 💳
- Other: 📁

### 5. Quick Actions
**Floating Action Button (FAB):**
- Position: Bottom right
- Icon: ➕
- Tooltip: "Add Transaction"
- On click: Open Add Transaction modal

**Action Buttons:**
- "View All Transactions" - Button with arrow icon
- "View Analytics" - Button with chart icon

## Color Scheme (Glassmorphism)
- Background: Dark green gradient
- Card: Semi-transparent white
- Text: White
- Accent: Sweet Salmon (#dd9787)
- Success: Celadon (#74d3ae)
- Warning: Champagne Mist (#f6e7cb)
- Error: Sweet Salmon (#dd9787)

## Typography
- Headings: Manrope font, bold
- Body: Inter font, regular
- Numbers: Tabular nums for alignment

## Responsive Design
- Desktop: 4-column metrics grid, 2-column content
- Tablet: 2-column metrics grid, 1-column content
- Mobile: 1-column metrics grid, stacked content

## Interactions
- Hover effects on cards
- Click to navigate to detailed pages
- Smooth transitions
- Loading skeletons for data fetching
