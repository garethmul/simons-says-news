import db from '../services/database.js';

/**
 * Middleware to extract and validate account context from requests
 * Expects accountId in one of these places:
 * 1. Request header: x-account-id
 * 2. Query parameter: accountId
 * 3. Session: req.session.accountId
 */
export const accountContext = async (req, res, next) => {
  try {
    // Extract accountId from various sources
    const accountId = req.headers['x-account-id'] || 
                      req.query.accountId || 
                      req.session?.accountId ||
                      req.body?.accountId;

    if (!accountId) {
      return res.status(400).json({ 
        error: 'Account context required',
        message: 'Please provide accountId in header (x-account-id), query parameter, or session'
      });
    }

    // Extract user information from headers/session
    const currentUserId = req.headers['x-user-id'] || req.session?.userId;
    const currentUserEmail = req.headers['x-user-email'] || req.session?.userEmail;

    // Validate account exists and is active
    const account = await db.findOne(
      'ssnews_accounts',
      'account_id = ? AND is_active = ?',
      [accountId, true]
    );

    if (!account) {
      return res.status(404).json({ 
        error: 'Invalid account',
        message: 'Account not found or inactive'
      });
    }

    // Get organization details
    const organization = await db.findOne(
      'ssnews_organizations',
      'organization_id = ? AND is_active = ?',
      [account.organization_id, true]
    );

    if (!organization) {
      return res.status(404).json({ 
        error: 'Invalid organization',
        message: 'Organization not found or inactive'
      });
    }

    // Check user has access to this account (if userId is available)
    if (currentUserId) {
      // Check organization access first
      const orgAccess = await db.findOne(
        'ssnews_user_organizations',
        'user_id = ? AND organization_id = ?',
        [currentUserId, organization.organization_id]
      );

      if (!orgAccess) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have access to this organization'
        });
      }

      // Check account-specific permissions (optional)
      const accountAccess = await db.findOne(
        'ssnews_user_accounts',
        'user_id = ? AND account_id = ?',
        [currentUserId, accountId]
      );

      // Attach user role to request
      req.userRole = accountAccess?.role || orgAccess.role;
    }

    // Attach user info to request for easy access
    req.currentUserId = currentUserId;
    req.currentUserEmail = currentUserEmail;

    // Attach account context to request
    req.accountContext = {
      accountId: account.account_id,
      accountName: account.name,
      accountSlug: account.slug,
      organizationId: organization.organization_id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      accountSettings: account.settings,
      organizationSettings: organization.settings
    };

    // Store in session if available
    if (req.session) {
      req.session.accountId = accountId;
    }

    next();
  } catch (error) {
    console.error('Account context middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to validate account context'
    });
  }
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'User role not found'
      });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Optional middleware - allows request to proceed without account context
 * but adds it if available
 */
export const optionalAccountContext = async (req, res, next) => {
  try {
    const accountId = req.headers['x-account-id'] || 
                      req.query.accountId || 
                      req.session?.accountId ||
                      req.body?.accountId;

    if (accountId) {
      const account = await db.findOne(
        'ssnews_accounts',
        'account_id = ? AND is_active = ?',
        [accountId, true]
      );

      if (account) {
        const organization = await db.findOne(
          'ssnews_organizations',
          'organization_id = ? AND is_active = ?',
          [account.organization_id, true]
        );

        if (organization) {
          req.accountContext = {
            accountId: account.account_id,
            accountName: account.name,
            accountSlug: account.slug,
            organizationId: organization.organization_id,
            organizationName: organization.name,
            organizationSlug: organization.slug,
            accountSettings: account.settings,
            organizationSettings: organization.settings
          };
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional account context error:', error);
    // Continue without account context
    next();
  }
};

/**
 * Helper function to add account filtering to database queries
 */
export const addAccountFilter = (query, accountId, tableAlias = '') => {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const accountCondition = `${prefix}account_id = ?`;
  
  if (query.toLowerCase().includes('where')) {
    return `${query} AND ${accountCondition}`;
  } else {
    return `${query} WHERE ${accountCondition}`;
  }
}; 