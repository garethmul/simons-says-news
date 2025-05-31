-- Account User Management Schema
-- This extends the existing multi-tenant system with user management capabilities

-- Table for user assignments to specific accounts (internal to this app)
CREATE TABLE IF NOT EXISTS ssnews_account_users (
  assignment_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(50) NOT NULL, -- External user ID from your user service
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
  assigned_by VARCHAR(50), -- User ID who assigned this user
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_access TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_account (user_id, account_id),
  INDEX idx_account_users (account_id),
  INDEX idx_user_assignments (user_id),
  INDEX idx_user_email (user_email)
);

-- Table for pending invitations to accounts
CREATE TABLE IF NOT EXISTS ssnews_account_invitations (
  invitation_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  invited_email VARCHAR(255) NOT NULL,
  invited_name VARCHAR(255),
  role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
  invited_by VARCHAR(50) NOT NULL, -- User ID who sent the invitation
  invited_by_name VARCHAR(255),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  accepted_by VARCHAR(50) NULL, -- User ID who accepted (might be different if email forwarded)
  status ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
  
  FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES ssnews_organizations(organization_id) ON DELETE CASCADE,
  INDEX idx_invitation_token (invitation_token),
  INDEX idx_invitation_email (invited_email),
  INDEX idx_invitation_account (account_id),
  INDEX idx_invitation_status (status)
);

-- Table for global app roles (super admin, support, etc.)
CREATE TABLE IF NOT EXISTS ssnews_global_user_roles (
  role_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(50) NOT NULL UNIQUE, -- External user ID
  user_email VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'support', 'billing_admin') NOT NULL,
  granted_by VARCHAR(50) NOT NULL, -- User ID who granted this role
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  INDEX idx_global_user (user_id),
  INDEX idx_global_role (role)
);

-- Table for tracking user access patterns
CREATE TABLE IF NOT EXISTS ssnews_user_access_log (
  log_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(50) NOT NULL,
  user_email VARCHAR(255),
  organization_id VARCHAR(36),
  account_id VARCHAR(36),
  action VARCHAR(100) NOT NULL, -- 'login', 'account_switch', 'data_access', etc.
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_access (user_id),
  INDEX idx_access_account (account_id),
  INDEX idx_access_time (created_at)
);

-- Add some sample data for development
-- INSERT INTO ssnews_global_user_roles (user_id, user_email, role, granted_by) 
-- VALUES ('sf5O3OhTfMQyUMEktGwbAtsxSc73', 'gareth.mulholland@eden.co.uk', 'super_admin', 'system');

-- Role definitions and permissions
/*
ROLE DEFINITIONS:

Global Roles:
- super_admin: Full access to everything, can manage all organizations and accounts
- support: Read-only access to all data for support purposes  
- billing_admin: Access to billing and subscription information

Account Roles:
- admin: Full access to account, can manage users, settings, all data
- editor: Can create, edit, and manage content, limited admin functions
- viewer: Read-only access to account data

Permission Matrix:
                     super_admin  support  billing_admin  account_admin  editor  viewer
Manage Organizations      ✓         ✗         ✗            ✗           ✗       ✗
Manage Global Users       ✓         ✗         ✗            ✗           ✗       ✗  
View All Accounts         ✓         ✓         ✗            ✗           ✗       ✗
Manage Account Users      ✓         ✗         ✗            ✓           ✗       ✗
Invite Users              ✓         ✗         ✗            ✓           ✗       ✗
Manage Content            ✓         ✗         ✗            ✓           ✓       ✗
View Content              ✓         ✓         ✗            ✓           ✓       ✓
Manage Sources            ✓         ✗         ✗            ✓           ✓       ✗
View Analytics            ✓         ✓         ✗            ✓           ✓       ✓
Manage Jobs               ✓         ✗         ✗            ✓           ✓       ✗
View Jobs                 ✓         ✓         ✗            ✓           ✓       ✓
Manage Prompts            ✓         ✗         ✗            ✓           ✓       ✗
*/ 
-- This extends the existing multi-tenant system with user management capabilities

