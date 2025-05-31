# 👥 Account User Management System

A comprehensive multi-tenant user management system that integrates with external user/organization services and provides account-level access control.

## 📋 Overview

This system provides:
- **External Integration**: Connects to your existing user/organization API
- **Internal Account Management**: Local user-to-account assignments with roles
- **Role-Based Access Control**: Granular permissions system
- **Invitation System**: Email-based account invitations
- **Admin Interface**: Comprehensive UI for user management

## 🏗️ Architecture

### **Database Schema**

#### Core Tables Created:
- `ssnews_account_users` - User assignments to specific accounts
- `ssnews_account_invitations` - Pending account invitations
- `ssnews_global_user_roles` - Global application roles (super admin, support)
- `ssnews_user_access_log` - User access tracking and audit logs

### **Services Layer**

#### External User Service (`src/services/externalUserService.js`)
Integrates with your external user/organization API:
```javascript
// Example usage
const organizations = await externalUserService.getUserOrganizations(userId, { authToken });
const user = await externalUserService.getUserById(userId, authToken);
```

#### Internal User Management Service (`src/services/userManagementService.js`)
Handles internal user assignments and permissions:
```javascript
// Example usage
const permissions = await userManagementService.getUserAccountPermissions(userId, accountId);
await userManagementService.assignUserToAccount({ accountId, userId, role: 'admin' });
```

### **API Routes**

All routes are mounted under `/api/user-management/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/permissions` | GET | Get current user's permissions |
| `/accounts/:accountId/users` | GET | List account users |
| `/accounts/:accountId/users` | POST | Assign user to account |
| `/accounts/:accountId/users/:userId` | DELETE | Remove user from account |
| `/accounts/:accountId/invitations` | POST | Create invitation |
| `/accounts/:accountId/invitations` | GET | List pending invitations |
| `/invitations/:invitationId` | DELETE | Cancel invitation |
| `/invitations/:token/accept` | POST | Accept invitation |
| `/search` | GET | Search users by email |
| `/global/roles` | POST | Grant global roles (super admin only) |

## 🔐 Permission System

### **Role Hierarchy**

#### Global Roles (Application-wide):
- **`super_admin`** - Full access to everything, can manage all organizations and accounts
- **`support`** - Read-only access to all data for support purposes
- **`billing_admin`** - Access to billing and subscription information

#### Account Roles (Account-specific):
- **`admin`** - Full access to account, can manage users, settings, all data
- **`editor`** - Can create, edit, and manage content, limited admin functions
- **`viewer`** - Read-only access to account data

### **Permission Matrix**

| Action | super_admin | support | billing_admin | account_admin | editor | viewer |
|--------|-------------|---------|---------------|---------------|--------|--------|
| Manage Organizations | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manage Global Users | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View All Accounts | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Account Users | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Invite Users | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Manage Content | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ |
| View Content | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Manage Sources | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ |
| View Analytics | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Manage Jobs | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ |

## 🎨 User Interface

### **AccountUserManagement Component**

Main interface located at `src/components/AccountUserManagement.jsx`:

#### Features:
- **Users Tab**: List current users with roles and last access times
- **Invite User Tab**: Send email invitations with role selection
- **Pending Invitations Tab**: Manage outstanding invitations
- **Permission-aware UI**: Shows/hides features based on user permissions
- **Real-time updates**: Refreshes data after actions

#### Usage:
```jsx
import AccountUserManagement from './components/AccountUserManagement';

function AdminPage() {
  return (
    <div>
      <AccountUserManagement />
    </div>
  );
}
```

### **Enhanced AccountContext**

Updated context with permission checking:

```jsx
const { 
  canManageUsers, 
  canInviteUsers, 
  hasPermission,
  getUserRole,
  isGlobalAdmin 
} = useAccount();

// Example usage
if (canManageUsers()) {
  // Show user management UI
}

if (hasPermission('manageContent')) {
  // Show content management options
}
```

