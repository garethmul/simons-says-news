# Multi-Tenant Architecture Implementation Guide

## Overview

This document describes the implementation of a two-level multi-tenant architecture for Simon's Says News:

```
Level 1: Organizations (e.g., "Eden Church Network")
  └── Level 2: Accounts (e.g., "Eden London", "Eden Manchester", "Eden Youth")
      └── All Data (sources, prompts, stories, settings, etc.)
```

## Database Schema Changes

### New Tables

1. **ssnews_organizations**
   - `organization_id` (PK)
   - `name`
   - `slug` (unique)
   - `is_active`
   - `settings` (JSON)
   - `created_at`
   - `updated_at`

2. **ssnews_accounts**
   - `account_id` (PK)
   - `organization_id` (FK)
   - `name`
   - `slug`
   - `is_active`
   - `settings` (JSON)
   - `created_at`
   - `updated_at`

3. **ssnews_user_organizations**
   - `user_org_id` (PK)
   - `user_id` (Firebase UID)
   - `user_email`
   - `organization_id` (FK)
   - `role` (owner|admin|member)
   - `created_at`
   - `updated_at`

4. **ssnews_user_accounts** (optional granular permissions)
   - `user_account_id` (PK)
   - `user_id`
   - `account_id` (FK)
   - `role` (owner|admin|member|NULL)
   - `permissions` (JSON)
   - `created_at`
   - `updated_at`

### Modified Tables

All existing tables now include an `account_id` column:
- ssnews_news_sources
- ssnews_scraped_articles
- ssnews_generated_articles
- ssnews_generated_social_posts
- ssnews_generated_video_scripts
- ssnews_prompt_templates
- ssnews_user_bookmarks
- ssnews_jobs
- ssnews_evergreen_content_ideas
- ssnews_image_assets
- ssnews_system_logs (optional)

## Backend Implementation

### 1. Database Migration

Run the migration script:
```bash
node src/scripts/run-multi-tenant-migration.js
```

To rollback:
```bash
node src/scripts/run-multi-tenant-migration.js rollback
```

### 2. Middleware

**Account Context Middleware** (`src/middleware/accountContext.js`):
- Extracts account ID from requests (header, query, or session)
- Validates account exists and is active
- Checks user has access to the account
- Attaches account context to request

Usage:
```javascript
app.get('/api/eden/news/sources', accountContext, async (req, res) => {
  const { accountId } = req.accountContext;
  // Use accountId in queries
});
```

### 3. Organization Service

**OrganizationService** (`src/services/organizationService.js`):
- Manages organizations and accounts
- Handles user associations
- Integrates with external API for organization sync
- Provides role-based access control

### 4. Database Service Updates

All database methods now support account filtering:
```javascript
// Old way
const sources = await db.getActiveNewsSources();

// New way with account context
const sources = await db.getActiveNewsSources(accountId);
```

### 5. API Routes

New organization/account management routes:
- `GET /api/organizations/user/organizations` - Get user's organizations
- `GET /api/organizations/:orgId/accounts` - Get accounts in organization
- `POST /api/organizations` - Create organization
- `POST /api/organizations/:orgId/accounts` - Create account
- `POST /api/organizations/:orgId/users` - Add user to organization
- `PUT /api/organizations/:orgId/users/:userId/role` - Update user role
- `DELETE /api/organizations/:orgId/users/:userId` - Remove user
- `GET /api/organizations/account/context` - Get current account context
- `POST /api/organizations/account/set-default` - Set default account

## Frontend Implementation

### 1. Account Context

**AccountContext** (`src/contexts/AccountContext.jsx`):
- Manages organization and account selection
- Persists selection in localStorage
- Syncs with external API
- Provides helper methods for API requests

### 2. Account Switcher

**AccountSwitcher** (`src/components/AccountSwitcher.jsx`):
- Displays current organization/account
- Allows switching between organizations and accounts
- Shows user role
- Allows creating new organizations/accounts (based on role)

### 3. Integration

Update App.jsx:
```jsx
import { AccountProvider } from './contexts/AccountContext';

function AuthenticatedApp() {
  // ... existing code ...
  return (
    <AccountProvider>
      <ProjectEden />
    </AccountProvider>
  );
}
```

Use in components:
```jsx
import { useAccount } from '../contexts/AccountContext';

function MyComponent() {
  const { withAccountContext } = useAccount();
  
  const fetchData = async () => {
    const response = await fetch('/api/eden/news/sources', 
      withAccountContext({
        method: 'GET'
      })
    );
  };
}
```

## Environment Variables

