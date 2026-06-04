# Requirements Document

## Introduction

This document specifies requirements for adding multi-user authentication and complete data isolation to the Finance Management by Voicer application. The system will transition from a single-user personal finance tracker to a multi-user family application where each user maintains fully isolated financial data. The target deployment supports 4 users (family members) with no shared data visibility between users.

## Glossary

- **System**: The Finance Management by Voicer application (React frontend + Express BFF + Flask backend + Turso database)
- **User**: An authenticated individual with a unique account in the system
- **Auth_Service**: The authentication subsystem responsible for user registration, login, logout, Google OAuth, and session management
- **Backend_API**: The Flask REST API layer (port 5000) that enforces data isolation
- **BFF_Server**: The Express Backend-For-Frontend server (port 3000) that handles authentication tokens
- **Frontend**: The React single-page application
- **User_Data**: All accounts, categories, and transactions associated with a specific user
- **Session_Token**: A JWT or session identifier that proves user authentication
- **Data_Isolation**: The security property ensuring users can only access their own financial data
- **Migration**: The process of associating existing data with a default system user during schema upgrade
- **Google_OAuth**: The authentication flow using Google ID tokens verified via google.oauth2.id_token library
- **google_sub**: The unique Google user identifier (subject) from the Google ID token payload

## Requirements

### Requirement 1: User Registration

**User Story:** As a new family member, I want to create an account with email and password OR sign in with Google, so that I can track my personal finances separately.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept registration requests containing email, username, and password
2. WHEN a registration request contains a duplicate email, THE Auth_Service SHALL return an error message indicating the email is already registered
3. WHEN a registration request contains a duplicate username, THE Auth_Service SHALL return an error message indicating the username is already taken
4. THE Auth_Service SHALL hash passwords using bcrypt or argon2 before storage
5. WHEN a user registers successfully, THE Auth_Service SHALL create a user record with user_id, username, email, password_hash, google_sub (nullable), created_at timestamp, and is_deleted set to false
6. WHEN a user registers successfully, THE Auth_Service SHALL seed default categories for that user
7. THE Auth_Service SHALL validate email format before accepting registration
8. THE Auth_Service SHALL require passwords to contain at least 8 characters
9. THE Auth_Service SHALL accept Google OAuth ID tokens for registration via POST /api/auth/google endpoint
10. WHEN a Google user registers for the first time, THE Auth_Service SHALL create a user record with google_sub from the ID token
11. WHEN a Google user registers, THE Auth_Service SHALL NOT require a password_hash (nullable column)

### Requirement 2: User Authentication

**User Story:** As an existing user, I want to log in with my credentials OR Google account, so that I can access my financial data.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept login requests containing email and password
2. THE Auth_Service SHALL accept Google OAuth ID tokens for authentication via POST /api/auth/google endpoint
3. WHEN login credentials are valid, THE Auth_Service SHALL return a Session_Token
4. WHEN login credentials are invalid, THE Auth_Service SHALL return an error message without revealing whether email or password was incorrect
5. THE Auth_Service SHALL verify password hashes using the same algorithm used for registration
6. WHEN a Session_Token is generated, THE Auth_Service SHALL include the user_id in the token payload
7. THE Session_Token SHALL expire after 24 hours of issuance
8. THE Auth_Service SHALL support token refresh for active sessions
9. WHEN a Google ID token is received, THE Auth_Service SHALL verify it using google.oauth2.id_token library
10. WHEN Google auth succeeds with an existing google_sub, THE Auth_Service SHALL return a Session_Token for that user
11. WHEN Google auth succeeds with a new google_sub but existing email, THE Auth_Service SHALL link the google_sub to the existing account
12. WHEN Google auth succeeds with a new google_sub and new email, THE Auth_Service SHALL create a new user account

### Requirement 3: Session Management

**User Story:** As a logged-in user, I want my session to persist across page refreshes, so that I don't have to log in repeatedly.

#### Acceptance Criteria

1. WHEN a user logs in, THE BFF_Server SHALL store the Session_Token in an httpOnly cookie or return it for localStorage storage
2. THE Frontend SHALL include the Session_Token in all API requests to Backend_API
3. WHEN a Session_Token is expired or invalid, THE Backend_API SHALL return HTTP 401 Unauthorized
4. WHEN the Frontend receives HTTP 401, THE Frontend SHALL redirect to the login page
5. THE Auth_Service SHALL provide a token validation endpoint that verifies Session_Token validity and returns user_id
6. WHEN a user logs out, THE Auth_Service SHALL invalidate the Session_Token

