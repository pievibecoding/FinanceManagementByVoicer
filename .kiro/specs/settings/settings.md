# Settings Requirements

## Overview
Settings page allows users to manage their profile, preferences, and application settings.

## Features

### 1. Profile Settings
- **User Information**:
  - Name (text input)
  - Email (read-only, from auth)
  - Avatar upload (optional)
- **Update Profile**: Save changes to backend API

### 2. Appearance Settings
- **Theme**: Light/Dark mode toggle (default based on system)
- **Font**: Select from available fonts (Inter, Manrope, System)
- **Language**: Select language (Vietnamese, English - default Vietnamese)

### 3. Notification Settings
- **Budget Alerts**: Enable/disable budget overage alerts
- **Transaction Reminders**: Enable/disable periodic reminders
- **Email Notifications**: Enable/disable email notifications
- **Push Notifications**: Enable/disable browser push notifications

### 4. Currency Settings
- **Default Currency**: VND (fixed, no change needed)
- **Number Format**: Select format (1,000,000 vs 1.000.000)

### 5. Data Management
- **Export Data**: Export all data as JSON/CSV
- **Import Data**: Import data from backup file
- **Delete Account**: Delete user account with confirmation

### 6. Security Settings
- **Change Password**: Form to change password (if using email/password auth)
- **Two-Factor Authentication**: Enable/disable 2FA (future feature)
- **Connected Accounts**: Show connected OAuth accounts (Google)

### 7. About
- **App Version**: Display current version
- **Privacy Policy**: Link to privacy policy
- **Terms of Service**: Link to terms of service
- **Support**: Link to help center or contact

## Data Requirements
- Fetch user profile from `/api/user/profile` endpoint
- Update user profile via `/api/user/profile` endpoint
- Update settings via `/api/user/settings` endpoint
- Export data from all endpoints
- Delete account via `/api/user/account` endpoint

## UI Components Needed
- Settings sections with headers
- Form inputs for each setting
- Toggle switches for boolean settings
- Dropdowns for select settings
- File upload for avatar
- Confirmation dialogs for destructive actions

## Priority
- High: Profile settings, Appearance settings
- Medium: Notification settings, Currency settings
- Low: Data management, Security settings, About

## Notes
- Settings should persist in backend database
- Some settings may need to be synced with localStorage for immediate effect
