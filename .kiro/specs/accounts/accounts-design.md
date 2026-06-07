# Accounts Design

## Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (Left)  │  Main Content Area (Right)          │
│                  │                                      │
│  - Dashboard     │  ┌─────────────────────────────────┐ │
│  - Transactions  │  │  Header: Accounts               │ │
│  - Accounts     │  │  [+ Add Account]                │ │
│  - Categories   │  └─────────────────────────────────┘ │
│  - Analytics    │                                      │
│  - Budgets      │  ┌─────────────────────────────────┐ │
│  - Settings     │  │  Account Type Filter            │ │
│                  │  │  [All] [Bank] [Cash] [Credit]   │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Account Cards (Grid)           │ │
│                  │  │  ┌─────────┐ ┌─────────┐       │ │
│                  │  │  │ Account │ │ Account │       │ │
│                  │  │  │   1     │ │   2     │       │ │
│                  │  │  └─────────┘ └─────────┘       │ │
│                  │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Account Type Filter
**Layout:** Horizontal tab-like buttons

```
┌─────────────────────────────────────────────────────────┐
│  [All Accounts] [🏦 Bank] [💵 Cash] [💳 Credit]      │
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Active: Glassmorphism with accent border
- Inactive: Transparent with hover effect
- Icons for each type

### 2. Account Card
**Layout:** Card with account details

**Card Content:**
```
┌─────────────────────────────────────┐
│  🏦 Vietcombank          [⋮]        │
│                                     │
│  10,000,000 VND                     │
│  +2,000,000 this month              │
│                                     │
│  Bank Account                       │
│  Last updated: 15/06/2026           │
│                                     │
│  [View Details]                     │
└─────────────────────────────────────┘
```

**Card Types:**
- Bank: 🏦 icon, blue accent
- Cash: 💵 icon, green accent
- Credit Card: 💳 icon, purple accent
- Other: 📁 icon, gray accent

**Styling:**
- Glassmorphism card
- Border based on account type
- Balance in large, bold text
- Trend indicator (green/red arrow)

### 3. Add Account Modal
**Layout:** Centered modal with form

**Modal Content:**
```
┌─────────────────────────────────────────┐
│  Add Account                  [✕]       │
├─────────────────────────────────────────┤
│                                         │
│  Account Name: [My Bank Account]       │
│                                         │
│  Type: [🏦 Bank Account ▼]             │
│        [💵 Cash]                       │
│        [💳 Credit Card]                │
│        [📁 Other]                      │
│                                         │
│  Initial Balance: [1,000,000 VND]     │
│                                         │
│  Currency: [VND] (fixed)              │
│                                         │
│  Description: [Optional description]   │
│                                         │
│  Icon: [🏦 ▼]                          │
│                                         │
│  [Cancel]              [Add Account]   │
└─────────────────────────────────────────┘
```

**Icon Picker:**
- Grid of available icons
- Click to select
- Selected icon highlighted

### 4. Edit Account Modal
**Layout:** Same as Add Account modal
- Pre-filled with existing data
- "Update Account" button instead of "Add"
- Delete button at bottom

### 5. Delete Confirmation Dialog
**Layout:** Small centered dialog

```
┌─────────────────────────────────────────┐
│  Delete Account?              [✕]       │
├─────────────────────────────────────────┤
│  Are you sure you want to delete this   │
│  account? This will also delete all     │
│  associated transactions.               │
│                                         │
│  [Cancel]              [Delete]         │
└─────────────────────────────────────────┘
```

**Warning:**
- Check if account has transactions
- Show transaction count
- Destructive action (red button)

### 6. Account Details View
**Layout:** Side panel or modal

```
┌─────────────────────────────────────────┐
│  Account Details              [✕]       │
├─────────────────────────────────────────┤
│                                         │
│  🏦 Vietcombank                        │
│  10,000,000 VND                        │
│                                         │
│  Type: Bank Account                    │
│  Currency: VND                         │
│  Last updated: 15/06/2026               │
│                                         │
│  ──────────────────────────────────    │
│  Transaction History                   │
│  ──────────────────────────────────    │
│  [Transaction List]                    │
│                                         │
│  [Edit] [Delete]                        │
└─────────────────────────────────────────┘
```

**Transaction History:**
- List of recent transactions
- Click to view full transaction
- "View All" button

### 7. Balance Summary
**Layout:** Summary card at top

```
┌─────────────────────────────────────────┐
│  Total Balance: 25,000,000 VND          │
│  Income: 30,000,000 VND                 │
│  Expenses: 5,000,000 VND                │
└─────────────────────────────────────────┘
```

## Color Scheme
- Bank: Blue accent (#678d58)
- Cash: Green accent (#74d3ae)
- Credit Card: Purple accent
- Other: Gray accent
- Positive trend: Green
- Negative trend: Red

## Typography
- Account name: Bold, large
- Balance: Very large, tabular nums
- Labels: Regular, uppercase
- Dates: Monospace

## Responsive Design
- Desktop: 3-column grid
- Tablet: 2-column grid
- Mobile: 1-column stacked cards

## Interactions
- Hover effect on cards
- Click to view details
- Modal opens with animation
- Filter updates grid in real-time
