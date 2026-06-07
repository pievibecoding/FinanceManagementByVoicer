# Budgets Implementation Tasks

## Phase 1: Setup & API Integration
- [ ] Create API service functions for budgets
  - Fetch budgets
  - Add budget
  - Update budget
  - Delete budget (soft delete)
  - Calculate spent amount from transactions
- [ ] Create data hooks using TanStack Query
  - useBudgets hook
  - useAddBudget mutation
  - useUpdateBudget mutation
  - useDeleteBudget mutation
- [ ] Fetch transactions for budget details

## Phase 2: Component Development
- [ ] Create BudgetSummaryCard component
  - Total budget, spent, remaining
  - Progress bar
  - Alert indicators
- [ ] Create BudgetCard component
  - Props: budget data
  - Show category, limit, spent, remaining
  - Progress bar with color coding
  - Alert indicators
  - Actions dropdown menu
- [ ] Create AddBudgetModal component
  - Form with all fields
  - Category dropdown (expense only)
  - Validation
  - Submit handler
- [ ] Create EditBudgetModal component
  - Pre-filled form
  - Update handler
  - Delete button
- [ ] Create DeleteConfirmationDialog component
  - Warning message
  - Confirm/Cancel buttons
- [ ] Create BudgetDetailsView component
  - Side panel or modal
  - Show full budget details
  - Transaction history
  - Daily average
  - Projected spending
  - Edit/Delete buttons
- [ ] Create BudgetAlert component
  - Notification banner
  - Warning/Critical states
  - Dismissible
- [ ] Create BudgetHistoryChart component
  - Line chart
  - Budget vs actual
  - Period comparison

## Phase 3: Page Integration
- [ ] Update budgets route component
  - Import and use all components
  - Layout with summary and grid
  - Responsive design
- [ ] Add loading states
  - Skeleton loaders for cards
  - Error handling
- [ ] Add empty states
  - No budgets message
  - No active budgets message

## Phase 4: Testing
- [ ] Test data fetching
- [ ] Test add budget
- [ ] Test edit budget
- [ ] Test delete budget
- [ ] Test budget alerts
- [ ] Test budget details
- [ ] Test responsive layout

## Priority Order
1. API Integration (Phase 1)
2. BudgetSummaryCard component (Phase 2)
3. BudgetCard component (Phase 2)
4. AddBudgetModal component (Phase 2)
5. Page Integration (Phase 3)
6. EditBudgetModal component (Phase 2)
7. DeleteConfirmationDialog component (Phase 2)
8. BudgetDetailsView component (Phase 2)
9. BudgetAlert component (Phase 2)
10. BudgetHistoryChart component (Phase 2)
11. Testing (Phase 4)