### Requirement 4: Database Schema Extension

**User Story:** As a system administrator, I want the database to support multiple users with isolated data and Google OAuth, so that each family member's finances remain private and they can sign in with Google.

#### Acceptance Criteria

1. THE System SHALL create a users table with columns: user_id (INTEGER PRIMARY KEY AUTOINCREMENT), username (TEXT UNIQUE), email (TEXT UNIQUE), password_hash (TEXT), google_sub (TEXT UNIQUE), created_at (TEXT NOT NULL), is_deleted (INTEGER NOT NULL DEFAULT 0)
2. THE System SHALL enforce CHECK constraint on users table requiring at least one of: username, email, or google_sub to be NOT NULL
3. THE System SHALL create a user_settings table with columns: setting_id (INTEGER PRIMARY KEY AUTOINCREMENT), user_id (INTEGER NOT NULL REFERENCES users), currency (TEXT DEFAULT 'VND'), language (TEXT DEFAULT 'vi'), timezone (TEXT DEFAULT 'Asia/Ho_Chi_Minh')
4. THE System SHALL add user_id column to Account_Dim as INTEGER NOT NULL with FOREIGN KEY constraint to users table
5. THE System SHALL add user_id column to Category_Dim as INTEGER NOT NULL with FOREIGN KEY constraint to users table
6. THE System SHALL add user_id column to Transaction_Fact as INTEGER NOT NULL with FOREIGN KEY constraint to users table
7. THE System SHALL add is_deleted column to Transaction_Fact as INTEGER NOT NULL DEFAULT 0
8. WHEN the schema migration executes, THE System SHALL create a default system user with user_id 1
9. WHEN the schema migration executes, THE System SHALL associate all existing Account_Dim rows with user_id 1
10. WHEN the schema migration executes, THE System SHALL associate all existing Category_Dim rows with user_id 1
11. WHEN the schema migration executes, THE System SHALL associate all existing Transaction_Fact rows with user_id 1

### Requirement 5: Data Isolation Enforcement

**User Story:** As a user, I want to see only my own financial data, so that my privacy is protected from other family members.

#### Acceptance Criteria

1. WHEN Backend_API receives a request with a valid Session_Token, THE Backend_API SHALL extract user_id from the token
2. THE Backend_API SHALL filter all Account_Dim queries by user_id matching the authenticated user
3. THE Backend_API SHALL filter all Category_Dim queries by user_id matching the authenticated user
4. THE Backend_API SHALL filter all Transaction_Fact queries by user_id matching the authenticated user
5. WHEN a user creates an account, THE Backend_API SHALL set the account's user_id to the authenticated user's user_id
6. WHEN a user creates a category, THE Backend_API SHALL set the category's user_id to the authenticated user's user_id
7. WHEN a user creates a transaction, THE Backend_API SHALL set the transaction's user_id to the authenticated user's user_id
8. WHEN a user attempts to access another user's account_id, THE Backend_API SHALL return HTTP 404 Not Found
9. WHEN a user attempts to access another user's category_id, THE Backend_API SHALL return HTTP 404 Not Found
10. WHEN a user attempts to access another user's transaction_id, THE Backend_API SHALL return HTTP 404 Not Found

### Requirement 6: Protected API Routes

**User Story:** As a system administrator, I want all financial endpoints to require authentication, so that unauthenticated users cannot access financial data.

#### Acceptance Criteria

1. THE Backend_API SHALL implement authentication middleware that validates Session_Token on all routes under /api/transactions
2. THE Backend_API SHALL implement authentication middleware that validates Session_Token on all routes under /api/accounts
3. THE Backend_API SHALL implement authentication middleware that validates Session_Token on all routes under /api/categories
4. THE Backend_API SHALL implement authentication middleware that validates Session_Token on all routes under /api/sql-query
5. WHEN a request lacks a valid Session_Token, THE Backend_API SHALL return HTTP 401 Unauthorized with message "Authentication required"
6. THE Backend_API SHALL exclude /api/auth/register and /api/auth/login endpoints from authentication middleware
7. THE Backend_API SHALL exclude /api/auth/logout from authentication middleware if it uses token invalidation

