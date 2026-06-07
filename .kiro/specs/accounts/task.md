# Accounts Implementation Tasks

## Phase 1: Setup & API Integration
- [ ] Create API service functions for accounts
  - Fetch accounts
  - Add account
  - Update account
  - Delete account (soft delete)
- [ ] Create data hooks using TanStack Query
  - useAccounts hook
  - useAddAccount mutation
  - useUpdateAccount mutation
  - useDeleteAccount mutation
- [ ] Fetch transactions for account details

## Phase 2: Component Development
- [ ] Create AccountTypeFilter component
  - Tab-like buttons for types
  - All/Bank/Cash/Credit/Other
- [ ] Create AccountCard component
  - Props: account data
  - Show icon, name, balance, type
  - Trend indicator
  - Actions dropdown menu
- [ ] Create AddAccountModal component
  - Form with all fields
  - Icon picker
  - Validation
  - Submit handler
- [ ] Create EditAccountModal component
  - Pre-filled form
  - Update handler
  - Delete button
- [ ] Create DeleteConfirmationDialog component
  - Warning message with transaction count
  - Confirm/Cancel buttons
- [ ] Create AccountDetailsView component
  - Side panel or modal
  - Show full account details
  - Transaction history
  - Edit/Delete buttons
- [ ] Create BalanceSummary component
  - Total balance
  - Income/Expenses breakdown

## Phase 3: Page Integration
- [ ] Update accounts route component
  - Import and use all components
  - Layout with filter and grid
  - Responsive design
- [ ] Add loading states
  - Skeleton loaders for cards
  - Error handling
- [ ] Add empty states
  - No accounts message
  - No filter results message

## Phase 4: Testing
- [ ] Test data fetching with filters
- [ ] Test add account
- [ ] Test edit account
- [ ] Test delete account
- [ ] Test account details
- [ ] Test responsive layout

## Priority Order
1. API Integration (Phase 1)
2. AccountTypeFilter component (Phase 2)
3. AccountCard component (Phase 2)
4. AddAccountModal component (Phase 2)
5. Page Integration (Phase 3)
6. EditAccountModal component (Phase 2)
7. DeleteConfirmationDialog component (Phase 2)
8. AccountDetailsView component (Phase 2)
9. BalanceSummary component (Phase 2)
10. Testing (Phase 4)