-- Table for user assignments to specific accounts (internal to this app)
CREATE TABLE IF NOT EXISTS ssnews_account_users (
  assignment_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(50) NOT NULL, -- External user ID from your user service
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
  assigned_by VARCHAR(50), -- User ID who assigned this user
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_access TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_account (user_id, account_id),
  INDEX idx_account_users (account_id),
  INDEX idx_user_assignments (user_id),
  INDEX idx_user_email (user_email)
);

-- Table for pending invitations to accounts
CREATE TABLE IF NOT EXISTS ssnews_account_invitations (
  invitation_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  invited_email VARCHAR(255) NOT NULL,
  invited_name VARCHAR(255),
  role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
  invited_by VARCHAR(50) NOT NULL, -- User ID who sent the invitation
  invited_by_name VARCHAR(255),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  accepted_by VARCHAR(50) NULL, -- User ID who accepted (might be different if email forwarded)
  status ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
  
  FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES ssnews_organizations(organization_id) ON DELETE CASCADE,
  INDEX idx_invitation_token (invitation_token),
  INDEX idx_invitation_email (invited_email),
  INDEX idx_invitation_account (account_id),
  INDEX idx_invitation_status (status)
);

-- Table for global app roles (super admin, support, etc.)
CREATE TABLE IF NOT EXISTS ssnews_global_user_roles (
  role_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(50) NOT NULL UNIQUE, -- External user ID
  user_email VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'support', 'billing_admin') NOT NULL,
  granted_by VARCHAR(50) NOT NULL, -- User ID who granted this role
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  INDEX idx_global_user (user_id),
  INDEX idx_global_role (role)
);

-- Table for tracking user access patterns
CREATE TABLE IF NOT EXISTS ssnews_user_access_log (
  log_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(50) NOT NULL,
  user_email VARCHAR(255),
  organization_id VARCHAR(36),
  account_id VARCHAR(36),
  action VARCHAR(100) NOT NULL, -- 'login', 'account_switch', 'data_access', etc.
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_access (user_id),
  INDEX idx_access_account (account_id),
  INDEX idx_access_time (created_at)
);

-- Add some sample data for development
-- INSERT INTO ssnews_global_user_roles (user_id, user_email, role, granted_by) 
-- VALUES ('sf5O3OhTfMQyUMEktGwbAtsxSc73', 'gareth.mulholland@eden.co.uk', 'super_admin', 'system');

-- Role definitions and permissions
/*
ROLE DEFINITIONS:

Global Roles:
- super_admin: Full access to everything, can manage all organizations and accounts
- support: Read-only access to all data for support purposes  
- billing_admin: Access to billing and subscription information

Account Roles:
- admin: Full access to account, can manage users, settings, all data
- editor: Can create, edit, and manage content, limited admin functions
- viewer: Read-only access to account data

Permission Matrix:
                     super_admin  support  billing_admin  account_admin  editor  viewer
Manage Organizations      ✓         ✗         ✗            ✗           ✗       ✗
Manage Global Users       ✓         ✗         ✗            ✗           ✗       ✗  
View All Accounts         ✓         ✓         ✗            ✗           ✗       ✗
Manage Account Users      ✓         ✗         ✗            ✓           ✗       ✗
Invite Users              ✓         ✗         ✗            ✓           ✗       ✗
Manage Content            ✓         ✗         ✗            ✓           ✓       ✗
View Content              ✓         ✓         ✗            ✓           ✓       ✓
Manage Sources            ✓         ✗         ✗            ✓           ✓       ✗
View Analytics            ✓         ✓         ✗            ✓           ✓       ✓
Manage Jobs               ✓         ✗         ✗            ✓           ✓       ✗
View Jobs                 ✓         ✓         ✗            ✓           ✓       ✓
Manage Prompts            ✓         ✗         ✗            ✓           ✓       ✗
*/ 