### Requirement 7: Authentication API Endpoints

**User Story:** As a developer, I want well-defined authentication endpoints including Google OAuth, so that the frontend can implement login/registration flows.

#### Acceptance Criteria

1. THE Backend_API SHALL provide POST /api/auth/register endpoint accepting {email, username, password}
2. WHEN registration succeeds, THE Backend_API SHALL return HTTP 201 with {access_token, user_id}
3. WHEN registration fails, THE Backend_API SHALL return HTTP 400 with {error} message
4. THE Backend_API SHALL provide POST /api/auth/login endpoint accepting {email, password}
5. WHEN login succeeds, THE Backend_API SHALL return HTTP 200 with {access_token, user_id, email}
6. WHEN login fails, THE Backend_API SHALL return HTTP 401 with {error: "Invalid credentials"}
7. THE Backend_API SHALL provide POST /api/auth/google endpoint accepting {id_token: string}
8. WHEN Google auth succeeds, THE Backend_API SHALL return HTTP 200 with {access_token, user_id, email, name}
9. WHEN Google auth fails, THE Backend_API SHALL return HTTP 401 with {error: "Google authentication failed"}
10. THE Backend_API SHALL provide POST /api/auth/logout endpoint accepting the Session_Token
11. WHEN logout succeeds, THE Backend_API SHALL return HTTP 200 with {message: "Logged out successfully"}
12. THE Backend_API SHALL provide GET /api/auth/me endpoint that returns {user_id, username, email} for the authenticated user
13. WHEN /api/auth/me receives invalid token, THE Backend_API SHALL return HTTP 401
14. THE Backend_API SHALL validate Google ID tokens using GOOGLE_CLIENT_ID environment variable

### Requirement 8: Frontend Authentication Flow

**User Story:** As a user, I want a login page with Google sign-in option before the main application, so that I can authenticate easily before viewing my finances.

#### Acceptance Criteria

1. WHEN a user visits the application without a valid Session_Token, THE Frontend SHALL display the login/register page
2. WHEN a user visits the application with a valid Session_Token, THE Frontend SHALL display the main finance tracking interface
3. THE Frontend SHALL wrap the application with GoogleOAuthProvider using VITE_GOOGLE_CLIENT_ID environment variable
4. THE Frontend SHALL display GoogleLogin button from @react-oauth/google library on the login page
5. THE Frontend SHALL provide a registration form with fields: email, username, password, confirm password
6. THE Frontend SHALL provide a login form with fields: email, password
7. WHEN a user submits valid registration data, THE Frontend SHALL call POST /api/auth/register and store the returned token
8. WHEN a user submits valid login credentials, THE Frontend SHALL call POST /api/auth/login and store the returned token
9. WHEN a user clicks Google sign-in and authentication succeeds, THE Frontend SHALL call POST /api/auth/google with the credential token
10. WHEN Google authentication succeeds, THE Frontend SHALL store the returned access_token and redirect to main interface
11. THE Frontend SHALL validate that password and confirm password match before submitting registration
12. THE Frontend SHALL display error messages from authentication failures returned by Backend_API
13. THE Frontend SHALL provide a logout button visible on the main interface
14. WHEN a user clicks logout, THE Frontend SHALL call POST /api/auth/logout, clear the stored token, and redirect to login page

### Requirement 9: Token Management

**User Story:** As a user, I want my authentication to persist securely, so that I remain logged in across browser sessions.

#### Acceptance Criteria

1. WHEN a user logs in successfully, THE Frontend SHALL store the Session_Token in localStorage or httpOnly cookie
2. WHEN the Frontend makes API requests to Backend_API, THE Frontend SHALL include the Session_Token in the Authorization header as "Bearer {token}"
3. WHEN the BFF_Server makes requests to Backend_API on behalf of the user, THE BFF_Server SHALL include the Session_Token from the user's request
4. THE Frontend SHALL check for a stored Session_Token on application initialization
5. WHEN a stored Session_Token exists, THE Frontend SHALL validate it by calling GET /api/auth/me
6. WHEN token validation fails, THE Frontend SHALL clear the stored token and redirect to login
7. THE Frontend SHALL clear the stored token when the user logs out

### Requirement 10: User-Specific Seed Data

**User Story:** As a new user, I want default categories created for me, so that I can start tracking expenses immediately.

#### Acceptance Criteria

