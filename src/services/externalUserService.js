/**
 * External User Service
 * Integrates with external user/organization management API
 */

class ExternalUserService {
  constructor() {
    this.baseUrl = process.env.EXTERNAL_USER_API_URL || 'https://api.your-service.com';
    this.apiKey = process.env.EXTERNAL_USER_API_KEY;
  }

  /**
   * Get organizations for a user from external service
   * @param {string} userId - External user ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Organizations data with pagination
   */
  async getUserOrganizations(userId, params = {}) {
    try {
      const queryParams = new URLSearchParams({
        sortBy: params.sortBy || 'last-assigned',
        pageSize: params.pageSize || 50,
        page: params.page || 1,
        ...(params.role && { role: params.role }),
        ...(params.type && { type: params.type })
      });

      const response = await fetch(`${this.baseUrl}/v1/user/${userId}/organisations?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${params.authToken}`,
          'API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          ...(params.deviceId && { 'device-id': params.deviceId })
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`External API Error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data || null;
    } catch (error) {
      console.error('Error fetching user organizations from external service:', error);
      throw error;
    }
  }

  /**
   * Get user details from external service
   * @param {string} userId - External user ID
   * @param {string} authToken - Authorization token
   * @returns {Promise<Object>} User data
   */
  async getUserById(userId, authToken) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`External API Error: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user from external service:', error);
      throw error;
    }
  }

  /**
   * Search users by email in external service
   * @param {string} email - Email to search for
   * @param {string} authToken - Authorization token
   * @returns {Promise<Object>} User search results
   */
  async searchUserByEmail(email, authToken) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/users/search?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`External API Error: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching user by email:', error);
      throw error;
    }
  }

  /**
   * Validate if user has access to an organization
   * @param {string} userId - External user ID
   * @param {string} organizationId - Organization ID
   * @param {string} authToken - Authorization token
   * @returns {Promise<boolean>} Whether user has access
   */
  async validateUserOrganizationAccess(userId, organizationId, authToken) {
    try {
      const organizations = await this.getUserOrganizations(userId, { authToken });
      
      if (!organizations || !organizations.results) {
        return false;
      }

      return organizations.results.some(org => org.id === organizationId);
    } catch (error) {
      console.error('Error validating user organization access:', error);
      return false;
    }
  }

  /**
   * Get organization details from external service
   * @param {string} organizationId - Organization ID
   * @param {string} authToken - Authorization token
   * @returns {Promise<Object>} Organization data
   */
  async getOrganizationById(organizationId, authToken) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/organisation/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`External API Error: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching organization from external service:', error);
      throw error;
    }
  }
}

// Create singleton instance
const externalUserService = new ExternalUserService();

export default externalUserService; 