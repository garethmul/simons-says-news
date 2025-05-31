import express from 'express';
import organizationService from '../services/organizationService.js';
import { accountContext, requireRole } from '../middleware/accountContext.js';
import db from '../services/database.js';

const router = express.Router();

// Get user's organizations
router.get('/user/organizations', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    // Sync with external API if configured
    if (process.env.EXTERNAL_API_URL) {
      const userEmail = req.headers['x-user-email'] || req.session?.userEmail;
      await organizationService.syncUserOrganizations(userId, userEmail);
    }

    const organizations = await organizationService.getUserOrganizations(userId);
    
    res.json({
      success: true,
      organizations
    });
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get accounts within an organization
router.get('/organizations/:organizationId/accounts', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.session?.userId;
    const { organizationId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const accounts = await organizationService.getUserAccountsInOrganization(
      userId, 
      organizationId
    );
    
    res.json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('Error fetching organization accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new organization
router.post('/organizations', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.session?.userId;
    const userEmail = req.headers['x-user-email'] || req.session?.userEmail;
    const { name } = req.body;
    
    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Organization name required' });
    }

    const organizationId = await organizationService.createOrganization(
      name, 
      userId, 
      userEmail
    );
    
    res.status(201).json({
      success: true,
      organizationId,
      message: 'Organization created successfully'
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create new account within organization
router.post('/organizations/:organizationId/accounts', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.session?.userId;
    const { organizationId } = req.params;
    const { name } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Account name required' });
    }

    const accountId = await organizationService.createAccount(
      organizationId,
      name,
      userId
    );
    
    res.status(201).json({
      success: true,
      accountId,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(400).json({ error: error.message });
  }
});

// Add user to organization
router.post('/organizations/:organizationId/users', accountContext, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { userId, userEmail, role = 'member' } = req.body;
    
    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'User ID and email required' });
    }

    await organizationService.addUserToOrganization(
      userId,
      userEmail,
      organizationId,
      role
    );
    
    res.json({
      success: true,
      message: 'User added to organization successfully'
    });
  } catch (error) {
    console.error('Error adding user to organization:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update user role
router.put('/organizations/:organizationId/users/:userId/role', accountContext, requireRole(['owner']), async (req, res) => {
  try {
    const { organizationId, userId } = req.params;
    const { role } = req.body;
    const updatedByUserId = req.headers['x-user-id'] || req.session?.userId;
    
    if (!role) {
      return res.status(400).json({ error: 'New role required' });
    }

    await organizationService.updateUserRole(
      userId,
      organizationId,
      role,
      updatedByUserId
    );
    
    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(400).json({ error: error.message });
  }
});

// Remove user from organization
router.delete('/organizations/:organizationId/users/:userId', accountContext, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { organizationId, userId } = req.params;
    const removedByUserId = req.headers['x-user-id'] || req.session?.userId;
    
    await organizationService.removeUserFromOrganization(
      userId,
      organizationId,
      removedByUserId
    );
    
    res.json({
      success: true,
      message: 'User removed from organization successfully'
    });
  } catch (error) {
    console.error('Error removing user from organization:', error);
    res.status(400).json({ error: error.message });
  }
});

// Grant account access
router.post('/accounts/:accountId/users', accountContext, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { userId, role } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    await organizationService.grantAccountAccess(userId, accountId, role);
    
    res.json({
      success: true,
      message: 'Account access granted successfully'
    });
  } catch (error) {
    console.error('Error granting account access:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get organization statistics
router.get('/organizations/:organizationId/stats', accountContext, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    const stats = await organizationService.getOrganizationStats(organizationId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current account context
router.get('/account/context', accountContext, async (req, res) => {
  res.json({
    success: true,
    context: req.accountContext,
    userRole: req.userRole
  });
});

// Set default account for user session
router.post('/account/set-default', async (req, res) => {
  try {
    const { accountId } = req.body;
    const userId = req.headers['x-user-id'] || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    // Verify user has access to this account
    const account = await db.findOne('ssnews_accounts', 'account_id = ?', [accountId]);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const hasAccess = await db.findOne(
      'ssnews_user_organizations',
      'user_id = ? AND organization_id = ?',
      [userId, account.organization_id]
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this account' });
    }

    // Store in session
    if (req.session) {
      req.session.accountId = accountId;
    }

    res.json({
      success: true,
      message: 'Default account set successfully',
      accountId
    });
  } catch (error) {
    console.error('Error setting default account:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 