import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { API_ENDPOINTS, REFRESH_INTERVALS, ERROR_MESSAGES } from '../utils/constants';

/**
 * Custom hook for managing Project Eden data with optimized loading
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
    rejectedContent: 0,
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Track what data has been loaded to avoid unnecessary requests
  const [loadedTabs, setLoadedTabs] = useState(new Set());
  
  // Helper function to make API requests with account context
  const fetchWithAccountContext = async (endpoint, options = {}) => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const accountOptions = withAccountContext(options);
    
    const response = await fetch(`${baseUrl}${endpoint}`, accountOptions);
    return response;
  };
  
  // Fetch minimal essential data only (for dashboard overview)
  const fetchEssentialData = useCallback(async () => {
    if (!selectedAccount || permissionsLoading || !hasAccess) {
      return;
    }

    setInitialLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Loading essential dashboard data...');
      
      // Fetch critical data: stats + sources + jobs + content counts (4 requests for fast loading)
      const [statsResponse, sourcesResponse, jobStatsResponse, contentCountsResponse] = await Promise.all([
        fetchWithAccountContext(API_ENDPOINTS.GENERATION_STATS),
        fetchWithAccountContext(API_ENDPOINTS.SOURCES_STATUS),
        fetchWithAccountContext(API_ENDPOINTS.JOBS_STATS),
        // Get content counts without full data for tab display
        Promise.all([
          fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?limit=1`), // Get count for pending review
          fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?status=approved&limit=1`), // Get count for approved
          fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?status=archived&limit=1`), // Get count for archived
          fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?status=rejected&limit=1`), // Get count for rejected
          fetchWithAccountContext(`${API_ENDPOINTS.ALL_ARTICLES}?limit=1`) // Get count for articles
        ])
      ]);

      // Process responses
      const sourcesData = sourcesResponse.ok ? await sourcesResponse.json() : { sources: [] };
      setSources(sourcesData.sources || []);

      // Process job stats
      if (jobStatsResponse.ok) {
        const data = await jobStatsResponse.json();
        setJobStats(data.stats || { summary: {}, details: [] });
        setWorkerStatus(data.worker || { isRunning: false });
      }

      // Process API stats
      let apiStats = {};
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        apiStats = data.stats || {};
      }

      // Process content counts from the parallel requests
      const [reviewCountRes, approvedCountRes, archivedCountRes, rejectedCountRes, articlesCountRes] = contentCountsResponse;
      
      let contentCounts = {
        pendingReview: 0,
        approvedContent: 0,
        archivedContent: 0,
        rejectedContent: 0,
        articlesAnalyzed: 0
      };

      if (reviewCountRes.ok) {
        const data = await reviewCountRes.json();
        contentCounts.pendingReview = data.totalCount || data.count || 0;
      }
      
      if (approvedCountRes.ok) {
        const data = await approvedCountRes.json();
        contentCounts.approvedContent = data.totalCount || data.count || 0;
      }
      
      if (archivedCountRes.ok) {
        const data = await archivedCountRes.json();
        contentCounts.archivedContent = data.totalCount || data.count || 0;
      }

      if (rejectedCountRes.ok) {
        const data = await rejectedCountRes.json();
        contentCounts.rejectedContent = data.totalCount || data.count || 0;
      }
      
      if (articlesCountRes.ok) {
        const data = await articlesCountRes.json();
        contentCounts.articlesAnalyzed = data.totalCount || data.count || 0;
      }

      // Calculate computed stats from sources
      const totalArticles = sourcesData.sources?.reduce((sum, source) => sum + (source.articles_last_24h || 0), 0) || 0;
      const activeSources = sourcesData.sources?.filter(source => source.is_active).length || 0;
      
      // Set stats with actual counts
      setStats(prev => ({ 
        ...prev,
        contentGenerated: apiStats.totalGenerated || 0,
        totalBlogs: apiStats.totalBlogs || 0,
        totalSocialPosts: apiStats.totalSocialPosts || 0,
        totalVideoScripts: apiStats.totalVideoScripts || 0,
        articlesAggregated: totalArticles,
        activeSources: activeSources,
        // Use actual counts from API
        articlesAnalyzed: contentCounts.articlesAnalyzed,
        pendingReview: contentCounts.pendingReview,
        approvedContent: contentCounts.approvedContent,
        archivedContent: contentCounts.archivedContent,
        rejectedContent: contentCounts.rejectedContent,
        totalArticlesProcessed: contentCounts.articlesAnalyzed
      }));

      console.log('✅ Essential data loaded successfully with counts:', contentCounts);
      
    } catch (err) {
      console.error('❌ Error fetching essential data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setInitialLoading(false);
    }
  }, [selectedAccount, hasAccess, withAccountContext, permissionsLoading]);

  // Fetch data for specific tab (lazy loading)
  const fetchTabData = useCallback(async (tabName, forceRefresh = false) => {
    if (!selectedAccount || permissionsLoading || !hasAccess) {
      return;
    }
    
    // Skip if already loaded and not forcing refresh
    if (loadedTabs.has(tabName) && !forceRefresh) {
      return;
    }

    setLoading(true);
    
    try {
      console.log(`📋 Loading data for tab: ${tabName}`);
      
      switch (tabName) {
        case 'review':
          if (!loadedTabs.has('review') || forceRefresh) {
            const reviewResponse = await fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?limit=20`);
            if (reviewResponse.ok) {
              const reviewData = await reviewResponse.json();
              setContentForReview(reviewData.content || []);
              setStats(prev => ({ ...prev, pendingReview: reviewData.totalCount || reviewData.content?.length || 0 }));
            }
            setLoadedTabs(prev => new Set([...prev, 'review']));
          }
          break;
          
        case 'approved':
          if (!loadedTabs.has('approved') || forceRefresh) {
            const approvedResponse = await fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?status=approved&limit=20`);
            if (approvedResponse.ok) {
              const approvedData = await approvedResponse.json();
              setApprovedContent(approvedData.content || []);
              setStats(prev => ({ ...prev, approvedContent: approvedData.totalCount || approvedData.content?.length || 0 }));
            }
            setLoadedTabs(prev => new Set([...prev, 'approved']));
          }
          break;
          
        case 'archived':
          if (!loadedTabs.has('archived') || forceRefresh) {
            const archivedResponse = await fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?status=archived&limit=20`);
            if (archivedResponse.ok) {
              const archivedData = await archivedResponse.json();
              setArchivedContent(archivedData.content || []);
              setStats(prev => ({ ...prev, archivedContent: archivedData.totalCount || archivedData.content?.length || 0 }));
            }
            setLoadedTabs(prev => new Set([...prev, 'archived']));
          }
          break;
          
        case 'rejected':
          if (!loadedTabs.has('rejected') || forceRefresh) {
            const rejectedResponse = await fetchWithAccountContext(`${API_ENDPOINTS.CONTENT_REVIEW}?status=rejected&limit=20`);
            if (rejectedResponse.ok) {
              const rejectedData = await rejectedResponse.json();
              setRejectedContent(rejectedData.content || []);
              setStats(prev => ({ ...prev, rejectedContent: rejectedData.totalCount || rejectedData.content?.length || 0 }));
            }
            setLoadedTabs(prev => new Set([...prev, 'rejected']));
          }
          break;
          
        case 'articles':
          if (!loadedTabs.has('articles') || forceRefresh) {
            const articlesResponse = await fetchWithAccountContext(`${API_ENDPOINTS.ALL_ARTICLES}?limit=100`); // Reduced from 1000
            if (articlesResponse.ok) {
              const articlesData = await articlesResponse.json();
              setAllArticles(articlesData.articles || []);
              setStats(prev => ({ 
                ...prev, 
                articlesAnalyzed: articlesData.totalCount || articlesData.articles?.length || 0,
                totalArticlesProcessed: articlesData.totalCount || articlesData.articles?.length || 0
      }));
            }
            setLoadedTabs(prev => new Set([...prev, 'articles']));
          }
          break;
          
        case 'bookmarks':
          if ((!loadedTabs.has('bookmarks') || forceRefresh) && currentUser?.uid) {
            const bookmarksResponse = await fetchWithAccountContext(`${API_ENDPOINTS.BOOKMARKS}/ids?userId=${currentUser.uid}`);
            if (bookmarksResponse.ok) {
              const data = await bookmarksResponse.json();
              setFavoriteStories(new Set(data.articleIds || []));
            }
            setLoadedTabs(prev => new Set([...prev, 'bookmarks']));
          }
          break;
      }
      
      console.log(`✅ Tab data loaded: ${tabName}`);

    } catch (err) {
      console.error(`❌ Error loading ${tabName} data:`, err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, hasAccess, withAccountContext, permissionsLoading, currentUser, loadedTabs]);

  // Background refresh (lighter version)
  const backgroundRefresh = useCallback(async () => {
    if (!selectedAccount || permissionsLoading || !hasAccess) {
      return;
    }

    setBackgroundRefreshing(true);
    
    try {
      // Only refresh essential data in background
      const [statsResponse, jobStatsResponse] = await Promise.all([
        fetchWithAccountContext(API_ENDPOINTS.GENERATION_STATS),
        fetchWithAccountContext(API_ENDPOINTS.JOBS_STATS)
      ]);

      if (statsResponse.ok) {
        const data = await statsResponse.json();
        const apiStats = data.stats || {};
        setStats(prev => ({ 
          ...prev,
          contentGenerated: apiStats.totalGenerated || prev.contentGenerated,
          totalBlogs: apiStats.totalBlogs || prev.totalBlogs,
          totalSocialPosts: apiStats.totalSocialPosts || prev.totalSocialPosts,
          totalVideoScripts: apiStats.totalVideoScripts || prev.totalVideoScripts
        }));
      }

      if (jobStatsResponse.ok) {
        const data = await jobStatsResponse.json();
        setJobStats(data.stats || jobStats);
        setWorkerStatus(data.worker || workerStatus);
      }
      
    } catch (err) {
      console.error('Background refresh failed:', err);
    } finally {
      setBackgroundRefreshing(false);
    }
  }, [selectedAccount, hasAccess, withAccountContext, permissionsLoading, jobStats, workerStatus]);

  // Fetch jobs data
  const fetchJobs = useCallback(async () => {
    if (!selectedAccount || permissionsLoading || !hasAccess) {
      return [];
    }

    try {
      // Fetch active jobs (queued + processing) and recent completed jobs in parallel
      const [activeJobsResponse, completedJobsResponse, statsResponse] = await Promise.all([
        fetchWithAccountContext(`${API_ENDPOINTS.JOBS_RECENT}?limit=10`), // Recent jobs (includes active)
        fetchWithAccountContext(`/api/eden/jobs/status/completed?limit=50`), // Recent completed jobs
        fetchWithAccountContext(API_ENDPOINTS.JOBS_STATS)
      ]);
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setJobStats(statsData.stats || { summary: {}, details: [] });
        setWorkerStatus(statsData.worker || { isRunning: false });
      }

      // Combine active and completed jobs
      let allJobs = [];
      
      if (activeJobsResponse.ok) {
        const activeData = await activeJobsResponse.json();
        allJobs = [...(activeData.jobs || [])];
      }
      
      if (completedJobsResponse.ok) {
        const completedData = await completedJobsResponse.json();
        const completedJobs = completedData.jobs || [];
        
        // Add completed jobs, avoiding duplicates (in case recent jobs includes some completed ones)
        const existingJobIds = new Set(allJobs.map(job => job.job_id));
        const newCompletedJobs = completedJobs.filter(job => !existingJobIds.has(job.job_id));
        allJobs = [...allJobs, ...newCompletedJobs];
      }
      
      // Sort jobs by creation date (most recent first)
      allJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      console.log(`📋 Fetched ${allJobs.length} jobs total (${allJobs.filter(j => ['queued', 'processing'].includes(j.status)).length} active, ${allJobs.filter(j => ['completed', 'failed', 'cancelled'].includes(j.status)).length} completed)`);
      
      return allJobs;
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
    }
  }, [currentUser, favoriteStories, selectedAccount, hasAccess, withAccountContext, permissionsLoading]);

  // React to account changes - clear data and fetch essentials
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
        rejectedContent: 0,
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
      setLoadedTabs(new Set());
      setError(null);
      
      // Fetch essential data only
      fetchEssentialData();
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
        rejectedContent: 0,
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
      setLoadedTabs(new Set());
      setError(null);
      setInitialLoading(false);
    }
  }, [selectedAccount?.account_id]);

  // Trigger essential data fetch when permissions finish loading
  useEffect(() => {
    if (selectedAccount && !permissionsLoading && hasAccess) {
      console.log('✅ Permissions loaded with access, fetching essential data...');
      fetchEssentialData();
    }
  }, [selectedAccount?.account_id, permissionsLoading, hasAccess, fetchEssentialData]);

  // Set up automatic background refresh (much lighter)
  useEffect(() => {
    if (selectedAccount && !permissionsLoading && hasAccess && !initialLoading) {
      const interval = setInterval(() => {
        backgroundRefresh();
      }, REFRESH_INTERVALS.DATA * 4); // 4 minutes
    
      return () => clearInterval(interval);
    }
  }, [selectedAccount?.account_id, permissionsLoading, hasAccess, initialLoading, backgroundRefresh]);

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
    initialLoading,
    backgroundRefreshing,
    error,
    hasAccess,
    selectedAccount,
    
    // Actions
    fetchTabData, // New: Load data for specific tabs
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