# Help Design

## Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (Left)  │  Main Content Area (Right)          │
│                  │                                      │
│  - Dashboard     │  ┌─────────────────────────────────┐ │
│  - Transactions  │  │  Header: Help Center             │ │
│  - Accounts     │  │  [🔍 Search help articles...]   │ │
│  - Categories   │  └─────────────────────────────────┘ │
│  - Analytics    │                                      │
│  - Budgets      │  ┌─────────────────────────────────┐ │
│  - Settings     │  │  Help Navigation (Sidebar)       │ │
│  - Help         │  │  [Getting Started]               │ │
│                  │  │  [User Guide]                   │ │
│                  │  │  [FAQ]                          │ │
│                  │  │  [Contact Support]              │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                      │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │  Article Content                 │ │
│                  │  │  [Markdown Content]             │ │
│                  │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Search Bar
**Layout:** Search input in header

**Search Content:**
```
┌─────────────────────────────────────────┐
│  🔍 Search help articles...            │
└─────────────────────────────────────────┘
```

**Features:**
- Real-time search
- Highlight matches
- Filter by category

### 2. Help Navigation
**Layout:** Vertical sidebar navigation

**Navigation Items:**
```
┌─────────────────────────────────────────┐
│  📚 Getting Started                    │
│  📖 User Guide                         │
│  ❓ FAQ                                │
│  💬 Contact Support                    │
│  📝 Feedback                           │
│  📋 Changelog                          │
└─────────────────────────────────────────┘
```

**Styling:**
- Active: Glassmorphism with accent border
- Inactive: Transparent with hover effect
- Icons for each section

### 3. Getting Started
**Layout:** Article content

**Content Structure:**
```
┌─────────────────────────────────────────┐
│  Getting Started                       │
├─────────────────────────────────────────┤
│                                         │
│  Welcome to Finance Management!         │
│                                         │
│  1. Create your first account          │
│  2. Add your first transaction         │
│  3. Set up budgets                     │
│  4. View analytics                     │
│                                         │
│  [Continue to User Guide →]            │
└─────────────────────────────────────────┘
```

**Styling:**
- Step-by-step guide
- Numbered list
- Call-to-action buttons
- Screenshots (optional)

### 4. User Guide
**Layout:** Article content with sections

**Content Structure:**
```
┌─────────────────────────────────────────┐
│  User Guide                             │
├─────────────────────────────────────────┤
│                                         │
│  Table of Contents                      │
│  - How to add transactions              │
│  - How to manage accounts               │
│  - How to set up budgets               │
│  - How to view analytics               │
│                                         │
│  ──────────────────────────────────    │
│  How to add transactions                │
│  ──────────────────────────────────    │
│  [Step-by-step instructions]            │
│                                         │
│  [Screenshots/Diagrams]                │
└─────────────────────────────────────────┘
```

**Features:**
- Table of contents with anchor links
- Step-by-step instructions
- Screenshots/diagrams
- Code examples (if applicable)

### 5. FAQ
**Layout:** Accordion-style FAQ

**FAQ Item:**
```
┌─────────────────────────────────────────┐
│  How do I add a transaction?      [▼]  │
├─────────────────────────────────────────┤
│  To add a transaction:                  │
│  1. Go to Transactions page             │
│  2. Click "Add Transaction"             │
│  3. Fill in the form                   │
│  4. Click "Add Transaction"             │
└─────────────────────────────────────────┘
```

**Styling:**
- Collapsible sections
- Click to expand/collapse
- Smooth animation
- Search within FAQ

### 6. Contact Support
**Layout:** Contact form

**Form Content:**
```
┌─────────────────────────────────────────┐
│  Contact Support                        │
├─────────────────────────────────────────┤
│                                         │
│  Name: [Your name]                      │
│                                         │
│  Email: [your@email.com]                │
│                                         │
│  Subject: [Issue with transactions]    │
│                                         │
│  Message: [Describe your issue...]      │
│                                         │
│  [Send Message]                         │
│                                         │
│  Or email us at: support@example.com    │
└─────────────────────────────────────────┘
```

**Form Validation:**
- Required fields
- Email validation
- Message length limit

### 7. Feedback
**Layout:** Feedback form

**Form Content:**
```
┌─────────────────────────────────────────┐
│  Send Feedback                          │
├─────────────────────────────────────────┤
│                                         │
│  Type: [Feature Request] [Bug Report]   │
│        [Other]                          │
│                                         │
│  Subject: [Your feedback subject]       │
│                                         │
│  Description: [Describe your feedback]  │
│                                         │
│  Rate App: ⭐⭐⭐⭐⭐                  │
│                                         │
│  [Send Feedback]                         │
└─────────────────────────────────────────┘
```

**Star Rating:**
- Interactive stars
- Hover effect
- Click to set rating

### 8. Changelog
**Layout:** Version history

**Version Item:**
```
┌─────────────────────────────────────────┐
│  Version 1.0.0 - June 2026              │
├─────────────────────────────────────────┤
│                                         │
│  New Features:                          │
│  - Added transactions management        │
│  - Added accounts management            │
│  - Added budgets                        │
│  - Added analytics                       │
│                                         │
│  Bug Fixes:                             │
│  - Fixed login issue                    │
│  - Fixed export bug                     │
│                                         │
└─────────────────────────────────────────┘
```

**Styling:**
- Version header
- Section headers (New Features, Bug Fixes)
- Bullet points
- Date badges

## Color Scheme
- Active nav: Accent border (#dd9787)
- Links: Green accent (#74d3ae)
- Code blocks: Dark background
- Quotes: Italic with accent color

## Typography
- Article titles: Bold, large
- Section headers: Bold, uppercase
- Body: Regular
- Code: Monospace
- Quotes: Italic

## Responsive Design
- Desktop: Sidebar navigation + content
- Tablet: Collapsible sidebar
- Mobile: Hamburger menu + stacked content

## Interactions
- Nav switch with animation
- FAQ accordion expand/collapse
- Form validation
- Star rating hover/click
- Search real-time filtering