Add to `.env`:
```
# External API for organization sync (optional)
EXTERNAL_API_URL=https://api.example.com
EXTERNAL_API_TOKEN=your-api-token
```

## Migration Steps

1. **Backup your database**

2. **Update environment variables**

3. **Run database migration**:
   ```bash
   node src/scripts/run-multi-tenant-migration.js
   ```

4. **Update all API calls** to include account context:
   - Add `accountContext` middleware to routes
   - Update database queries to filter by account_id

5. **Test the implementation**:
   - Login and verify organization/account selection
   - Test data isolation between accounts
   - Verify role-based permissions

## Role Permissions

### Organization Level
- **Owner**: Full control, can manage users and create accounts
- **Admin**: Can manage users and create accounts
- **Member**: Read-only access to organization

### Account Level (Optional)
- Inherits from organization role by default
- Can override with specific account permissions

## Best Practices

1. **Always validate account context** in API endpoints
2. **Use account filtering** in all database queries
3. **Handle account switching** gracefully in the UI
4. **Test data isolation** thoroughly
5. **Monitor performance** with account filtering

## Troubleshooting

### Common Issues

1. **"Account context required" error**
   - Ensure AccountProvider wraps your app
   - Check that account is selected
   - Verify API calls include account headers

2. **Data not showing after migration**
   - Check that migration completed successfully
   - Verify account_id was set for existing data
   - Ensure user has access to the account

3. **Cannot switch accounts**
   - Clear localStorage and re-login
   - Check user has access to multiple accounts
   - Verify organizations are properly synced

### Debug Mode

Enable debug logging:
```javascript
// In AccountContext.jsx
const DEBUG = true; // Set to true for verbose logging
```

## Future Enhancements

1. **Granular Permissions**: Implement feature-level permissions
2. **Account Templates**: Pre-configured account settings
3. **Usage Analytics**: Track usage per account
4. **Billing Integration**: Account-based billing
5. **Data Export**: Export data by account

## API Changes Summary

All API endpoints now require account context. Update your API calls:

```javascript
// Before
fetch('/api/eden/news/sources')

// After
fetch('/api/eden/news/sources', {
  headers: {
    'x-account-id': selectedAccountId
  }
})
```

Or use the helper:
```javascript
const { withAccountContext } = useAccount();
fetch('/api/eden/news/sources', withAccountContext()) 

## Overview

This document describes the implementation of a two-level multi-tenant architecture for Simon's Says News:

```
Level 1: Organizations (e.g., "Eden Church Network")
  └── Level 2: Accounts (e.g., "Eden London", "Eden Manchester", "Eden Youth")
      └── All Data (sources, prompts, stories, settings, etc.)
```

## Database Schema Changes

### New Tables

1. **ssnews_organizations**
   - `organization_id` (PK)
   - `name`
   - `slug` (unique)
   - `is_active`
   - `settings` (JSON)
   - `created_at`
   - `updated_at`

2. **ssnews_accounts**
   - `account_id` (PK)
   - `organization_id` (FK)
   - `name`
   - `slug`
   - `is_active`
   - `settings` (JSON)
   - `created_at`
   - `updated_at`

3. **ssnews_user_organizations**
   - `user_org_id` (PK)
   - `user_id` (Firebase UID)
   - `user_email`
   - `organization_id` (FK)
   - `role` (owner|admin|member)
   - `created_at`
   - `updated_at`

4. **ssnews_user_accounts** (optional granular permissions)
   - `user_account_id` (PK)
   - `user_id`
   - `account_id` (FK)
   - `role` (owner|admin|member|NULL)
   - `permissions` (JSON)
   - `created_at`
   - `updated_at`

### Modified Tables

All existing tables now include an `account_id` column:
- ssnews_news_sources
- ssnews_scraped_articles
- ssnews_generated_articles
- ssnews_generated_social_posts
- ssnews_generated_video_scripts
- ssnews_prompt_templates
- ssnews_user_bookmarks
- ssnews_jobs
- ssnews_evergreen_content_ideas
- ssnews_image_assets
- ssnews_system_logs (optional)

## Backend Implementation

### 1. Database Migration

Run the migration script:
```bash
node src/scripts/run-multi-tenant-migration.js
```

To rollback:
```bash
node src/scripts/run-multi-tenant-migration.js rollback
```

### 2. Middleware

**Account Context Middleware** (`src/middleware/accountContext.js`):
- Extracts account ID from requests (header, query, or session)
- Validates account exists and is active
- Checks user has access to the account
- Attaches account context to request

Usage:
```javascript
app.get('/api/eden/news/sources', accountContext, async (req, res) => {
  const { accountId } = req.accountContext;
  // Use accountId in queries
});
```

### 3. Organization Service

**OrganizationService** (`src/services/organizationService.js`):
- Manages organizations and accounts
- Handles user associations
- Integrates with external API for organization sync
- Provides role-based access control

### 4. Database Service Updates

All database methods now support account filtering:
```javascript
// Old way
const sources = await db.getActiveNewsSources();