## 🚀 Getting Started

### **1. Environment Configuration**

Add these environment variables for external API integration:
```env
EXTERNAL_USER_API_URL=https://api.your-service.com
EXTERNAL_USER_API_KEY=your-api-key
```

### **2. Grant Initial Super Admin Role**

```sql
INSERT INTO ssnews_global_user_roles (user_id, user_email, role, granted_by) 
VALUES ('your-firebase-uid', 'admin@yourcompany.com', 'super_admin', 'system');
```

### **3. Use the Components**

```jsx
// Add to your app routing
import AccountUserManagement from './components/AccountUserManagement';
import InvitationAcceptance from './components/InvitationAcceptance';

// In your router
<Route path="/admin/users" element={<AccountUserManagement />} />
<Route path="/invite/:token" element={<InvitationAcceptance />} />
```

## 📧 Invitation Flow

### **1. Admin sends invitation**
- Uses AccountUserManagement interface
- Specifies email, name, and role
- System generates secure token with expiration

### **2. User receives invitation**
- Email contains link: `/invite/{token}`
- Link loads InvitationAcceptance component

### **3. User accepts invitation**
- Must be logged in with Firebase Auth
- System validates token and assigns role
- User gains immediate access to account

## 🔧 API Usage Examples

### **Check User Permissions**
```javascript
const response = await fetch('/api/user-management/permissions', {
  ...withAccountContext()
});
const { permissions } = await response.json();

if (permissions.manageUsers) {
  // Show user management features
}
```

### **Invite a User**
```javascript
const response = await fetch(`/api/user-management/accounts/${accountId}/invitations`, {
  ...withAccountContext({
    method: 'POST',
    body: JSON.stringify({
      invitedEmail: 'user@example.com',
      invitedName: 'John Doe',
      role: 'editor'
    })
  })
});
```

### **List Account Users**
```javascript
const response = await fetch(`/api/user-management/accounts/${accountId}/users`, {
  ...withAccountContext()
});
const { users } = await response.json();
```

## 🔒 Security Features

### **Access Control**
- All endpoints require authentication
- Account context validation on every request
- Permission checks before sensitive operations
- Users can't remove themselves from accounts

### **Invitation Security**
- Cryptographically secure tokens
- Time-based expiration (default: 7 days)
- One-time use tokens
- Invitation cancellation support

### **Audit Logging**
- User access tracking
- Action logging with context
- IP address and user agent capture
- Automatic last access updates

## 🎯 Integration with Existing External API

The system is designed to work with your existing user/organization API structure:

```javascript
// Your API structure
{
  results: [
    {
      id: "org-123",
      name: "My Organization",
      role: "admin",
      logo: { url: "..." }
    }
  ],
  pagination: { page: 1, totalPages: 10 }
}
```

The `externalUserService` maps this to internal user management while maintaining your existing user database as the source of truth.

## 📊 Dashboard Integration

Add user management to your admin dashboard:

```jsx
function AdminDashboard() {
  const { isGlobalAdmin, canManageUsers } = useAccount();
  
  return (
    <div>
      {isGlobalAdmin() && (
        <GlobalUserManagement />
      )}
      
      {canManageUsers() && (
        <AccountUserManagement />
      )}
    </div>
  );
}
```

## 🛠️ Customization

### **Custom Roles**
Modify the enum values in the database schema and update the permission calculation logic in `userManagementService.js`.

### **Custom Permissions**
Add new permissions to the `calculatePermissions` method and update the UI components accordingly.

### **Email Templates**
Integrate with your email service provider to send styled invitation emails.

---

## 🎉 Summary

This system provides enterprise-grade user management with:
- ✅ Multi-tenant architecture
- ✅ External API integration
- ✅ Role-based permissions
- ✅ Invitation workflow
- ✅ Comprehensive admin UI
- ✅ Security & audit logging
- ✅ Account-aware data isolation

Perfect for SaaS applications requiring sophisticated user management while maintaining integration with existing user systems! 

