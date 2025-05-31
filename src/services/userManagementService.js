/**
 * Internal User Management Service
 * Handles user assignments, permissions, and invitations within this app
 */

import db from './database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

class UserManagementService {
  
  /**
   * Get all users assigned to an account
   * @param {string} accountId - Account ID
   * @returns {Promise<Array>} Array of user assignments
   */
  async getAccountUsers(accountId) {
    try {
      const query = `
        SELECT 
          au.*,
          gur.role as global_role
        FROM ssnews_account_users au
        LEFT JOIN ssnews_global_user_roles gur ON au.user_id = gur.user_id AND gur.is_active = true
        WHERE au.account_id = ? AND au.is_active = true
        ORDER BY au.assigned_at DESC
      `;
      
      const users = await db.query(query, [accountId]);
      return users;
    } catch (error) {
      console.error('Error fetching account users:', error);
      throw error;
    }
  }

  /**
   * Get user's permissions for a specific account
   * @param {string} userId - User ID
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} User permissions object
   */
  async getUserAccountPermissions(userId, accountId) {
    try {
      const query = `
        SELECT 
          au.role as account_role,
          au.is_active as account_active,
          gur.role as global_role,
          gur.is_active as global_active
        FROM ssnews_account_users au
        LEFT JOIN ssnews_global_user_roles gur ON au.user_id = gur.user_id
        WHERE au.user_id = ? AND au.account_id = ?
      `;
      
      const results = await db.query(query, [userId, accountId]);
      
      if (results.length === 0) {
        return { hasAccess: false };
      }

      const user = results[0];
      
      return {
        hasAccess: user.account_active || user.global_active,
        accountRole: user.account_role,
        globalRole: user.global_role,
        permissions: this.calculatePermissions(user.account_role, user.global_role)
      };
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  }

  /**
   * Calculate user permissions based on roles
   * @param {string} accountRole - Account-level role
   * @param {string} globalRole - Global role
   * @returns {Object} Permissions object
   */
  calculatePermissions(accountRole, globalRole) {
    const permissions = {
      // Content permissions
      viewContent: false,
      manageContent: false,
      
      // User management
      manageUsers: false,
      inviteUsers: false,
      
      // Sources and jobs
      manageSources: false,
      manageJobs: false,
      
      // Analytics
      viewAnalytics: false,
      
      // Global permissions
      manageOrganizations: false,
      manageGlobalUsers: false,
      viewAllAccounts: false
    };

    // Global role permissions (override account permissions)
    if (globalRole === 'super_admin') {
      Object.keys(permissions).forEach(key => permissions[key] = true);
      return permissions;
    }
    
    if (globalRole === 'support') {
      permissions.viewContent = true;
      permissions.viewAnalytics = true;
      permissions.viewAllAccounts = true;
      return permissions;
    }

    // Account role permissions
    switch (accountRole) {
      case 'admin':
        permissions.viewContent = true;
        permissions.manageContent = true;
        permissions.manageUsers = true;
        permissions.inviteUsers = true;
        permissions.manageSources = true;
        permissions.manageJobs = true;
        permissions.viewAnalytics = true;
        break;
        
      case 'editor':
        permissions.viewContent = true;
        permissions.manageContent = true;
        permissions.manageSources = true;
        permissions.manageJobs = true;
        permissions.viewAnalytics = true;
        break;
        
      case 'viewer':
        permissions.viewContent = true;
        permissions.viewAnalytics = true;
        break;
    }

    return permissions;
  }

  /**
   * Assign user to account with role
   * @param {Object} assignment - Assignment details
   * @returns {Promise<Object>} Assignment result
   */
  async assignUserToAccount({ accountId, userId, userEmail, userName, role, assignedBy }) {
    try {
      const assignmentId = uuidv4();
      
      const query = `
        INSERT INTO ssnews_account_users 
        (assignment_id, account_id, user_id, user_email, user_name, role, assigned_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        role = VALUES(role),
        assigned_by = VALUES(assigned_by),
        assigned_at = CURRENT_TIMESTAMP,
        is_active = true
      `;
      
      await db.query(query, [assignmentId, accountId, userId, userEmail, userName, role, assignedBy]);
      
      // Log the assignment
      await this.logUserAccess({
        userId: assignedBy,
        accountId,
        action: 'user_assigned',
        details: { assignedUser: userId, role }
      });
      
      return { success: true, assignmentId };
    } catch (error) {
      console.error('Error assigning user to account:', error);
      throw error;
    }
  }

  /**
   * Remove user from account
   * @param {string} accountId - Account ID
   * @param {string} userId - User ID to remove
   * @param {string} removedBy - User ID who performed the removal
   * @returns {Promise<Object>} Removal result
   */
  async removeUserFromAccount(accountId, userId, removedBy) {
    try {
      const query = `
        UPDATE ssnews_account_users 
        SET is_active = false 
        WHERE account_id = ? AND user_id = ?
      `;
      
      const result = await db.query(query, [accountId, userId]);
      
      if (result.affectedRows === 0) {
        throw new Error('User not found in account');
      }
      
      // Log the removal
      await this.logUserAccess({
        userId: removedBy,
        accountId,
        action: 'user_removed',
        details: { removedUser: userId }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error removing user from account:', error);
      throw error;
    }
  }

  /**
   * Create invitation to account
   * @param {Object} invitation - Invitation details
   * @returns {Promise<Object>} Invitation result with token
   */
  async createAccountInvitation({ accountId, organizationId, invitedEmail, invitedName, role, invitedBy, invitedByName, expiresInHours = 168 }) {
    try {
      const invitationId = uuidv4();
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
      
      const query = `
        INSERT INTO ssnews_account_invitations 
        (invitation_id, account_id, organization_id, invited_email, invited_name, role, invited_by, invited_by_name, invitation_token, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await db.query(query, [
        invitationId, accountId, organizationId, invitedEmail, invitedName, 
        role, invitedBy, invitedByName, invitationToken, expiresAt
      ]);
      
      return { 
        success: true, 
        invitationId, 
        invitationToken,
        expiresAt 
      };
    } catch (error) {
      console.error('Error creating account invitation:', error);
      throw error;
    }
  }

  /**
   * Get pending invitations for an account
   * @param {string} accountId - Account ID
   * @returns {Promise<Array>} Array of pending invitations
   */
  async getAccountInvitations(accountId) {
    try {
      const query = `
        SELECT * FROM ssnews_account_invitations 
        WHERE account_id = ? AND status = 'pending' AND expires_at > NOW()
        ORDER BY created_at DESC
      `;
      
      const invitations = await db.query(query, [accountId]);
      return invitations;
    } catch (error) {
      console.error('Error fetching account invitations:', error);
      throw error;
    }
  }

  /**
   * Accept invitation and assign user to account
   * @param {string} invitationToken - Invitation token
   * @param {string} userId - User ID accepting the invitation
   * @returns {Promise<Object>} Acceptance result
   */
  async acceptInvitation(invitationToken, userId) {
    try {
      // Get invitation details
      const invitations = await db.query(
        'SELECT * FROM ssnews_account_invitations WHERE invitation_token = ? AND status = "pending" AND expires_at > NOW()',
        [invitationToken]
      );
      
      if (invitations.length === 0) {
        throw new Error('Invalid or expired invitation');
      }
      
      const invitation = invitations[0];
      
      // Update invitation status
      await db.query(
        'UPDATE ssnews_account_invitations SET status = "accepted", accepted_at = NOW(), accepted_by = ? WHERE invitation_id = ?',
        [userId, invitation.invitation_id]
      );
      
      // Assign user to account
      const assignmentId = uuidv4();
      await db.query(
        `INSERT INTO ssnews_account_users 
        (assignment_id, account_id, user_id, user_email, user_name, role, assigned_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        role = VALUES(role),
        assigned_by = VALUES(assigned_by),
        assigned_at = CURRENT_TIMESTAMP,
        is_active = true`,
        [assignmentId, invitation.account_id, userId, invitation.invited_email, invitation.invited_name, invitation.role, invitation.invited_by]
      );
      
      return { 
        success: true, 
        accountId: invitation.account_id,
        role: invitation.role 
      };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Cancel/revoke an invitation
   * @param {string} invitationId - Invitation ID
   * @param {string} cancelledBy - User ID who cancelled
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelInvitation(invitationId, cancelledBy) {
    try {
      const query = `
        UPDATE ssnews_account_invitations 
        SET status = 'cancelled' 
        WHERE invitation_id = ? AND status = 'pending'
      `;
      
      const result = await db.query(query, [invitationId]);
      
      if (result.affectedRows === 0) {
        throw new Error('Invitation not found or already processed');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      throw error;
    }
  }

  /**
   * Grant global role to user
   * @param {Object} roleGrant - Role grant details
   * @returns {Promise<Object>} Grant result
   */
  async grantGlobalRole({ userId, userEmail, role, grantedBy }) {
    try {
      const roleId = uuidv4();
      
      const query = `
        INSERT INTO ssnews_global_user_roles 
        (role_id, user_id, user_email, role, granted_by)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        role = VALUES(role),
        granted_by = VALUES(granted_by),
        granted_at = CURRENT_TIMESTAMP,
        is_active = true
      `;
      
      await db.query(query, [roleId, userId, userEmail, role, grantedBy]);
      
      return { success: true, roleId };
    } catch (error) {
      console.error('Error granting global role:', error);
      throw error;
    }
  }

  /**
   * Log user access/action
   * @param {Object} logEntry - Log entry details
   * @returns {Promise<Object>} Log result
   */
  async logUserAccess({ userId, userEmail, organizationId, accountId, action, ipAddress, userAgent, details = {} }) {
    try {
      const logId = uuidv4();
      
      const query = `
        INSERT INTO ssnews_user_access_log 
        (log_id, user_id, user_email, organization_id, account_id, action, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await db.query(query, [logId, userId, userEmail, organizationId, accountId, action, ipAddress, userAgent]);
      
      return { success: true, logId };
    } catch (error) {
      console.error('Error logging user access:', error);
      // Don't throw - logging failures shouldn't break operations
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user's last access time
   * @param {string} userId - User ID
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Update result
   */
  async updateUserLastAccess(userId, accountId) {
    try {
      const query = `
        UPDATE ssnews_account_users 
        SET last_access = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND account_id = ?
      `;
      
      await db.query(query, [userId, accountId]);
      return { success: true };
    } catch (error) {
      console.error('Error updating user last access:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const userManagementService = new UserManagementService();

export default userManagementService; 