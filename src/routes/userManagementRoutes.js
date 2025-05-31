/**
 * User Management API Routes
 * Handles user assignments, invitations, and permissions
 */

import express from 'express';
import userManagementService from '../services/userManagementService.js';
import externalUserService from '../services/externalUserService.js';
import { accountContext } from '../middleware/accountContext.js';

const router = express.Router();

/**
 * Get current user's permissions for current account
 */
router.get('/permissions', accountContext, async (req, res) => {
  try {
    const { currentUserId } = req;
    const { accountId } = req.accountContext;
    
    if (!currentUserId || !accountId) {
      return res.status(400).json({ error: 'User ID and account ID required' });
    }

    const permissions = await userManagementService.getUserAccountPermissions(currentUserId, accountId);
    
    res.json({
      success: true,
      permissions,
      userId: currentUserId,
      accountId
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * Get all users assigned to current account
 */
router.get('/accounts/:accountId/users', accountContext, async (req, res) => {
  try {
    const { accountId } = req.accountContext;
    const { currentUserId } = req;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has permission to manage users
    const permissions = await userManagementService.getUserAccountPermissions(currentUserId, accountId);
    if (!permissions.hasAccess || (!permissions.permissions.manageUsers && !permissions.permissions.viewAllAccounts)) {
      return res.status(403).json({ error: 'Insufficient permissions to view account users' });
    }

    const users = await userManagementService.getAccountUsers(accountId);
    
    res.json({
      success: true,
      users,
      accountId
    });
  } catch (error) {
    console.error('Error fetching account users:', error);
    res.status(500).json({ error: 'Failed to fetch account users' });
  }
});

/**
 * Assign user to current account
 */
router.post('/accounts/:accountId/users', accountContext, async (req, res) => {
  try {
    const { accountId } = req.accountContext;
    const { currentUserId } = req;
    const { userId, userEmail, userName, role } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!userId || !userEmail || !role) {
      return res.status(400).json({ error: 'User ID, email, and role are required' });
    }

    // Check if user has permission to manage users
    const permissions = await userManagementService.getUserAccountPermissions(currentUserId, accountId);
    if (!permissions.hasAccess || !permissions.permissions.manageUsers) {
      return res.status(403).json({ error: 'Insufficient permissions to assign users' });
    }

    // Validate role
    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, editor, or viewer' });
    }

    const result = await userManagementService.assignUserToAccount({
      accountId,
      userId,
      userEmail,
      userName,
      role,
      assignedBy: currentUserId
    });
    
    res.json({
      success: true,
      message: 'User assigned to account successfully',
      assignmentId: result.assignmentId
    });
  } catch (error) {
    console.error('Error assigning user to account:', error);
    res.status(500).json({ error: 'Failed to assign user to account' });
  }
});

/**
 * Remove user from current account
 */
router.delete('/accounts/:accountId/users/:userId', accountContext, async (req, res) => {
  try {
    const { accountId } = req.accountContext;
    const { currentUserId } = req;
    const { userId } = req.params;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has permission to manage users
    const permissions = await userManagementService.getUserAccountPermissions(currentUserId, accountId);
    if (!permissions.hasAccess || !permissions.permissions.manageUsers) {
      return res.status(403).json({ error: 'Insufficient permissions to remove users' });
    }

    // Prevent user from removing themselves
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot remove yourself from the account' });
    }

    await userManagementService.removeUserFromAccount(accountId, userId, currentUserId);
    
    res.json({
      success: true,
      message: 'User removed from account successfully'
    });
  } catch (error) {
    console.error('Error removing user from account:', error);
    res.status(500).json({ error: 'Failed to remove user from account' });
  }
});

/**
 * Create invitation to current account
 */
router.post('/accounts/:accountId/invitations', accountContext, async (req, res) => {
  try {
    const { accountId, organizationId } = req.accountContext;
    const { currentUserId, currentUserEmail } = req;
    const { invitedEmail, invitedName, role } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!invitedEmail || !role) {
      return res.status(400).json({ error: 'Invited email and role are required' });
    }

    // Check if user has permission to invite users
    const permissions = await userManagementService.getUserAccountPermissions(currentUserId, accountId);
    if (!permissions.hasAccess || !permissions.permissions.inviteUsers) {
      return res.status(403).json({ error: 'Insufficient permissions to invite users' });
    }

    // Validate role
    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, editor, or viewer' });
    }

    const result = await userManagementService.createAccountInvitation({
      accountId,
      organizationId,
      invitedEmail,
      invitedName,
      role,
      invitedBy: currentUserId,
      invitedByName: currentUserEmail || 'User'
    });
    
    // TODO: Send invitation email here
    console.log(`Invitation created for ${invitedEmail} with token: ${result.invitationToken}`);
    
    res.json({
      success: true,
      message: 'Invitation created successfully',
      invitationId: result.invitationId,
      invitationToken: result.invitationToken, // Remove this in production
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

/**
 * Get pending invitations for current account
 */
router.get('/accounts/:accountId/invitations', accountContext, async (req, res) => {
  try {
    const { accountId } = req.accountContext;
    const { currentUserId } = req;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has permission to manage users
    const permissions = await userManagementService.getUserAccountPermissions(currentUserId, accountId);
    if (!permissions.hasAccess || !permissions.permissions.manageUsers) {
      return res.status(403).json({ error: 'Insufficient permissions to view invitations' });
    }

    const invitations = await userManagementService.getAccountInvitations(accountId);
    
    res.json({
      success: true,
      invitations,
      accountId
    });
  } catch (error) {
    console.error('Error fetching account invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

/**
 * Cancel/revoke an invitation
 */
router.delete('/invitations/:invitationId', async (req, res) => {
  try {
    const { invitationId } = req.params;
    const currentUserId = req.headers['x-user-id'] || req.session?.userId;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await userManagementService.cancelInvitation(invitationId, currentUserId);
    
    res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

/**
 * Accept invitation (public endpoint with token)
 */
router.post('/invitations/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const currentUserId = req.headers['x-user-id'] || req.session?.userId;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await userManagementService.acceptInvitation(token, currentUserId);
    
    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      accountId: result.accountId,
      role: result.role
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: error.message || 'Failed to accept invitation' });
  }
});

/**
 * Search users from external service (simplified without firebase-admin)
 */
router.get('/search', async (req, res) => {
  try {
    const { email } = req.query;
    const currentUserId = req.headers['x-user-id'] || req.session?.userId;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email parameter required' });
    }

    // For now, return a simple response indicating the search functionality
    // This would need to be implemented based on your external user service requirements
    res.json({
      success: true,
      users: [],
      message: 'User search functionality to be implemented'
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * Global user management routes (super admin only)
 */

/**
 * Grant global role to user (super admin only)
 */
router.post('/global/roles', async (req, res) => {
  try {
    const currentUserId = req.headers['x-user-id'] || req.session?.userId;
    const { userId, userEmail, role } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!userId || !userEmail || !role) {
      return res.status(400).json({ error: 'User ID, email, and role are required' });
    }

    // Check if current user is super admin
    const currentUserPermissions = await userManagementService.getUserAccountPermissions(currentUserId, null);
    if (!currentUserPermissions.permissions?.manageGlobalUsers) {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    // Validate global role
    const validGlobalRoles = ['super_admin', 'support', 'billing_admin'];
    if (!validGlobalRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid global role' });
    }

    const result = await userManagementService.grantGlobalRole({
      userId,
      userEmail,
      role,
      grantedBy: currentUserId
    });
    
    res.json({
      success: true,
      message: 'Global role granted successfully',
      roleId: result.roleId
    });
  } catch (error) {
    console.error('Error granting global role:', error);
    res.status(500).json({ error: 'Failed to grant global role' });
  }
});

/**
 * Get external organizations for current user (simplified)
 */
router.get('/external/organizations', async (req, res) => {
  try {
    const currentUserId = req.headers['x-user-id'] || req.session?.userId;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // For now, return empty organizations
    // This would need to be implemented based on your external user service
    res.json({
      success: true,
      organizations: { results: [], pagination: {} },
      message: 'External organization integration to be implemented'
    });
  } catch (error) {
    console.error('Error fetching external organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

export default router; 