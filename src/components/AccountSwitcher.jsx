import React, { useState } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { ChevronDownIcon, BuildingOfficeIcon, FolderIcon, PlusIcon } from '@heroicons/react/24/outline';

const AccountSwitcher = () => {
  const {
    organizations,
    selectedOrganization,
    accounts,
    selectedAccount,
    currentOrganizationName,
    currentAccountName,
    switchOrganization,
    switchAccount,
    createOrganization,
    createAccount,
    loading,
    userRole
  } = useAccount();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setCreating(true);
    try {
      await createOrganization(newOrgName);
      setNewOrgName('');
      setShowCreateOrgModal(false);
    } catch (error) {
      console.error('Failed to create organization:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName.trim() || !selectedOrganization) return;

    setCreating(true);
    try {
      await createAccount(selectedOrganization.organization_id, newAccountName);
      setNewAccountName('');
      setShowCreateAccountModal(false);
    } catch (error) {
      console.error('Failed to create account:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full"></div>
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-sm font-medium text-gray-700"
        >
          <div className="flex items-center space-x-1">
            <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
            <span>{currentOrganizationName}</span>
            <span className="text-gray-400">/</span>
            <FolderIcon className="h-4 w-4 text-gray-500" />
            <span>{currentAccountName}</span>
          </div>
          <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            {/* Organizations Section */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Organizations</h3>
                <button
                  onClick={() => {
                    setShowCreateOrgModal(true);
                    setIsOpen(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <PlusIcon className="h-3 w-3" />
                  <span>New</span>
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {organizations.map((org) => (
                  <button
                    key={org.organization_id}
                    onClick={() => {
                      switchOrganization(org);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 transition-colors duration-150 flex items-center justify-between ${
                      selectedOrganization?.organization_id === org.organization_id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700'
                    }`}
                  >
                    <span>{org.name}</span>
                    <span className="text-xs text-gray-500">{org.user_role}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accounts Section */}
            {selectedOrganization && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Accounts</h3>
                  {['owner', 'admin'].includes(userRole) && (
                    <button
                      onClick={() => {
                        setShowCreateAccountModal(true);
                        setIsOpen(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <PlusIcon className="h-3 w-3" />
                      <span>New</span>
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {accounts.map((account) => (
                    <button
                      key={account.account_id}
                      onClick={() => {
                        switchAccount(account);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 transition-colors duration-150 flex items-center justify-between ${
                        selectedAccount?.account_id === account.account_id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700'
                      }`}
                    >
                      <span>{account.name}</span>
                      {account.user_role && (
                        <span className="text-xs text-gray-500">{account.user_role}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Create New Organization</h2>
            <form onSubmit={handleCreateOrganization}>
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Organization name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateOrgModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newOrgName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Create New Account</h2>
            <p className="text-sm text-gray-600 mb-4">
              in {selectedOrganization?.name}
            </p>
            <form onSubmit={handleCreateAccount}>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Account name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newAccountName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AccountSwitcher; 