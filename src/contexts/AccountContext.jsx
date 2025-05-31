import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from '../utils/api';

const AccountContext = createContext({});

export const useAccount = () => useContext(AccountContext);

export const AccountProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountContext, setAccountContext] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Load user's organizations
  useEffect(() => {
    if (currentUser) {
      loadUserOrganizations();
    } else {
      setOrganizations([]);
      setSelectedOrganization(null);
      setAccounts([]);
      setSelectedAccount(null);
      setUserPermissions({});
      setLoading(false);
    }
  }, [currentUser]);

  // Load accounts when organization changes
  useEffect(() => {
    if (selectedOrganization) {
      loadOrganizationAccounts(selectedOrganization.organization_id);
    } else {
      setAccounts([]);
      setSelectedAccount(null);
    }
  }, [selectedOrganization]);

  // Update account context and load permissions when account changes
  useEffect(() => {
    if (selectedAccount) {
      updateAccountContext(selectedAccount.account_id);
      loadUserPermissions(selectedAccount.account_id);
    } else {
      setAccountContext(null);
      setUserPermissions({});
    }
  }, [selectedAccount]);

  const loadUserOrganizations = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/user/organizations', {
        headers: {
          'x-user-id': currentUser.uid,
          'x-user-email': currentUser.email
        }
      });

      if (response.organizations && response.organizations.length > 0) {
        setOrganizations(response.organizations);
        
        // Load last selected organization from localStorage
        const lastOrgId = localStorage.getItem('lastSelectedOrganizationId');
        const lastOrg = response.organizations.find(org => 
          org.organization_id === lastOrgId
        );
        
        if (lastOrg) {
          setSelectedOrganization(lastOrg);
        } else {
          // Select first organization by default
          setSelectedOrganization(response.organizations[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationAccounts = async (organizationId) => {
    try {
      const response = await apiRequest(`/api/organizations/${organizationId}/accounts`, {
        headers: {
          'x-user-id': currentUser.uid
        }
      });

      if (response.accounts && response.accounts.length > 0) {
        setAccounts(response.accounts);
        
        // Load last selected account from localStorage
        const lastAccountId = localStorage.getItem('lastSelectedAccountId');
        const lastAccount = response.accounts.find(acc => 
          acc.account_id === lastAccountId
        );
        
        if (lastAccount) {
          setSelectedAccount(lastAccount);
        } else {
          // Select first account by default
          setSelectedAccount(response.accounts[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
      setAccounts([]);
    }
  };

  const updateAccountContext = async (accountId) => {
    try {
      const response = await apiRequest('/api/account/context', {
        headers: {
          'x-account-id': accountId,
          'x-user-id': currentUser.uid
        }
      });

      if (response.context) {
        setAccountContext(response.context);
        
        // Store as default for future requests
        await apiRequest('/api/account/set-default', {
          method: 'POST',
          headers: {
            'x-user-id': currentUser.uid
          },
          body: { accountId }
        });
      }
    } catch (error) {
      console.error('Failed to update account context:', error);
    }
  };

  const loadUserPermissions = async (accountId) => {
    try {
      setPermissionsLoading(true);
      const response = await apiRequest('/api/user-management/permissions', {
        headers: {
          'x-account-id': accountId,
          'x-user-id': currentUser.uid
        }
      });

      if (response.permissions) {
        setUserPermissions(response.permissions);
      }
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      setUserPermissions({});
    } finally {
      setPermissionsLoading(false);
    }
  };

  const switchOrganization = (organization) => {
    setSelectedOrganization(organization);
    localStorage.setItem('lastSelectedOrganizationId', organization.organization_id);
  };

  const switchAccount = (account) => {
    setSelectedAccount(account);
    localStorage.setItem('lastSelectedAccountId', account.account_id);
  };

  const createOrganization = async (name) => {
    try {
      const response = await apiRequest('/api/organizations', {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.uid,
          'x-user-email': currentUser.email
        },
        body: { name }
      });

      if (response.success) {
        // Reload organizations
        await loadUserOrganizations();
        return response.organizationId;
      }
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    }
  };

  const createAccount = async (organizationId, name) => {
    try {
      const response = await apiRequest(`/api/organizations/${organizationId}/accounts`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.uid
        },
        body: { name }
      });

      if (response.success) {
        // Reload accounts
        await loadOrganizationAccounts(organizationId);
        return response.accountId;
      }
    } catch (error) {
      console.error('Failed to create account:', error);
      throw error;
    }
  };

  // Helper function to add account ID to API requests
  const withAccountContext = (options = {}) => {
    if (!selectedAccount) {
      throw new Error('No account selected');
    }

    return {
      ...options,
      headers: {
        ...options.headers,
        'x-account-id': selectedAccount.account_id,
        'x-user-id': currentUser?.uid
      }
    };
  };

  // Permission checking functions
  const hasPermission = (permission) => {
    return !!userPermissions.permissions?.[permission];
  };

  const hasAnyPermission = (permissions) => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions) => {
    return permissions.every(permission => hasPermission(permission));
  };

  const canManageUsers = () => hasPermission('manageUsers');
  const canInviteUsers = () => hasPermission('inviteUsers');
  const canManageContent = () => hasPermission('manageContent');
  const canViewContent = () => hasPermission('viewContent');
  const canManageSources = () => hasPermission('manageSources');
  const canManageJobs = () => hasPermission('manageJobs');
  const canViewAnalytics = () => hasPermission('viewAnalytics');
  const isGlobalAdmin = () => hasPermission('manageGlobalUsers');
  const canViewAllAccounts = () => hasPermission('viewAllAccounts');

  // Get user's role for current account
  const getUserRole = () => {
    return userPermissions.accountRole || 'viewer';
  };

  const getGlobalRole = () => {
    return userPermissions.globalRole || null;
  };

  const value = {
    organizations,
    selectedOrganization,
    accounts,
    selectedAccount,
    accountContext,
    loading,
    permissionsLoading,
    userPermissions,
    switchOrganization,
    switchAccount,
    createOrganization,
    createAccount,
    withAccountContext,
    loadUserPermissions,
    
    // Permission checking functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManageUsers,
    canInviteUsers,
    canManageContent,
    canViewContent,
    canManageSources,
    canManageJobs,
    canViewAnalytics,
    isGlobalAdmin,
    canViewAllAccounts,
    getUserRole,
    getGlobalRole,
    
    // Computed values
    currentAccountName: selectedAccount?.name || 'No Account',
    currentOrganizationName: selectedOrganization?.name || 'No Organization',
    hasAccess: !!selectedAccount && !!userPermissions.hasAccess,
    userRole: getUserRole()
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}; 