A comprehensive multi-tenant user management system that integrates with external user/organization services and provides account-level access control.

## 📋 Overview

This system provides:
- **External Integration**: Connects to your existing user/organization API
- **Internal Account Management**: Local user-to-account assignments with roles
- **Role-Based Access Control**: Granular permissions system
- **Invitation System**: Email-based account invitations
- **Admin Interface**: Comprehensive UI for user management

## 🏗️ Architecture

### **Database Schema**

#### Core Tables Created:
- `ssnews_account_users` - User assignments to specific accounts
- `ssnews_account_invitations` - Pending account invitations
- `ssnews_global_user_roles` - Global application roles (super admin, support)
- `ssnews_user_access_log` - User access tracking and audit logs

### **Services Layer**

#### External User Service (`src/services/externalUserService.js`)
Integrates with your external user/organization API:
```javascript
// Example usage
const organizations = await externalUserService.getUserOrganizations(userId, { authToken });
const user = await externalUserService.getUserById(userId, authToken);
```

#### Internal User Management Service (`src/services/userManagementService.js`)
Handles internal user assignments and permissions:
```javascript
// Example usage
const permissions = await userManagementService.getUserAccountPermissions(userId, accountId);
await userManagementService.assignUserToAccount({ accountId, userId, role: 'admin' });
```

### **API Routes**

All routes are mounted under `/api/user-management/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/permissions` | GET | Get current user's permissions |
| `/accounts/:accountId/users` | GET | List account users |
| `/accounts/:accountId/users` | POST | Assign user to account |
| `/accounts/:accountId/users/:userId` | DELETE | Remove user from account |
| `/accounts/:accountId/invitations` | POST | Create invitation |
| `/accounts/:accountId/invitations` | GET | List pending invitations |
| `/invitations/:invitationId` | DELETE | Cancel invitation |
| `/invitations/:token/accept` | POST | Accept invitation |
| `/search` | GET | Search users by email |
| `/global/roles` | POST | Grant global roles (super admin only) |

## 🔐 Permission System

### **Role Hierarchy**

#### Global Roles (Application-wide):
- **`super_admin`** - Full access to everything, can manage all organizations and accounts
- **`support`** - Read-only access to all data for support purposes
- **`billing_admin`** - Access to billing and subscription information

#### Account Roles (Account-specific):
- **`admin`** - Full access to account, can manage users, settings, all data
- **`editor`** - Can create, edit, and manage content, limited admin functions
- **`viewer`** - Read-only access to account data

### **Permission Matrix**

| Action | super_admin | support | billing_admin | account_admin | editor | viewer |
|--------|-------------|---------|---------------|---------------|--------|--------|
| Manage Organizations | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manage Global Users | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View All Accounts | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Account Users | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Invite Users | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Manage Content | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ |
| View Content | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Manage Sources | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ |
| View Analytics | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Manage Jobs | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ |

## 🎨 User Interface

### **AccountUserManagement Component**

Main interface located at `src/components/AccountUserManagement.jsx`:

#### Features:
- **Users Tab**: List current users with roles and last access times
- **Invite User Tab**: Send email invitations with role selection
- **Pending Invitations Tab**: Manage outstanding invitations
- **Permission-aware UI**: Shows/hides features based on user permissions
- **Real-time updates**: Refreshes data after actions

#### Usage:
```jsx
import AccountUserManagement from './components/AccountUserManagement';

function AdminPage() {
  return (
    <div>
      <AccountUserManagement />
    </div>
  );
}
```

### **Enhanced AccountContext**

Updated context with permission checking:

```jsx
const { 
  canManageUsers, 
  canInviteUsers, 
  hasPermission,
  getUserRole,
  isGlobalAdmin 
} = useAccount();

// Example usage
if (canManageUsers()) {
  // Show user management UI
}

if (hasPermission('manageContent')) {
  // Show content management options
}
```

## 🚀 Getting Started

