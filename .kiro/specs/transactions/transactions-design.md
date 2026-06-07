# Transactions Design

## Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (Left)  │  Main Content Area (Right)          │
│                  │                                      │
│  - Dashboard     │  ┌─────────────────────────────────┐ │
│  - Transactions  │  │  Header: Transactions           │ │
│  - Accounts     │  │  [+ Add Transaction]            │ │
│  - Categories   │  └─────────────────────────────────┘ │
│  - Analytics    │                                      │
│  - Budgets      │  ┌─────────────────────────────────┐ │
│  - Settings     │  │  Filter Panel                   │ │
│                  │  │  [Date Range] [Type]           │ │
│                  │  │  [Category] [Account] [Search] │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Transaction Table              │ │
│                  │  │  ┌──────┬──────┬──────┬──────┐ │ │
│                  │  │  │ Date │ Cat  │ Acct │ Amount│ │ │
│                  │  │  ├──────┼──────┼──────┼──────┤ │ │
│                  │  │  │ 15/06 │ Food │ VC   │ -500K │ │ │
│                  │  │  │ 14/06 │ Trans│ VC   │ -200K │ │ │
│                  │  │  └──────┴──────┴──────┴──────┘ │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Pagination                    │ │
│                  │  │  [< 1 2 3 >]                   │ │
│                  │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Filter Panel
**Layout:** Horizontal filter bar with collapsible sections

**Filter Items:**
```
┌─────────────────────────────────────────────────────────┐
│  📅 Date Range: [Start Date] - [End Date]              │
│  🔄 Type: [All ▼] [Income] [Expense]                   │
│  📂 Category: [All Categories ▼]                       │
│  💳 Account: [All Accounts ▼]                           │
│  🔍 Search: [Search transactions...]                    │
│  [Clear Filters]                                        │
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Glassmorphism card
- Flex layout for horizontal filters
- Dropdowns with icons
- Search input with magnifying glass icon

### 2. Transaction Table
**Layout:** Data table with sortable columns

**Table Header:**
```
┌──────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Date │ Category │ Account  │ Type     │ Amount   │ Actions  │
│  ▼   │    ▼     │    ▼     │    ▼     │    ▼     │          │
└──────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

**Table Row:**
```
┌──────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│15/06 │ 🍔 Food  │ 🏦 VC   │ Expense  │ -500,000 │ [⋮]      │
│      │ Lunch    │          │          │          │          │
└──────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

**Styling:**
- Glassmorphism table with transparent background
- Hover effect on rows
- Income: Green text
- Expense: Red text
- Category icon with color
- Actions dropdown menu

### 3. Add Transaction Modal
**Layout:** Centered modal with form

**Modal Content:**
```
┌─────────────────────────────────────────┐
│  Add Transaction              [✕]       │
├─────────────────────────────────────────┤
│                                         │
│  Type: [⚪ Income] [⚫ Expense]         │
│                                         │
│  Amount: [1,000,000 VND]               │
│                                         │
│  Category: [🍔 Food ▼]                 │
│                                         │
│  Account: [🏦 Vietcombank ▼]           │
│                                         │
│  Date: [15/06/2026 📅]                │
│                                         │
│  Description: [Lunch at restaurant]    │
│                                         │
│  Notes: [Optional notes...]            │
│                                         │
│  [Cancel]              [Add Transaction]│
└─────────────────────────────────────────┘
```

**Form Validation:**
- Required fields marked with asterisk
- Real-time validation
- Error messages below fields

### 4. Edit Transaction Modal
**Layout:** Same as Add Transaction modal
- Pre-filled with existing data
- "Update Transaction" button instead of "Add"
- Delete button at bottom

### 5. Delete Confirmation Dialog
**Layout:** Small centered dialog

```
┌─────────────────────────────────────────┐
│  Delete Transaction?        [✕]       │
├─────────────────────────────────────────┤
│  Are you sure you want to delete this   │
│  transaction? This action cannot be     │
│  undone.                                │
│                                         │
│  [Cancel]              [Delete]        │
└─────────────────────────────────────────┘
```

**Styling:**
- Destructive action (red button)
- Warning icon

### 6. Transaction Details View
**Layout:** Side panel or modal

```
┌─────────────────────────────────────────┐
│  Transaction Details         [✕]       │
├─────────────────────────────────────────┤
│                                         │
│  🍔 Food - Expense                     │
│  -500,000 VND                          │
│                                         │
│  Account: 🏦 Vietcombank                │
│  Date: 15/06/2026                       │
│  Description: Lunch at restaurant       │
│  Notes: Optional notes                 │
│                                         │
│  [Edit] [Delete]                        │
└─────────────────────────────────────────┘
```

## Color Scheme
- Table header: Semi-transparent white
- Table row: Transparent with hover effect
- Income: Green (#74d3ae)
- Expense: Red (#dd9787)
- Selected row: Slightly brighter
- Modal: Darker glassmorphism

## Typography
- Table header: Bold, uppercase
- Table body: Regular
- Amounts: Tabular nums, bold
- Dates: Monospace

## Responsive Design
- Desktop: Full table with all columns
- Tablet: Hide less important columns
- Mobile: Card view instead of table

## Interactions
- Sort columns by clicking header
- Filter updates table in real-time
- Modal opens with animation
- Row click opens details
- Hover effects on all interactive elements
