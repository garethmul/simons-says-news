/**
 * Account User Management Component
 * Comprehensive interface for managing users, roles, and invitations
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { useAuth } from '../contexts/AuthContext';

const AccountUserManagement = () => {
  const { selectedAccount, withAccountContext } = useAccount();
  const { currentUser } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  
  // Invite user form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'viewer',
    loading: false
  });
  
  // Search state
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (selectedAccount) {
      fetchData();
    }
  }, [selectedAccount?.account_id]);

  const fetchData = async () => {
    if (!selectedAccount) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      
      // Fetch user permissions, users, and invitations in parallel
      const [permissionsRes, usersRes, invitationsRes] = await Promise.all([
        fetch(`${baseUrl}/api/user-management/permissions`, {
          ...withAccountContext()
        }),
        fetch(`${baseUrl}/api/user-management/accounts/${selectedAccount.account_id}/users`, {
          ...withAccountContext()
        }),
        fetch(`${baseUrl}/api/user-management/accounts/${selectedAccount.account_id}/invitations`, {
          ...withAccountContext()
        })
      ]);

      if (permissionsRes.ok) {
        const permData = await permissionsRes.json();
        setPermissions(permData.permissions || {});
      }

      if (usersRes.ok) {
        const userData = await usersRes.json();
        setUsers(userData.users || []);
      }

      if (invitationsRes.ok) {
        const invData = await invitationsRes.json();
        setInvitations(invData.invitations || []);
      }
      
    } catch (err) {
      console.error('Error fetching user management data:', err);
      setError('Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    
    if (!inviteForm.email || !inviteForm.role) {
      alert('Please enter email and select a role');
      return;
    }

    try {
      setInviteForm(prev => ({ ...prev, loading: true }));
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/user-management/accounts/${selectedAccount.account_id}/invitations`, {
        ...withAccountContext({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invitedEmail: inviteForm.email,
            invitedName: inviteForm.name,
            role: inviteForm.role
          })
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Invitation sent to ${inviteForm.email}`);
        setInviteForm({ email: '', name: '', role: 'viewer', loading: false });
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setInviteForm(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRemoveUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this account?`)) {
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/user-management/accounts/${selectedAccount.account_id}/users/${userId}`, {
        ...withAccountContext({
          method: 'DELETE'
        })
      });

      if (response.ok) {
        alert(`${userName} has been removed from the account`);
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleCancelInvitation = async (invitationId, email) => {
    if (!confirm(`Are you sure you want to cancel the invitation to ${email}?`)) {
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/user-management/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert(`Invitation to ${email} has been cancelled`);
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchEmail) return;

    try {
      setSearching(true);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/user-management/search?email=${encodeURIComponent(searchEmail)}`, {
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      } else {
        throw new Error('Failed to search users');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSearching(false);
    }
  };

  const getRoleBadgeClass = (role, isGlobal = false) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    
    if (isGlobal) {
      return `${baseClasses} bg-purple-100 text-purple-800`;
    }
    
    switch (role) {
      case 'admin':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'editor':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'viewer':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!selectedAccount) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">User Management</h2>
        <div className="text-gray-500 text-center py-8">
          Please select an account to manage users
        </div>
      </div>
    );
  }

  if (!permissions.manageUsers && !permissions.viewAllAccounts) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">User Management</h2>
        <div className="text-red-500 text-center py-8">
          You don't have permission to manage users for this account
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage users and invitations for <span className="font-medium">{selectedAccount.name}</span>
            </p>
          </div>
          
          {permissions.manageUsers && (
            <div className="text-sm text-gray-500">
              Your role: <span className={getRoleBadgeClass(permissions.accountRole)}>
                {permissions.accountRole}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Users ({users.length})
          </button>
          
          {permissions.manageUsers && (
            <>
              <button
                onClick={() => setActiveTab('invite')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invite'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Invite User
              </button>
              
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invitations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Invitations ({invitations.length})
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">
            {error}
          </div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Current Users</h3>
                
                {users.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No users assigned to this account
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Assigned
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Access
                          </th>
                          {permissions.manageUsers && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.assignment_id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.user_name || user.user_email}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.user_email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                <span className={getRoleBadgeClass(user.role)}>
                                  {user.role}
                                </span>
                                {user.global_role && (
                                  <span className={getRoleBadgeClass(user.global_role, true)}>
                                    {user.global_role} (global)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(user.assigned_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.last_access ? formatDateTime(user.last_access) : 'Never'}
                            </td>
                            {permissions.manageUsers && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {user.user_id !== currentUser?.uid && (
                                  <button
                                    onClick={() => handleRemoveUser(user.user_id, user.user_name || user.user_email)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Invite User Tab */}
            {activeTab === 'invite' && permissions.manageUsers && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Invite New User</h3>
                
                <form onSubmit={handleInviteUser} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="viewer">Viewer - Read-only access</option>
                      <option value="editor">Editor - Can manage content</option>
                      <option value="admin">Admin - Full account access</option>
                    </select>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={inviteForm.loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviteForm.loading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </form>
              </div>
            )}

            {/* Pending Invitations Tab */}
            {activeTab === 'invitations' && permissions.manageUsers && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Pending Invitations</h3>
                
                {invitations.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No pending invitations
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invited User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invited By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expires
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invitations.map((invitation) => (
                          <tr key={invitation.invitation_id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {invitation.invited_name || invitation.invited_email}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {invitation.invited_email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={getRoleBadgeClass(invitation.role)}>
                                {invitation.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invitation.invited_by_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(invitation.expires_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleCancelInvitation(invitation.invitation_id, invitation.invited_email)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AccountUserManagement; 
