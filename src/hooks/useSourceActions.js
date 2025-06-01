import { useState, useCallback } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { API_ENDPOINTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

/**
 * Custom hook for source management actions
 */
export const useSourceActions = (onDataRefresh) => {
  const { selectedAccount, withAccountContext } = useAccount();
  const [toggleLoadingMap, setToggleLoadingMap] = useState(new Map());
  const [refreshLoadingMap, setRefreshLoadingMap] = useState(new Map());
  const [isAddingSource, setIsAddingSource] = useState(false);

  // Set loading state for specific source toggle
  const setToggleLoading = useCallback((sourceId, isLoading) => {
    setToggleLoadingMap(prev => {
      const newMap = new Map(prev);
      if (isLoading) {
        newMap.set(sourceId, true);
      } else {
        newMap.delete(sourceId);
      }
      return newMap;
    });
  }, []);

  // Set loading state for specific source refresh
  const setRefreshLoading = useCallback((sourceId, isLoading) => {
    setRefreshLoadingMap(prev => {
      const newMap = new Map(prev);
      if (isLoading) {
        newMap.set(sourceId, true);
      } else {
        newMap.delete(sourceId);
      }
      return newMap;
    });
  }, []);

  // Toggle source status (enable/disable)
  const toggleSourceStatus = useCallback(async (sourceId) => {
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    try {
      setToggleLoading(sourceId, true);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/news/sources/${sourceId}/status`, {
        ...withAccountContext({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        })
      });

      if (response.ok) {
        console.log(`✅ Source status updated: ${sourceId} for account ${selectedAccount.name}`);
        if (onDataRefresh) await onDataRefresh();
        return { success: true, message: SUCCESS_MESSAGES.SOURCE_UPDATED };
      } else {
        const errorData = await response.json();
        console.error('❌ Source status update failed:', errorData.error);
        throw new Error(`Failed to update source: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Source status update error:', error);
      throw new Error(`Error updating source: ${error.message}`);
    } finally {
      setToggleLoading(sourceId, false);
    }
  }, [onDataRefresh, setToggleLoading, selectedAccount, withAccountContext]);

  // Add new source
  const addSource = useCallback(async (sourceData) => {
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    try {
      setIsAddingSource(true);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}${API_ENDPOINTS.ADD_SOURCE}`, {
        ...withAccountContext({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sourceData)
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Source added successfully: ${sourceData.name} for account ${selectedAccount.name}`);
        if (onDataRefresh) await onDataRefresh();
        return { 
          success: true, 
          message: result.message,
          source: result.source
        };
      } else {
        console.error('❌ Source addition failed:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Source addition error:', error);
      throw new Error(`Error adding source: ${error.message}`);
    } finally {
      setIsAddingSource(false);
    }
  }, [onDataRefresh, selectedAccount, withAccountContext]);

  // Refresh articles from a single source
  const refreshSource = useCallback(async (sourceId, sourceName) => {
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    try {
      setRefreshLoading(sourceId, true);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const endpoint = API_ENDPOINTS.SOURCE_REFRESH.replace('{id}', sourceId);
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...withAccountContext({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Source refresh job created: ${sourceName} (Job ID: ${result.jobId}) for account ${selectedAccount.name}`);
        if (onDataRefresh) await onDataRefresh();
        return { 
          success: true, 
          message: result.message,
          jobId: result.jobId
        };
      } else {
        console.error('❌ Source refresh failed:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Source refresh error:', error);
      throw new Error(`Error refreshing source: ${error.message}`);
    } finally {
      setRefreshLoading(sourceId, false);
    }
  }, [onDataRefresh, setRefreshLoading, selectedAccount, withAccountContext]);

  // Check if source toggle is loading
  const isToggleLoading = useCallback((sourceId) => {
    return toggleLoadingMap.has(sourceId);
  }, [toggleLoadingMap]);

  // Check if source refresh is loading
  const isRefreshLoading = useCallback((sourceId) => {
    return refreshLoadingMap.has(sourceId);
  }, [refreshLoadingMap]);

  return {
    // Actions
    toggleSourceStatus,
    addSource,
    refreshSource,
    
    // Loading states
    isToggleLoading,
    isAddingSource,
    isRefreshLoading,
    toggleLoadingMap,
    refreshLoadingMap
  };
};

export default useSourceActions; 