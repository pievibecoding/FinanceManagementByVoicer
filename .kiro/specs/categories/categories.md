# Categories Requirements

## Overview
Categories page allows users to manage income and expense categories for transaction classification.

## Features

### 1. Category List
- Display all categories in grid or list view
- Show: Category name, Type (Income/Expense), Icon, Color, Transaction count
- Group by: Type (Income, Expense)
- Sort by: Name, Transaction count

### 2. Add Category
- Button to open "Add Category" modal/dialog
- Fields:
  - Category name (text input)
  - Type (radio: Income, Expense)
  - Icon (icon picker from Lucide icons)
  - Color (color picker with predefined palette)
  - Description (optional textarea)
- Validation: Required fields, unique name per type
- Submit to backend API

### 3. Edit Category
- Click on category to open edit modal
- Pre-fill with existing data
- Same fields as Add Category
- Update via backend API

### 4. Delete Category
- Delete button in edit modal or separate action
- Confirmation dialog before delete
- Check if category has transactions before allowing delete
- Soft delete (set is_deleted=1) via backend API

### 5. Category Details
- View full category details
- Show transaction history for this category
- Show spending/income trend
- Cannot be edited from details view (must use edit modal)

### 6. Default Categories
- System should provide default categories for new users:
  - Income: Salary, Bonus, Investment Returns, Other Income
  - Expense: Food, Transportation, Housing, Utilities, Entertainment, Healthcare, Shopping, Other Expense

## Data Requirements
- Fetch categories from `/api/categories` endpoint
- Filter by user_id for data isolation
- For new users, create default categories
- Fetch transactions for category details

## UI Components Needed
- Category card/list component
- Add/Edit category modal/dialog
- Delete confirmation dialog
- Icon picker component
- Color picker component
- Category detail view

## Priority
- High: Category list, Add category, Edit category
- Medium: Delete category, Default categories
- Low: Category details, Transaction history per category
