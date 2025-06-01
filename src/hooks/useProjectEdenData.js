import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { API_ENDPOINTS, REFRESH_INTERVALS, ERROR_MESSAGES } from '../utils/constants';

/**
 * Custom hook for managing Project Eden data
 */
export const useProjectEdenData = () => {
  const { currentUser } = useAuth();
  const { selectedAccount, withAccountContext, hasAccess, permissionsLoading } = useAccount();
  
  // State
  const [stats, setStats] = useState({
    articlesAggregated: 0,
    articlesAnalyzed: 0,
    contentGenerated: 0,
    pendingReview: 0,
    approvedContent: 0,
    archivedContent: 0,
    totalArticlesProcessed: 0,
    activeSources: 0
  });
  
  const [contentForReview, setContentForReview] = useState([]);
  const [approvedContent, setApprovedContent] = useState([]);
  const [archivedContent, setArchivedContent] = useState([]);
  const [rejectedContent, setRejectedContent] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [sources, setSources] = useState([]);
  const [jobStats, setJobStats] = useState({
    summary: { total_jobs: 0, queued: 0, processing: 0, completed: 0, failed: 0 },
    details: []
  });
  const [workerStatus, setWorkerStatus] = useState({ isRunning: false, currentJob: null });
  const [favoriteStories, setFavoriteStories] = useState(new Set());
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Helper function to make API requests with account context
  const fetchWithAccountContext = async (endpoint, options = {}) => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const accountOptions = withAccountContext(options);
    
    const response = await fetch(`${baseUrl}${endpoint}`, accountOptions);
    return response;
  };
  
  // Fetch all data
  const fetchData = useCallback(async () => {
    // Skip fetching if no account is selected
    if (!selectedAccount) {
      console.log('No account selected, skipping data fetch');
      return;
    }

    // Wait for permissions to finish loading
    if (permissionsLoading) {
      console.log('Permissions still loading, waiting...');
      return;
    }

    // Check access after permissions are loaded
    if (!hasAccess) {
      console.log('No access to selected account, skipping data fetch');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel with account context
      const [
        reviewResponse,
        approvedResponse,
        archivedResponse,
        rejectedResponse,
        articlesResponse,
        statsResponse,
        jobStatsResponse,
        bookmarksResponse,
        sourcesResponse
      ] = await Promise.all([
        fetchWithAccountContext(API_ENDPOINTS.CONTENT_REVIEW),
        fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?status=approved`),
        fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?status=archived`),
        fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?status=rejected`),
        fetchWithAccountContext(`${API_ENDPOINTS.ALL_ARTICLES}?limit=1000`),
        fetchWithAccountContext(API_ENDPOINTS.GENERATION_STATS),
        fetchWithAccountContext(API_ENDPOINTS.JOBS_STATS),
        currentUser?.uid ? fetchWithAccountContext(`${API_ENDPOINTS.BOOKMARKS}/ids?userId=${currentUser.uid}`) : 
          Promise.resolve({ json: () => ({ articleIds: [] }) }),
        fetchWithAccountContext(API_ENDPOINTS.SOURCES_STATUS)
      ]);

      // Process responses
      const reviewData = reviewResponse.ok ? await reviewResponse.json() : { content: [] };
      const approvedData = approvedResponse.ok ? await approvedResponse.json() : { content: [] };
      const archivedData = archivedResponse.ok ? await archivedResponse.json() : { content: [] };
      const rejectedData = rejectedResponse.ok ? await rejectedResponse.json() : { content: [] };
      const articlesData = articlesResponse.ok ? await articlesResponse.json() : { articles: [] };
      const sourcesData = sourcesResponse.ok ? await sourcesResponse.json() : { sources: [] };

      setContentForReview(reviewData.content || []);
      setApprovedContent(approvedData.content || []);
      setArchivedContent(archivedData.content || []);
      setRejectedContent(rejectedData.content || []);
      setAllArticles(articlesData.articles || []);
      setSources(sourcesData.sources || []);

      // Process API stats response
      let apiStats = {};
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        apiStats = data.stats || {};
      }

      if (jobStatsResponse.ok) {
        const data = await jobStatsResponse.json();
        setJobStats(data.stats || { summary: {}, details: [] });
        setWorkerStatus(data.worker || { isRunning: false });
      }

      if (bookmarksResponse.ok && currentUser?.uid) {
        const data = await bookmarksResponse.json();
        setFavoriteStories(new Set(data.articleIds || []));
      }

      // Calculate computed stats
      const totalArticles = sourcesData.sources.reduce((sum, source) => sum + source.articles_last_24h, 0);
      const activeSources = sourcesData.sources.filter(source => source.is_active).length;
      
      // Combine API stats with computed stats, giving priority to computed values where appropriate
      setStats(prev => ({ 
        ...prev,
        // Use API values for content generation stats (map correct field names)
        contentGenerated: apiStats.totalGenerated || 0,
        totalBlogs: apiStats.totalBlogs || 0,
        totalSocialPosts: apiStats.totalSocialPosts || 0,
        totalVideoScripts: apiStats.totalVideoScripts || 0,
        
        // Use computed values for aggregation/analysis stats
        articlesAggregated: totalArticles,
        activeSources: activeSources,
        articlesAnalyzed: articlesData.articles?.length || 0,
        pendingReview: reviewData.content?.length || 0,
        approvedContent: approvedData.content?.length || 0,
        archivedContent: archivedData.content?.length || 0,
        totalArticlesProcessed: articlesData.articles?.length || 0
      }));

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(ERROR_MESSAGES.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedAccount, hasAccess, withAccountContext, permissionsLoading]);

  // Fetch jobs data
  const fetchJobs = useCallback(async () => {
    if (!selectedAccount) {
      return [];
    }

    // Wait for permissions to finish loading
    if (permissionsLoading) {
      return [];
    }

    if (!hasAccess) {
      return [];
    }

    try {
      const [jobsResponse, statsResponse] = await Promise.all([
        fetchWithAccountContext(`${API_ENDPOINTS.JOBS_RECENT}?limit=20`),
        fetchWithAccountContext(API_ENDPOINTS.JOBS_STATS)
      ]);
      
      if (jobsResponse.ok && statsResponse.ok) {
        const jobsData = await jobsResponse.json();
        const statsData = await statsResponse.json();
        
        setJobStats(statsData.stats || { summary: {}, details: [] });
        setWorkerStatus(statsData.worker || { isRunning: false });
        
        return jobsData.jobs || [];
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      throw new Error(ERROR_MESSAGES.FETCH_FAILED);
    }
  }, [selectedAccount, hasAccess, withAccountContext, permissionsLoading]);

  // Toggle bookmark/favorite
  const toggleFavorite = useCallback(async (articleId) => {
    if (!currentUser?.uid || !selectedAccount || permissionsLoading || !hasAccess) {
      console.warn('User must be logged in and have account access to bookmark articles');
      return;
    }

    const newFavorites = new Set(favoriteStories);
    
    try {
      if (favoriteStories.has(articleId)) {
        // Remove bookmark
        const response = await fetchWithAccountContext(
          `${API_ENDPOINTS.BOOKMARKS}?userId=${currentUser.uid}&articleId=${articleId}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          newFavorites.delete(articleId);
          console.log(`Removed bookmark for article ${articleId}`);
        } else {
          throw new Error('Failed to remove bookmark');
        }
      } else {
        // Add bookmark
        const response = await fetchWithAccountContext(API_ENDPOINTS.BOOKMARKS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.uid,
            userEmail: currentUser.email,
            articleId
          })
        });

        if (response.ok) {
          newFavorites.add(articleId);
          console.log(`Added bookmark for article ${articleId}`);
        } else {
          throw new Error('Failed to add bookmark');
        }
      }
      
      setFavoriteStories(newFavorites);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      // Revert on error - favorites state remains unchanged
    }
  }, [currentUser, favoriteStories, selectedAccount, hasAccess, withAccountContext, permissionsLoading]);

  // React to account changes - clear data and refetch
  useEffect(() => {
    if (selectedAccount) {
      console.log(`🔄 Account context changed to: ${selectedAccount.name} (${selectedAccount.account_id})`);
      
      // Clear all data when account changes
      setStats({
        articlesAggregated: 0,
        articlesAnalyzed: 0,
        contentGenerated: 0,
        pendingReview: 0,
        approvedContent: 0,
        archivedContent: 0,
        totalArticlesProcessed: 0,
        activeSources: 0
      });
      setContentForReview([]);
      setApprovedContent([]);
      setArchivedContent([]);
      setRejectedContent([]);
      setAllArticles([]);
      setSources([]);
      setJobStats({
        summary: { total_jobs: 0, queued: 0, processing: 0, completed: 0, failed: 0 },
        details: []
      });
      setWorkerStatus({ isRunning: false, currentJob: null });
      setFavoriteStories(new Set());
      setError(null);
      
      // Fetch fresh data for the new account (will wait for permissions to load)
      fetchData();
    } else {
      // Clear data when no account is selected
      console.log('🔄 No account selected, clearing all data');
      setStats({
        articlesAggregated: 0,
        articlesAnalyzed: 0,
        contentGenerated: 0,
        pendingReview: 0,
        approvedContent: 0,
        archivedContent: 0,
        totalArticlesProcessed: 0,
        activeSources: 0
      });
      setContentForReview([]);
      setApprovedContent([]);
      setArchivedContent([]);
      setRejectedContent([]);
      setAllArticles([]);
      setSources([]);
      setJobStats({
        summary: { total_jobs: 0, queued: 0, processing: 0, completed: 0, failed: 0 },
        details: []
      });
      setWorkerStatus({ isRunning: false, currentJob: null });
      setFavoriteStories(new Set());
      setError(null);
    }
  }, [selectedAccount?.account_id]);

  // Trigger data fetch when permissions finish loading
  useEffect(() => {
    if (selectedAccount && !permissionsLoading && hasAccess) {
      console.log('✅ Permissions loaded with access, fetching data...');
      fetchData();
    }
  }, [selectedAccount?.account_id, permissionsLoading, hasAccess, fetchData]);

  // Set up automatic data refresh for current account
  useEffect(() => {
    if (selectedAccount && !permissionsLoading && hasAccess) {
      const interval = setInterval(() => {
        fetchData();
      }, REFRESH_INTERVALS.DATA);
    
      return () => clearInterval(interval);
    }
  }, [selectedAccount?.account_id, permissionsLoading, hasAccess, fetchData]);

  return {
    // Data
    stats,
    contentForReview,
    approvedContent,
    archivedContent,
    rejectedContent,
    allArticles,
    sources,
    jobStats,
    workerStatus,
    favoriteStories,
    
    // State
    loading,
    error,
    hasAccess,
    selectedAccount,
    
    // Actions
    fetchData,
    fetchJobs,
    toggleFavorite,
    
    // Setters for external updates
    setContentForReview,
    setApprovedContent,
    setArchivedContent,
    setRejectedContent,
    setAllArticles,
    setSources,
    setJobStats,
    setWorkerStatus,
    setStats
  };
};

export default useProjectEdenData; 