// New way with account context
const sources = await db.getActiveNewsSources(accountId);
```

### 5. API Routes

New organization/account management routes:
- `GET /api/organizations/user/organizations` - Get user's organizations
- `GET /api/organizations/:orgId/accounts` - Get accounts in organization
- `POST /api/organizations` - Create organization
- `POST /api/organizations/:orgId/accounts` - Create account
- `POST /api/organizations/:orgId/users` - Add user to organization
- `PUT /api/organizations/:orgId/users/:userId/role` - Update user role
- `DELETE /api/organizations/:orgId/users/:userId` - Remove user
- `GET /api/organizations/account/context` - Get current account context
- `POST /api/organizations/account/set-default` - Set default account

## Frontend Implementation

### 1. Account Context

**AccountContext** (`src/contexts/AccountContext.jsx`):
- Manages organization and account selection
- Persists selection in localStorage
- Syncs with external API
- Provides helper methods for API requests

### 2. Account Switcher

**AccountSwitcher** (`src/components/AccountSwitcher.jsx`):
- Displays current organization/account
- Allows switching between organizations and accounts
- Shows user role
- Allows creating new organizations/accounts (based on role)

### 3. Integration

Update App.jsx:
```jsx
import { AccountProvider } from './contexts/AccountContext';

function AuthenticatedApp() {
  // ... existing code ...
  return (
    <AccountProvider>
      <ProjectEden />
    </AccountProvider>
  );
}
```

Use in components:
```jsx
import { useAccount } from '../contexts/AccountContext';

function MyComponent() {
  const { withAccountContext } = useAccount();
  
  const fetchData = async () => {
    const response = await fetch('/api/eden/news/sources', 
      withAccountContext({
        method: 'GET'
      })
    );
  };
}
```

## Environment Variables

Add to `.env`:
```
# External API for organization sync (optional)
EXTERNAL_API_URL=https://api.example.com
EXTERNAL_API_TOKEN=your-api-token
```

## Migration Steps

1. **Backup your database**

2. **Update environment variables**

3. **Run database migration**:
   ```bash
   node src/scripts/run-multi-tenant-migration.js
   ```

4. **Update all API calls** to include account context:
   - Add `accountContext` middleware to routes
   - Update database queries to filter by account_id

5. **Test the implementation**:
   - Login and verify organization/account selection
   - Test data isolation between accounts
   - Verify role-based permissions

## Role Permissions

### Organization Level
- **Owner**: Full control, can manage users and create accounts
- **Admin**: Can manage users and create accounts
- **Member**: Read-only access to organization

### Account Level (Optional)
- Inherits from organization role by default
- Can override with specific account permissions

## Best Practices

1. **Always validate account context** in API endpoints
2. **Use account filtering** in all database queries
3. **Handle account switching** gracefully in the UI
4. **Test data isolation** thoroughly
5. **Monitor performance** with account filtering

## Troubleshooting

### Common Issues

1. **"Account context required" error**
   - Ensure AccountProvider wraps your app
   - Check that account is selected
   - Verify API calls include account headers

2. **Data not showing after migration**
   - Check that migration completed successfully
   - Verify account_id was set for existing data
   - Ensure user has access to the account

3. **Cannot switch accounts**
   - Clear localStorage and re-login
   - Check user has access to multiple accounts
   - Verify organizations are properly synced

### Debug Mode

Enable debug logging:
```javascript
// In AccountContext.jsx
const DEBUG = true; // Set to true for verbose logging
```

## Future Enhancements

1. **Granular Permissions**: Implement feature-level permissions
2. **Account Templates**: Pre-configured account settings
3. **Usage Analytics**: Track usage per account
4. **Billing Integration**: Account-based billing
5. **Data Export**: Export data by account

## API Changes Summary

All API endpoints now require account context. Update your API calls:

```javascript
// Before
fetch('/api/eden/news/sources')

// After
fetch('/api/eden/news/sources', {
  headers: {
    'x-account-id': selectedAccountId
  }
})
```

Or use the helper:
```javascript
const { withAccountContext } = useAccount();
fetch('/api/eden/news/sources', withAccountContext()) 