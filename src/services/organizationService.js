import db from './database.js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class OrganizationService {
  /**
   * Get user's organizations from external API
   */
  async getUserOrganizationsFromAPI(userId) {
    try {
      const apiUrl = process.env.EXTERNAL_API_URL || 'https://api.example.com';
      const response = await axios.get(`${apiUrl}/getV1UserByIdOrganisations`, {
        params: { userId },
        headers: {
          'Authorization': `Bearer ${process.env.EXTERNAL_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data.organizations || [];
    } catch (error) {
      console.error('Failed to fetch organizations from external API:', error.message);
      return [];
    }
  }

  /**
   * Sync user's organizations from external API with local database
   */
  async syncUserOrganizations(userId, userEmail) {
    try {
      // Get organizations from external API
      const externalOrgs = await this.getUserOrganizationsFromAPI(userId);
      
      for (const extOrg of externalOrgs) {
        // Check if organization exists
        let org = await db.findOne(
          'ssnews_organizations',
          'slug = ?',
          [extOrg.slug || this.generateSlug(extOrg.name)]
        );

        // Create organization if it doesn't exist
        if (!org) {
          const orgId = await db.insert('ssnews_organizations', {
            name: extOrg.name,
            slug: extOrg.slug || this.generateSlug(extOrg.name),
            is_active: true,
            settings: JSON.stringify(extOrg.settings || {})
          });

          org = { organization_id: orgId };
        }

        // Check if user-organization association exists
        const userOrg = await db.findOne(
          'ssnews_user_organizations',
          'user_id = ? AND organization_id = ?',
          [userId, org.organization_id]
        );

        // Create association if it doesn't exist
        if (!userOrg) {
          await db.insert('ssnews_user_organizations', {
            user_id: userId,
            user_email: userEmail,
            organization_id: org.organization_id,
            role: extOrg.role || 'member'
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to sync user organizations:', error);
      return false;
    }
  }

  /**
   * Get all organizations a user has access to
   */
  async getUserOrganizations(userId) {
    const query = `
      SELECT 
        o.*,
        uo.role as user_role,
        uo.created_at as joined_at
      FROM ssnews_organizations o
      JOIN ssnews_user_organizations uo ON o.organization_id = uo.organization_id
      WHERE uo.user_id = ? AND o.is_active = ?
      ORDER BY o.name
    `;
    
    return await db.query(query, [userId, true]);
  }

  /**
   * Get all accounts within an organization that a user has access to
   */
  async getUserAccountsInOrganization(userId, organizationId) {
    const query = `
      SELECT 
        a.*,
        COALESCE(ua.role, uo.role) as user_role,
        ua.permissions as account_permissions
      FROM ssnews_accounts a
      JOIN ssnews_user_organizations uo ON a.organization_id = uo.organization_id
      LEFT JOIN ssnews_user_accounts ua ON a.account_id = ua.account_id AND ua.user_id = ?
      WHERE uo.user_id = ? 
        AND a.organization_id = ? 
        AND a.is_active = ?
        AND uo.organization_id = ?
      ORDER BY a.name
    `;
    
    return await db.query(query, [userId, userId, organizationId, true, organizationId]);
  }

  /**
   * Create a new organization
   */
  async createOrganization(name, createdByUserId, userEmail) {
    const slug = this.generateSlug(name);
    const organizationId = uuidv4(); // Generate UUID for organization_id
    
    // Check if slug already exists
    const existing = await db.findOne('ssnews_organizations', 'slug = ?', [slug]);
    if (existing) {
      throw new Error('Organization with this name already exists');
    }

    // Create organization
    await db.insert('ssnews_organizations', {
      organization_id: organizationId,
      name,
      slug,
      is_active: true
    });

    // Add creator as owner
    const userOrgId = uuidv4(); // Generate UUID for user_org_id
    await db.insert('ssnews_user_organizations', {
      user_org_id: userOrgId,
      user_id: createdByUserId,
      user_email: userEmail,
      organization_id: organizationId,
      role: 'owner'
    });

    // Create default account
    await this.createAccount(organizationId, 'Main Account', createdByUserId);

    return organizationId;
  }

  /**
   * Create a new account within an organization
   */
  async createAccount(organizationId, name, createdByUserId) {
    const slug = this.generateSlug(name);
    const accountId = uuidv4(); // Generate UUID for account_id
    
    // Check if slug already exists in this organization
    const existing = await db.findOne(
      'ssnews_accounts', 
      'organization_id = ? AND slug = ?', 
      [organizationId, slug]
    );
    
    if (existing) {
      throw new Error('Account with this name already exists in the organization');
    }

    // Verify user has permission to create accounts
    if (createdByUserId) {
      const userOrg = await db.findOne(
        'ssnews_user_organizations',
        'user_id = ? AND organization_id = ?',
        [createdByUserId, organizationId]
      );

      if (!userOrg || !['owner', 'admin'].includes(userOrg.role)) {
        throw new Error('You do not have permission to create accounts in this organization');
      }
    }

    // Create account
    await db.insert('ssnews_accounts', {
      account_id: accountId,
      organization_id: organizationId,
      name,
      slug,
      is_active: true
    });

    return accountId;
  }

  /**
   * Add a user to an organization
   */
  async addUserToOrganization(userId, userEmail, organizationId, role = 'member') {
    // Check if association already exists
    const existing = await db.findOne(
      'ssnews_user_organizations',
      'user_id = ? AND organization_id = ?',
      [userId, organizationId]
    );

    if (existing) {
      throw new Error('User is already a member of this organization');
    }

    const userOrgId = uuidv4(); // Generate UUID for user_org_id
    await db.insert('ssnews_user_organizations', {
      user_org_id: userOrgId,
      user_id: userId,
      user_email: userEmail,
      organization_id: organizationId,
      role
    });
  }

  /**
   * Grant user access to specific account
   */
  async grantAccountAccess(userId, accountId, role = null) {
    // Verify account exists
    const account = await db.findOne('ssnews_accounts', 'account_id = ?', [accountId]);
    if (!account) {
      throw new Error('Account not found');
    }

    // Check if user has organization access
    const orgAccess = await db.findOne(
      'ssnews_user_organizations',
      'user_id = ? AND organization_id = ?',
      [userId, account.organization_id]
    );

    if (!orgAccess) {
      throw new Error('User must be a member of the organization first');
    }

    // Check if specific account access already exists
    const existing = await db.findOne(
      'ssnews_user_accounts',
      'user_id = ? AND account_id = ?',
      [userId, accountId]
    );

    if (existing) {
      // Update role if provided
      if (role) {
        await db.update(
          'ssnews_user_accounts',
          { role },
          'user_account_id = ?',
          [existing.user_account_id]
        );
      }
    } else {
      // Create new account access
      const userAccountId = uuidv4(); // Generate UUID for user_account_id
      await db.insert('ssnews_user_accounts', {
        user_account_id: userAccountId,
        user_id: userId,
        account_id: accountId,
        role
      });
    }
  }

  /**
   * Update user role in organization
   */
  async updateUserRole(userId, organizationId, newRole, updatedByUserId) {
    // Verify updater has permission
    const updaterOrg = await db.findOne(
      'ssnews_user_organizations',
      'user_id = ? AND organization_id = ?',
      [updatedByUserId, organizationId]
    );

    if (!updaterOrg || updaterOrg.role !== 'owner') {
      throw new Error('Only owners can update user roles');
    }

    // Prevent removing the last owner
    if (newRole !== 'owner') {
      const ownerCount = await db.query(
        'SELECT COUNT(*) as count FROM ssnews_user_organizations WHERE organization_id = ? AND role = ?',
        [organizationId, 'owner']
      );

      if (ownerCount[0].count === 1) {
        const currentUser = await db.findOne(
          'ssnews_user_organizations',
          'user_id = ? AND organization_id = ?',
          [userId, organizationId]
        );

        if (currentUser && currentUser.role === 'owner') {
          throw new Error('Cannot remove the last owner from the organization');
        }
      }
    }

    // Update role
    await db.update(
      'ssnews_user_organizations',
      { role: newRole },
      'user_id = ? AND organization_id = ?',
      [userId, organizationId]
    );
  }

  /**
   * Remove user from organization
   */
  async removeUserFromOrganization(userId, organizationId, removedByUserId) {
    // Verify remover has permission
    const removerOrg = await db.findOne(
      'ssnews_user_organizations',
      'user_id = ? AND organization_id = ?',
      [removedByUserId, organizationId]
    );

    if (!removerOrg || !['owner', 'admin'].includes(removerOrg.role)) {
      throw new Error('You do not have permission to remove users');
    }

    // Prevent removing the last owner
    const userToRemove = await db.findOne(
      'ssnews_user_organizations',
      'user_id = ? AND organization_id = ?',
      [userId, organizationId]
    );

    if (userToRemove && userToRemove.role === 'owner') {
      const ownerCount = await db.query(
        'SELECT COUNT(*) as count FROM ssnews_user_organizations WHERE organization_id = ? AND role = ?',
        [organizationId, 'owner']
      );

      if (ownerCount[0].count === 1) {
        throw new Error('Cannot remove the last owner from the organization');
      }
    }

    // Remove from organization
    await db.query(
      'DELETE FROM ssnews_user_organizations WHERE user_id = ? AND organization_id = ?',
      [userId, organizationId]
    );

    // Remove from all accounts in the organization
    await db.query(
      'DELETE ua FROM ssnews_user_accounts ua JOIN ssnews_accounts a ON ua.account_id = a.account_id WHERE ua.user_id = ? AND a.organization_id = ?',
      [userId, organizationId]
    );
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId) {
    const stats = {};

    // User count
    const userCount = await db.query(
      'SELECT COUNT(*) as count FROM ssnews_user_organizations WHERE organization_id = ?',
      [organizationId]
    );
    stats.userCount = userCount[0].count;

    // Account count
    const accountCount = await db.query(
      'SELECT COUNT(*) as count FROM ssnews_accounts WHERE organization_id = ?',
      [organizationId]
    );
    stats.accountCount = accountCount[0].count;

    // Content statistics per account
    const contentStats = await db.query(`
      SELECT 
        a.account_id,
        a.name as account_name,
        COUNT(DISTINCT ga.gen_article_id) as article_count,
        COUNT(DISTINCT ns.source_id) as source_count,
        COUNT(DISTINCT pt.template_id) as template_count
      FROM ssnews_accounts a
      LEFT JOIN ssnews_generated_articles ga ON a.account_id = ga.account_id
      LEFT JOIN ssnews_news_sources ns ON a.account_id = ns.account_id
      LEFT JOIN ssnews_prompt_templates pt ON a.account_id = pt.account_id
      WHERE a.organization_id = ?
      GROUP BY a.account_id, a.name
    `, [organizationId]);

    stats.accounts = contentStats;

    return stats;
  }

  /**
   * Generate URL-friendly slug from name
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

export default new OrganizationService(); 