### **1. Environment Configuration**

Add these environment variables for external API integration:
```env
EXTERNAL_USER_API_URL=https://api.your-service.com
EXTERNAL_USER_API_KEY=your-api-key
```

### **2. Grant Initial Super Admin Role**

```sql
INSERT INTO ssnews_global_user_roles (user_id, user_email, role, granted_by) 
VALUES ('your-firebase-uid', 'admin@yourcompany.com', 'super_admin', 'system');
```

### **3. Use the Components**

```jsx
// Add to your app routing
import AccountUserManagement from './components/AccountUserManagement';
import InvitationAcceptance from './components/InvitationAcceptance';

// In your router
<Route path="/admin/users" element={<AccountUserManagement />} />
<Route path="/invite/:token" element={<InvitationAcceptance />} />
```

## 📧 Invitation Flow

### **1. Admin sends invitation**
- Uses AccountUserManagement interface
- Specifies email, name, and role
- System generates secure token with expiration

### **2. User receives invitation**
- Email contains link: `/invite/{token}`
- Link loads InvitationAcceptance component

### **3. User accepts invitation**
- Must be logged in with Firebase Auth
- System validates token and assigns role
- User gains immediate access to account

## 🔧 API Usage Examples

### **Check User Permissions**
```javascript
const response = await fetch('/api/user-management/permissions', {
  ...withAccountContext()
});
const { permissions } = await response.json();

if (permissions.manageUsers) {
  // Show user management features
}
```

### **Invite a User**
```javascript
const response = await fetch(`/api/user-management/accounts/${accountId}/invitations`, {
  ...withAccountContext({
    method: 'POST',
    body: JSON.stringify({
      invitedEmail: 'user@example.com',
      invitedName: 'John Doe',
      role: 'editor'
    })
  })
});
```

### **List Account Users**
```javascript
const response = await fetch(`/api/user-management/accounts/${accountId}/users`, {
  ...withAccountContext()
});
const { users } = await response.json();
```

## 🔒 Security Features

### **Access Control**
- All endpoints require authentication
- Account context validation on every request
- Permission checks before sensitive operations
- Users can't remove themselves from accounts

### **Invitation Security**
- Cryptographically secure tokens
- Time-based expiration (default: 7 days)
- One-time use tokens
- Invitation cancellation support

### **Audit Logging**
- User access tracking
- Action logging with context
- IP address and user agent capture
- Automatic last access updates

## 🎯 Integration with Existing External API

The system is designed to work with your existing user/organization API structure:

```javascript
// Your API structure
{
  results: [
    {
      id: "org-123",
      name: "My Organization",
      role: "admin",
      logo: { url: "..." }
    }
  ],
  pagination: { page: 1, totalPages: 10 }
}
```

The `externalUserService` maps this to internal user management while maintaining your existing user database as the source of truth.

## 📊 Dashboard Integration

Add user management to your admin dashboard:

```jsx
function AdminDashboard() {
  const { isGlobalAdmin, canManageUsers } = useAccount();
  
  return (
    <div>
      {isGlobalAdmin() && (
        <GlobalUserManagement />
      )}
      
      {canManageUsers() && (
        <AccountUserManagement />
      )}
    </div>
  );
}
```

## 🛠️ Customization

### **Custom Roles**
Modify the enum values in the database schema and update the permission calculation logic in `userManagementService.js`.

### **Custom Permissions**
Add new permissions to the `calculatePermissions` method and update the UI components accordingly.

### **Email Templates**
Integrate with your email service provider to send styled invitation emails.

---

## 🎉 Summary

This system provides enterprise-grade user management with:
- ✅ Multi-tenant architecture
- ✅ External API integration
- ✅ Role-based permissions
- ✅ Invitation workflow
- ✅ Comprehensive admin UI
- ✅ Security & audit logging
- ✅ Account-aware data isolation

Perfect for SaaS applications requiring sophisticated user management while maintaining integration with existing user systems! 