1. WHEN a new user registers, THE Auth_Service SHALL create default Category_Dim rows for that user
2. THE Auth_Service SHALL create categories with category_type 'expense': food (Ăn uống, 4M budget), transport (Di chuyển, 1.5M budget), shopping (Mua sắm, 3M budget), entertainment (Giải trí, 2M budget), study (Học tập, 2M budget), health (Sức khỏe, 1M budget), other (Khác, 1.5M budget)
3. THE Auth_Service SHALL create categories with category_type 'income': salary (Tiền lương, 0 budget)
4. THE Auth_Service SHALL create categories with category_type 'investment': investment (Đầu tư chứng khoán, 0 budget)
5. THE Auth_Service SHALL set category_id values to '{user_id}-food', '{user_id}-transport', etc. to ensure uniqueness across users
6. THE Auth_Service SHALL NOT create default accounts for new users
7. WHEN a new user logs in for the first time, THE Frontend SHALL guide them to create their first account

### Requirement 11: Backward Compatibility

**User Story:** As the system administrator, I want existing single-user data preserved during migration, so that no financial history is lost.

#### Acceptance Criteria

1. THE Migration SHALL execute without data loss from Account_Dim, Category_Dim, or Transaction_Fact
2. THE Migration SHALL preserve all existing transaction_id, transaction_date, amount, type, and note values
3. THE Migration SHALL preserve all existing account_id, account_name, account_type, and initial_balance values
4. THE Migration SHALL preserve all existing category_id, category_name, category_type, and budget values
5. WHEN the migration completes, THE System SHALL allow the default system user to access all pre-existing data
6. THE Migration SHALL be idempotent, allowing repeated execution without duplicate data or errors

### Requirement 12: Soft Delete Support

**User Story:** As a user, I want to mark transactions as deleted without losing historical data, so that I can maintain audit trails.

#### Acceptance Criteria

1. WHEN a user deletes a transaction, THE Backend_API SHALL set is_deleted to 1 for that transaction
2. THE Backend_API SHALL filter all Transaction_Fact queries to exclude rows where is_deleted equals 1
3. THE Backend_API SHALL include is_deleted column in Transaction_Fact SELECT queries for administrative purposes
4. THE Backend_API SHALL NOT physically delete Transaction_Fact rows when DELETE /api/transactions/:id is called
5. WHEN computing balances, THE Frontend SHALL exclude transactions where is_deleted equals 1

### Requirement 13: User Profile Display

**User Story:** As a logged-in user, I want to see my username displayed, so that I know which account I'm using.

#### Acceptance Criteria

1. WHEN a user logs in, THE Frontend SHALL display the username in the application header or navigation bar
2. THE Frontend SHALL fetch user details from GET /api/auth/me after successful login
3. THE Frontend SHALL display the user's email in a profile or settings section
4. THE Frontend SHALL provide visual indication of the currently authenticated user on all pages

### Requirement 14: Password Security

**User Story:** As a security-conscious user, I want my password handled securely, so that my account cannot be easily compromised.

#### Acceptance Criteria

1. THE Auth_Service SHALL use bcrypt with work factor 12 or argon2id for password hashing
2. THE Auth_Service SHALL generate unique salts for each password hash
3. THE Backend_API SHALL NOT log passwords in plain text
4. THE Backend_API SHALL NOT return password_hash in any API response
5. THE Backend_API SHALL enforce HTTPS in production environments for all authentication endpoints
6. THE Auth_Service SHALL reject passwords shorter than 8 characters
7. THE Auth_Service SHALL reject passwords containing only spaces or whitespace

### Requirement 15: Error Handling for Authentication

**User Story:** As a user, I want clear error messages when authentication fails, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN registration fails due to duplicate email, THE Auth_Service SHALL return "Email already registered"
2. WHEN registration fails due to duplicate username, THE Auth_Service SHALL return "Username already taken"
3. WHEN registration fails due to invalid email format, THE Auth_Service SHALL return "Invalid email format"
4. WHEN registration fails due to weak password, THE Auth_Service SHALL return "Password must be at least 8 characters"
5. WHEN login fails, THE Auth_Service SHALL return "Invalid credentials" without specifying whether email or password was incorrect
6. WHEN a token expires, THE Backend_API SHALL return "Session expired, please log in again"
7. WHEN a token is malformed, THE Backend_API SHALL return "Invalid authentication token"
