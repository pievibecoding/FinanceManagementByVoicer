# Categories Design

## Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (Left)  │  Main Content Area (Right)          │
│                  │                                      │
│  - Dashboard     │  ┌─────────────────────────────────┐ │
│  - Transactions  │  │  Header: Categories             │ │
│  - Accounts     │  │  [+ Add Category]               │ │
│  - Categories   │  └─────────────────────────────────┘ │
│  - Analytics    │                                      │
│  - Budgets      │  ┌─────────────────────────────────┐ │
│  - Settings     │  │  Type Filter                    │ │
│                  │  │  [All] [Income] [Expense]      │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Income Categories             │ │
│                  │  │  [Category Grid]               │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Expense Categories            │ │
│                  │  │  [Category Grid]               │ │
│                  │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Type Filter
**Layout:** Horizontal tab-like buttons

```
┌─────────────────────────────────────────────────────────┐
│  [All Categories] [💰 Income] [💸 Expense]             │
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Active: Glassmorphism with accent border
- Inactive: Transparent with hover effect
- Icons for each type

### 2. Category Card
**Layout:** Card with category details

**Card Content:**
```
┌─────────────────────────────────────┐
│  🍔 Food                  [⋮]      │
│                                     │
│  25 transactions                    │
│  5,000,000 VND total                │
│                                     │
│  Expense                            │
│                                     │
│  [View Details]                     │
└─────────────────────────────────────┘
```

**Card Styling:**
- Glassmorphism card
- Border color based on category color
- Icon with category color
- Transaction count
- Total amount

### 3. Add Category Modal
**Layout:** Centered modal with form

**Modal Content:**
```
┌─────────────────────────────────────────┐
│  Add Category                 [✕]       │
├─────────────────────────────────────────┤
│                                         │
│  Category Name: [Food]                 │
│                                         │
│  Type: [⚪ Income] [⚫ Expense]        │
│                                         │
│  Icon: [🍔 ▼]                          │
│        [Icon Picker Grid]              │
│                                         │
│  Color: [🎨 ▼]                         │
│         [Color Palette]                │
│                                         │
│  Description: [Optional description]   │
│                                         │
│  [Cancel]              [Add Category]  │
└─────────────────────────────────────────┘
```

**Icon Picker:**
- Grid of Lucide icons
- Search input to filter icons
- Click to select
- Selected icon highlighted

**Color Palette:**
- Predefined colors from Glassmorphism palette
- Color swatches
- Click to select
- Selected color highlighted

### 4. Edit Category Modal
**Layout:** Same as Add Category modal
- Pre-filled with existing data
- "Update Category" button instead of "Add"
- Delete button at bottom

### 5. Delete Confirmation Dialog
**Layout:** Small centered dialog

```
┌─────────────────────────────────────────┐
│  Delete Category?              [✕]       │
├─────────────────────────────────────────┤
│  Are you sure you want to delete this   │
│  category? This will affect 25         │
│  transactions.                          │
│                                         │
│  [Cancel]              [Delete]         │
└─────────────────────────────────────────┘
```

**Warning:**
- Show transaction count
- Warning about impact
- Destructive action (red button)

### 6. Category Details View
**Layout:** Side panel or modal

```
┌─────────────────────────────────────────┐
│  Category Details              [✕]       │
├─────────────────────────────────────────┤
│                                         │
│  🍔 Food                               │
│  Expense                              │
│                                         │
│  25 transactions                      │
│  5,000,000 VND total                  │
│                                         │
│  ──────────────────────────────────    │
│  Recent Transactions                   │
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

### 7. Default Categories
**Layout:** Section showing default categories

```
┌─────────────────────────────────────────┐
│  Default Categories                    │
├─────────────────────────────────────────┤
│  Income:                               │
│  💰 Salary, 💵 Bonus, 📈 Investment    │
│                                         │
│  Expense:                              │
│  🍔 Food, 🚗 Transport, 🏠 Housing     │
│  💡 Utilities, 🎬 Entertainment        │
└─────────────────────────────────────────┘
```

## Color Scheme
- Category colors: User-selected from palette
- Income: Green accent (#74d3ae)
- Expense: Red accent (#dd9787)
- Selected: Brighter border
- Hover: Slightly brighter

## Typography
- Category name: Bold, large
- Transaction count: Regular
- Amount: Tabular nums, bold
- Labels: Regular, uppercase

## Responsive Design
- Desktop: 4-column grid
- Tablet: 3-column grid
- Mobile: 2-column grid

## Interactions
- Hover effect on cards
- Click to view details
- Modal opens with animation
- Filter updates grid in real-time
- Icon/color picker with live preview
