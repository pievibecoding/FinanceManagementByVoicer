# Settings Design

## Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (Left)  │  Main Content Area (Right)          │
│                  │                                      │
│  - Dashboard     │  ┌─────────────────────────────────┐ │
│  - Transactions  │  │  Header: Settings                │ │
│  - Accounts     │  └─────────────────────────────────┘ │
│  - Categories   │                                      │
│  - Analytics    │  ┌─────────────────────────────────┐ │
│  - Budgets      │  │  Settings Navigation (Tabs)      │ │
│  - Settings     │  │  [Profile] [Appearance] [Notif] │ │
│  - Help         │  │   [Currency] [Security] [About] │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Settings Form                   │ │
│                  │  │  [Form Fields]                   │ │
│                  │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Settings Navigation
**Layout:** Horizontal tab navigation

```
┌─────────────────────────────────────────────────────────┐
│  [👤 Profile] [🎨 Appearance] [🔔 Notifications]      │
│  [💰 Currency] [🔒 Security] [ℹ️ About]               │
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Active: Glassmorphism with accent border
- Inactive: Transparent with hover effect
- Icons for each section

### 2. Profile Settings
**Layout:** Form with profile fields

**Form Content:**
```
┌─────────────────────────────────────────┐
│  Profile Settings                       │
├─────────────────────────────────────────┤
│                                         │
│  Avatar: [📷 Upload]                   │
│          [Preview Image]                │
│                                         │
│  Name: [John Doe]                      │
│                                         │
│  Email: john@example.com (read-only)    │
│                                         │
│  [Save Changes]                         │
└─────────────────────────────────────────┘
```

**Avatar Upload:**
- Click to upload
- Preview current avatar
- Crop tool (optional)

### 3. Appearance Settings
**Layout:** Form with appearance options

**Form Content:**
```
┌─────────────────────────────────────────┐
│  Appearance Settings                   │
├─────────────────────────────────────────┤
│                                         │
│  Theme: [🌙 Dark] [☀️ Light]           │
│         [🔄 Auto]                      │
│                                         │
│  Font: [Inter ▼]                       │
│        [Manrope]                       │
│        [System]                        │
│                                         │
│  Language: [🇻🇳 Vietnamese]            │
│            [🇺🇸 English]               │
│                                         │
│  [Save Changes]                         │
└─────────────────────────────────────────┘
```

**Theme Toggle:**
- Visual preview of each theme
- Current theme highlighted

### 4. Notification Settings
**Layout:** Form with notification toggles

**Form Content:**
```
┌─────────────────────────────────────────┐
│  Notification Settings                  │
├─────────────────────────────────────────┤
│                                         │
│  Budget Alerts: [🔔 On] [🔕 Off]       │
│  Notify when budget exceeds 80%         │
│                                         │
│  Transaction Reminders: [🔔 On] [🔕 Off]│
│  Weekly transaction summary             │
│                                         │
│  Email Notifications: [🔔 On] [🔕 Off] │
│  Receive email updates                  │
│                                         │
│  Push Notifications: [🔔 On] [🔕 Off]  │
│  Browser push notifications             │
│                                         │
│  [Save Changes]                         │
└─────────────────────────────────────────┘
```

**Toggle Switch:**
- On: Green accent
- Off: Gray
- Smooth animation

### 5. Currency Settings
**Layout:** Form with currency options

**Form Content:**
```
┌─────────────────────────────────────────┐
│  Currency Settings                     │
├─────────────────────────────────────────┤
│                                         │
│  Default Currency: VND (fixed)         │
│                                         │
│  Number Format:                         │
│  [1,000,000.00] [1.000.000,00]        │
│                                         │
│  [Save Changes]                         │
└─────────────────────────────────────────┘
```

**Number Format Preview:**
- Live preview of selected format
- Show example amounts

### 6. Data Management
**Layout:** Section with data options

**Section Content:**
```
┌─────────────────────────────────────────┐
│  Data Management                        │
├─────────────────────────────────────────┤
│                                         │
│  [📥 Export Data]                       │
│  Export all data as JSON or CSV         │
│                                         │
│  [📤 Import Data]                       │
│  Import data from backup file           │
│                                         │
│  [🗑️ Delete Account]                    │
│  Permanently delete account and data     │
│                                         │
└─────────────────────────────────────────┘
```

**Export Options:**
- JSON (full data)
- CSV (transactions only)

**Import:**
- File upload
- Validation
- Preview before import

**Delete Account:**
- Confirmation dialog
- Warning about data loss
- Require password confirmation

### 7. Security Settings
**Layout:** Form with security options

**Form Content:**
```
┌─────────────────────────────────────────┐
│  Security Settings                      │
├─────────────────────────────────────────┤
│                                         │
│  Change Password:                       │
│  Current Password: [••••••••]           │
│  New Password: [••••••••]               │
│  Confirm Password: [••••••••]           │
│                                         │
│  [Update Password]                      │
│                                         │
│  Connected Accounts:                    │
│  [🔗 Google] [Disconnect]               │
│                                         │
│  Two-Factor Authentication: [🔕 Off]   │
│  (Coming soon)                          │
│                                         │
└─────────────────────────────────────────┘
```

**Password Validation:**
- Minimum 8 characters
- At least one uppercase
- At least one number
- Show/hide password toggle

### 8. About Section
**Layout:** Information section

**Section Content:**
```
┌─────────────────────────────────────────┐
│  About                                  │
├─────────────────────────────────────────┤
│                                         │
│  Finance Management by Voicer           │
│  Version: 1.0.0                         │
│                                         │
│  [Privacy Policy]                       │
│  [Terms of Service]                      │
│  [Support]                              │
│  [Rate App] ⭐⭐⭐⭐⭐                  │
│                                         │
└─────────────────────────────────────────┘
```

## Color Scheme
- Active tab: Accent border (#dd9787)
- Toggle on: Green (#74d3ae)
- Toggle off: Gray
- Destructive: Red (#dd9787)

## Typography
- Section headers: Bold, uppercase
- Labels: Regular
- Values: Bold
- Descriptions: Small, regular

## Responsive Design
- Desktop: Horizontal tabs
- Tablet: Horizontal tabs with wrap
- Mobile: Vertical tabs in sidebar

## Interactions
- Tab switch with animation
- Toggle switch animation
- Form validation
- Save button with loading state
- Confirmation dialogs for destructive actions
