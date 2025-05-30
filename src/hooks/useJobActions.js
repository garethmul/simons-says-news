import { useState, useCallback } from 'react';
import { API_ENDPOINTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

/**
 * Custom hook for job management actions
 */
export const useJobActions = (onDataRefresh) => {
  const [actionLoadingMap, setActionLoadingMap] = useState(new Map());

  // Set loading state for specific job action
  const setActionLoading = useCallback((actionId, isLoading) => {
    setActionLoadingMap(prev => {
      const newMap = new Map(prev);
      if (isLoading) {
        newMap.set(actionId, true);
      } else {
        newMap.delete(actionId);
      }
      return newMap;
    });
  }, []);

  // Cancel a job
  const cancelJob = useCallback(async (jobId) => {
    const actionId = `cancel-${jobId}`;
    
    try {
      setActionLoading(actionId, true);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/jobs/${jobId}/cancel`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log('✅ Job cancelled:', jobId);
        if (onDataRefresh) await onDataRefresh();
        return { success: true, message: 'Job cancelled successfully' };
      } else {
        const errorData = await response.json();
        console.error('❌ Job cancellation failed:', errorData.error);
        throw new Error(`Failed to cancel job: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Job cancellation error:', error);
      throw new Error(`Error cancelling job: ${error.message}`);
    } finally {
      setActionLoading(actionId, false);
    }
  }, [onDataRefresh, setActionLoading]);

  // Retry a failed job
  const retryJob = useCallback(async (jobId) => {
    const actionId = `retry-${jobId}`;
    
    try {
      setActionLoading(actionId, true);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/jobs/${jobId}/retry`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log('✅ Job retried:', jobId);
        if (onDataRefresh) await onDataRefresh();
        return { success: true, message: 'Job retried successfully' };
      } else {
        const errorData = await response.json();
        console.error('❌ Job retry failed:', errorData.error);
        throw new Error(`Failed to retry job: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Job retry error:', error);
      throw new Error(`Error retrying job: ${error.message}`);
    } finally {
      setActionLoading(actionId, false);
    }
  }, [onDataRefresh, setActionLoading]);

  // Start job worker
  const startJobWorker = useCallback(async () => {
    const actionId = 'start-worker';
    
    try {
      setActionLoading(actionId, true);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}${API_ENDPOINTS.WORKER_START}`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log('✅ Job worker started');
        if (onDataRefresh) await onDataRefresh();
        return { success: true, message: SUCCESS_MESSAGES.WORKER_STARTED };
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to start job worker:', errorData.error);
        throw new Error(`Failed to start job worker: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Error starting job worker:', error);
      throw new Error(`Error starting job worker: ${error.message}`);
    } finally {
      setActionLoading(actionId, false);
    }
  }, [onDataRefresh, setActionLoading]);

  // Check if action is loading
  const isActionLoading = useCallback((actionId) => {
    return actionLoadingMap.has(actionId);
  }, [actionLoadingMap]);

  return {
    // Actions
    cancelJob,
    retryJob,
    startJobWorker,
    
    // Loading states
    isActionLoading,
    actionLoadingMap
  };
};

export default useJobActions; 