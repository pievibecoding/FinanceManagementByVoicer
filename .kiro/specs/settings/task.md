# Settings Implementation Tasks

## Phase 1: Setup & API Integration
- [ ] Create API service functions for settings
  - Fetch user profile
  - Update user profile
  - Update settings
  - Change password
  - Delete account
  - Export data
  - Import data
- [ ] Create data hooks using TanStack Query
  - useUserProfile hook
  - useUpdateProfile mutation
  - useUpdateSettings mutation
  - useChangePassword mutation
  - useDeleteAccount mutation
  - useExportData mutation
  - useImportData mutation

## Phase 2: Component Development
- [ ] Create SettingsNavigation component
  - Horizontal tabs
  - Icons for each section
  - Active state
- [ ] Create ProfileSettings component
  - Avatar upload
  - Name input
  - Email (read-only)
  - Save button
- [ ] Create AppearanceSettings component
  - Theme toggle (Dark/Light/Auto)
  - Font selector
  - Language selector
  - Save button
- [ ] Create NotificationSettings component
  - Budget alerts toggle
  - Transaction reminders toggle
  - Email notifications toggle
  - Push notifications toggle
  - Save button
- [ ] Create CurrencySettings component
  - Currency display (VND fixed)
  - Number format selector
  - Save button
- [ ] Create DataManagement component
  - Export buttons (CSV/PDF)
  - Import file upload
  - Delete account button
- [ ] Create SecuritySettings component
  - Change password form
  - Connected accounts list
  - 2FA toggle (disabled, coming soon)
- [ ] Create AboutSection component
  - App version
  - Privacy policy link
  - Terms of service link
  - Support link
  - Rate app (star rating)
- [ ] Create AvatarUpload component
  - File upload
  - Preview
  - Crop tool (optional)
- [ ] Create ToggleSwitch component
  - On/Off states
  - Smooth animation
- [ ] Create DeleteAccountDialog component
  - Warning message
  - Password confirmation
  - Confirm/Cancel buttons

## Phase 3: Page Integration
- [ ] Update settings route component
  - Import and use all components
  - Layout with navigation and form sections
  - Tab switching logic
  - Responsive design
- [ ] Add loading states
  - Skeleton loaders for forms
  - Error handling
- [ ] Add save confirmation
  - Toast notification on save
  - Error messages

## Phase 4: Testing
- [ ] Test profile update
- [ ] Test appearance settings
- [ ] Test notification settings
- [ ] Test currency settings
- [ ] Test data export
- [ ] Test data import
- [ ] Test password change
- [ ] Test account deletion
- [ ] Test responsive layout

## Priority Order
1. API Integration (Phase 1)
2. SettingsNavigation component (Phase 2)
3. ProfileSettings component (Phase 2)
4. Page Integration (Phase 3)
5. AppearanceSettings component (Phase 2)
6. NotificationSettings component (Phase 2)
7. CurrencySettings component (Phase 2)
8. SecuritySettings component (Phase 2)
9. DataManagement component (Phase 2)
10. AboutSection component (Phase 2)
11. ToggleSwitch component (Phase 2)
12. AvatarUpload component (Phase 2)
13. DeleteAccountDialog component (Phase 2)
14. Testing (Phase 4)
