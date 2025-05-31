/**
 * API utility functions for making requests with account context
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Make an API request with proper headers and error handling
 * @param {string} url - The endpoint URL (relative to API base)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - The response data
 */
export async function apiRequest(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const config = {
    ...options,
    headers: defaultHeaders,
    credentials: 'include' // Include cookies for session
  };

  // Add body if present
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Make an authenticated API request with user context
 * @param {string} url - The endpoint URL
 * @param {Object} options - Fetch options
 * @param {Object} auth - Authentication context
 * @returns {Promise<any>} - The response data
 */
export async function authenticatedRequest(url, options = {}, auth = {}) {
  const headers = {
    ...options.headers
  };

  // Add user ID if available
  if (auth.userId) {
    headers['x-user-id'] = auth.userId;
  }

  // Add user email if available
  if (auth.userEmail) {
    headers['x-user-email'] = auth.userEmail;
  }

  return apiRequest(url, {
    ...options,
    headers
  });
}

/**
 * Helper to build query string from object
 * @param {Object} params - Query parameters
 * @returns {string} - Query string
 */
export function buildQueryString(params) {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
} 