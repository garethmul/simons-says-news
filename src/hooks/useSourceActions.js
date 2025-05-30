import { useState, useCallback } from 'react';
import { API_ENDPOINTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

/**
 * Custom hook for source management actions
 */
export const useSourceActions = (onDataRefresh) => {
  const [toggleLoadingMap, setToggleLoadingMap] = useState(new Map());

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

  // Toggle source status (enable/disable)
  const toggleSourceStatus = useCallback(async (sourceId) => {
    try {
      setToggleLoading(sourceId, true);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/news/sources/${sourceId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log('✅ Source status updated:', sourceId);
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
  }, [onDataRefresh, setToggleLoading]);

  // Check if source toggle is loading
  const isToggleLoading = useCallback((sourceId) => {
    return toggleLoadingMap.has(sourceId);
  }, [toggleLoadingMap]);

  return {
    // Actions
    toggleSourceStatus,
    
    // Loading states
    isToggleLoading,
    toggleLoadingMap
  };
};

export default useSourceActions; 