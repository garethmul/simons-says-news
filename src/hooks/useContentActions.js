import { useState, useCallback } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { API_ENDPOINTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

/**
 * Custom hook for content actions (approve, reject, generate, etc.)
 */
export const useContentActions = (onDataRefresh) => {
  const { selectedAccount, withAccountContext } = useAccount();
  const [actionLoadingMap, setActionLoadingMap] = useState(new Map());
  const [generatingContentMap, setGeneratingContentMap] = useState(new Map());
  
  // Set loading state for specific action/ID
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

  // Set content generation loading state
  const setContentGenerationLoading = useCallback((storyId, isLoading) => {
    setGeneratingContentMap(prev => {
      const newMap = new Map(prev);
      if (isLoading) {
        newMap.set(storyId, true);
      } else {
        newMap.delete(storyId);
      }
      return newMap;
    });
  }, []);

  // Approve content
  const approveContent = useCallback(async (contentId, contentType) => {
    const actionId = `approve-${contentType}-${contentId}`;
    
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    try {
      setActionLoading(actionId, true);
      console.log(`✅ Approving ${contentType} ${contentId} for account ${selectedAccount.name}`);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/content/${contentType}/${contentId}/status`, {
        ...withAccountContext({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
        })
      });
      
      if (response.ok) {
        console.log(`✅ Content approved successfully`);
        if (onDataRefresh) await onDataRefresh();
        return { success: true, message: SUCCESS_MESSAGES.CONTENT_APPROVED };
      } else {
        throw new Error(ERROR_MESSAGES.APPROVAL_FAILED);
      }
    } catch (error) {
      console.error('Error approving content:', error);
      throw error;
    } finally {
      setActionLoading(actionId, false);
    }
  }, [onDataRefresh, setActionLoading, selectedAccount, withAccountContext]);

  // Reject content
  const rejectContent = useCallback(async (contentId, contentType) => {
    const actionId = `reject-${contentType}-${contentId}`;
    
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    try {
      setActionLoading(actionId, true);
      console.log(`❌ Rejecting ${contentType} ${contentId} for account ${selectedAccount.name}`);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/content/${contentType}/${contentId}/status`, {
        ...withAccountContext({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
        })
      });
      
      if (response.ok) {
        console.log(`✅ Content rejected successfully`);
        if (onDataRefresh) await onDataRefresh();
        return { success: true, message: SUCCESS_MESSAGES.CONTENT_REJECTED };
      } else {
        throw new Error(ERROR_MESSAGES.REJECTION_FAILED);
      }
    } catch (error) {
      console.error('Error rejecting content:', error);
      throw error;
    } finally {
      setActionLoading(actionId, false);
    }
  }, [onDataRefresh, setActionLoading, selectedAccount, withAccountContext]);

  // Update content status
  const updateContentStatus = useCallback(async (contentType, contentId, newStatus) => {
    const actionId = `update-${contentType}-${contentId}`;
    
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    try {
      setActionLoading(actionId, true);
      console.log(`📝 Updating ${contentType} ${contentId} to ${newStatus} for account ${selectedAccount.name}`);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/content/${contentType}/${contentId}/status`, {
        ...withAccountContext({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
        })
      });
      
      if (response.ok) {
        console.log(`✅ Content updated successfully`);
        if (onDataRefresh) await onDataRefresh();
        return { success: true, message: 'Status updated successfully' };
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    } finally {
      setActionLoading(actionId, false);
    }
  }, [onDataRefresh, setActionLoading, selectedAccount, withAccountContext]);

  // Regenerate content - archives existing content and creates new job
  const regenerateContent = useCallback(async (contentId, storyId, onTabChange) => {
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    const actionId = `regenerate-${contentId}`;
    
    try {
      setActionLoading(actionId, true);
      console.log(`🔄 Regenerating content ${contentId} from story ${storyId} in account ${selectedAccount.name}`);
      
      // First, archive the current content to remove it from review
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const statusResponse = await fetch(`${baseUrl}/api/eden/content/article/${contentId}/status`, {
        ...withAccountContext({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'archived' })
        })
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(`Failed to archive content: ${errorData.error}`);
      }

      console.log('✅ Original content archived');

      // Then create the regeneration job
      const jobResponse = await fetch(`${baseUrl}${API_ENDPOINTS.CONTENT_GENERATE}`, {
        ...withAccountContext({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 1, specificStoryId: storyId })
        })
      });

      if (jobResponse.ok) {
        const data = await jobResponse.json();
        console.log('✅ Regeneration job created:', data.jobId);
        
        // Refresh data to update tabs
        if (onDataRefresh) await onDataRefresh();
        
        // Switch to queued tab if provided
        if (onTabChange) onTabChange('queued');
        
        return { 
          success: true, 
          jobId: data.jobId,
          message: `Original content archived and regeneration job created! Job ID: ${data.jobId}`
        };
      } else {
        const errorData = await jobResponse.json();
        console.error('❌ Regeneration job creation failed:', errorData.error);
        throw new Error(`Failed to create regeneration job: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Regeneration error:', error);
      throw new Error(`Error regenerating content: ${error.message}`);
    } finally {
      setActionLoading(actionId, false);
    }
  }, [onDataRefresh, setActionLoading, selectedAccount, withAccountContext]);

  // Generate content from story (original function)
  const generateContentFromStory = useCallback(async (storyId, onTabChange) => {
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    try {
      setContentGenerationLoading(storyId, true);
      console.log(`Creating content generation job for story: ${storyId} in account ${selectedAccount.name}`);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}${API_ENDPOINTS.CONTENT_GENERATE}`, {
        ...withAccountContext({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1, specificStoryId: storyId })
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Content generation job created:', data.jobId);
        
        // Refresh data
        if (onDataRefresh) await onDataRefresh();
        
        // Switch to queued tab if provided
        if (onTabChange) onTabChange('queued');
        
        return { 
          success: true, 
          jobId: data.jobId,
          message: `Content generation job created! Job ID: ${data.jobId}`
        };
      } else {
        const errorData = await response.json();
        console.error('❌ Job creation failed:', errorData.error);
        throw new Error(`Failed to create job: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Job creation error:', error);
      throw new Error(`Error creating job: ${error.message}`);
    } finally {
      setContentGenerationLoading(storyId, false);
    }
  }, [onDataRefresh, setContentGenerationLoading, selectedAccount, withAccountContext]);

  // Analyze more articles
  const analyzeMoreArticles = useCallback(async () => {
    const actionId = 'analyze-more';
    
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    try {
      setActionLoading(actionId, true);
      console.log(`🧠 Analyzing more articles for account ${selectedAccount.name}...`);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}${API_ENDPOINTS.ANALYZE_ARTICLES}`, {
        ...withAccountContext({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 })
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Analyzed ${data.analyzed} more articles`);
        if (onDataRefresh) await onDataRefresh();
        return { success: true, analyzed: data.analyzed };
      } else {
        throw new Error('Failed to analyze more articles');
      }
    } catch (error) {
      console.error('Error analyzing more articles:', error);
      throw error;
    } finally {
      setActionLoading(actionId, false);
    }
  }, [onDataRefresh, setActionLoading, selectedAccount, withAccountContext]);

  // Run full automation cycle
  const runFullCycle = useCallback(async () => {
    const actionId = 'full-cycle';
    
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    try {
      setActionLoading(actionId, true);
      console.log(`🤖 Starting full automation cycle for account ${selectedAccount.name}...`);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}${API_ENDPOINTS.FULL_CYCLE}`, {
        ...withAccountContext({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Full cycle job created:', data.jobId);
        if (onDataRefresh) await onDataRefresh();
        return { success: true, jobId: data.jobId };
      } else {
        throw new Error('Failed to start automation cycle');
      }
    } catch (error) {
      console.error('Error running full cycle:', error);
      throw error;
    } finally {
      setActionLoading(actionId, false);
    }
  }, [onDataRefresh, setActionLoading, selectedAccount, withAccountContext]);

  // Create content job
  const createContentJob = useCallback(async (specificStoryId = null, onTabChange) => {
    const actionId = 'create-content-job';
    
    if (!selectedAccount) {
      throw new Error('No account selected');
    }
    
    try {
      setActionLoading(actionId, true);
      console.log(`📝 Creating content generation job for account ${selectedAccount.name}...`);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const payload = specificStoryId 
        ? { specificStoryId }
        : { limit: 5 };
      
      const response = await fetch(`${baseUrl}${API_ENDPOINTS.CONTENT_GENERATE}`, {
        ...withAccountContext({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Content generation job created:', data.jobId);
        
        if (onDataRefresh) await onDataRefresh();
        if (onTabChange) onTabChange('jobs');
        
        return { success: true, jobId: data.jobId };
      } else {
        const errorData = await response.json();
        console.error('❌ Content generation failed:', errorData.error);
        throw new Error(`Failed to create content: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Content generation error:', error);
      throw new Error(`Error creating content: ${error.message}`);
    } finally {
      setActionLoading(actionId, false);
    }
  }, [onDataRefresh, setActionLoading, selectedAccount, withAccountContext]);

  // Check if action is loading
  const isActionLoading = useCallback((actionId) => {
    return actionLoadingMap.has(actionId);
  }, [actionLoadingMap]);

  // Check if content generation is loading
  const isContentGenerationLoading = useCallback((storyId) => {
    return generatingContentMap.has(storyId);
  }, [generatingContentMap]);

  return {
    // Actions
    approveContent,
    rejectContent,
    updateContentStatus,
    generateContentFromStory,
    regenerateContent,
    analyzeMoreArticles,
    runFullCycle,
    createContentJob,
    
    // Loading states
    isActionLoading,
    isContentGenerationLoading,
    actionLoadingMap,
    generatingContentMap
  };
};

export default useContentActions; 