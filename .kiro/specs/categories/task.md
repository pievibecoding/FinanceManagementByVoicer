# Categories Implementation Tasks

## Phase 1: Setup & API Integration
- [ ] Create API service functions for categories
  - Fetch categories
  - Add category
  - Update category
  - Delete category (soft delete)
  - Create default categories for new users
- [ ] Create data hooks using TanStack Query
  - useCategories hook
  - useAddCategory mutation
  - useUpdateCategory mutation
  - useDeleteCategory mutation
- [ ] Fetch transactions for category details

## Phase 2: Component Development
- [ ] Create TypeFilter component
  - Tab-like buttons for types
  - All/Income/Expense
- [ ] Create CategoryCard component
  - Props: category data
  - Show icon, name, transaction count, total amount
  - Color-coded border
  - Actions dropdown menu
- [ ] Create IconPicker component
  - Grid of Lucide icons
  - Search input
  - Selected state
- [ ] Create ColorPicker component
  - Color palette from Glassmorphism
  - Color swatches
  - Selected state
- [ ] Create AddCategoryModal component
  - Form with all fields
  - Icon picker integration
  - Color picker integration
  - Validation
  - Submit handler
- [ ] Create EditCategoryModal component
  - Pre-filled form
  - Update handler
  - Delete button
- [ ] Create DeleteConfirmationDialog component
  - Warning message with transaction count
  - Confirm/Cancel buttons
- [ ] Create CategoryDetailsView component
  - Side panel or modal
  - Show full category details
  - Transaction history
  - Edit/Delete buttons
- [ ] Create DefaultCategories component
  - Show default categories
  - Cannot be deleted

## Phase 3: Page Integration
- [ ] Update categories route component
  - Import and use all components
  - Layout with filter and grid
  - Group by type
  - Responsive design
- [ ] Add loading states
  - Skeleton loaders for cards
  - Error handling
- [ ] Add empty states
  - No categories message
  - No filter results message

## Phase 4: Testing
- [ ] Test data fetching with filters
- [ ] Test add category
- [ ] Test edit category
- [ ] Test delete category
- [ ] Test icon picker
- [ ] Test color picker
- [ ] Test default categories
- [ ] Test responsive layout

## Priority Order
1. API Integration (Phase 1)
2. TypeFilter component (Phase 2)
3. CategoryCard component (Phase 2)
4. IconPicker component (Phase 2)
5. ColorPicker component (Phase 2)
6. AddCategoryModal component (Phase 2)
7. Page Integration (Phase 3)
8. EditCategoryModal component (Phase 2)
9. DeleteConfirmationDialog component (Phase 2)
10. CategoryDetailsView component (Phase 2)
11. DefaultCategories component (Phase 2)
12. Testing (Phase 4)
