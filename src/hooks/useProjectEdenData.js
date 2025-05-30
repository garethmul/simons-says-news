import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, REFRESH_INTERVALS, ERROR_MESSAGES } from '../utils/constants';
import { withErrorHandling } from '../utils/helpers';

/**
 * Custom hook for managing Project Eden data
 */
export const useProjectEdenData = () => {
  const { currentUser } = useAuth();
  
  // State
  const [stats, setStats] = useState({
    articlesAggregated: 0,
    articlesAnalyzed: 0,
    contentGenerated: 0,
    pendingReview: 0,
    approvedContent: 0,
    totalArticlesProcessed: 0,
    activeSources: 0
  });
  
  const [contentForReview, setContentForReview] = useState([]);
  const [approvedContent, setApprovedContent] = useState([]);
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
  
  // Build API URL
  const buildUrl = useCallback((endpoint, params = {}) => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const url = new URL(endpoint, baseUrl || window.location.origin);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    return url.toString();
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      
      // Fetch all data in parallel
      const [
        reviewResponse,
        approvedResponse,
        articlesResponse,
        statsResponse,
        jobStatsResponse,
        bookmarksResponse,
        sourcesResponse
      ] = await Promise.all([
        fetch(`${baseUrl}${API_ENDPOINTS.CONTENT_REVIEW}`),
        fetch(`${baseUrl}${API_ENDPOINTS.CONTENT_REVIEW}?status=approved`),
        fetch(`${baseUrl}${API_ENDPOINTS.NEWS_STORIES}?limit=100&minScore=0.1`),
        fetch(`${baseUrl}${API_ENDPOINTS.GENERATION_STATS}`),
        fetch(`${baseUrl}${API_ENDPOINTS.JOB_STATS}`),
        currentUser?.uid ? fetch(`${baseUrl}${API_ENDPOINTS.BOOKMARKS}/ids?userId=${currentUser.uid}`) : 
          Promise.resolve({ json: () => ({ articleIds: [] }) }),
        fetch(`${baseUrl}${API_ENDPOINTS.SOURCES_STATUS}`)
      ]);

      // Process responses
      const reviewData = reviewResponse.ok ? await reviewResponse.json() : { content: [] };
      const approvedData = approvedResponse.ok ? await approvedResponse.json() : { content: [] };
      const articlesData = articlesResponse.ok ? await articlesResponse.json() : { stories: [] };
      const sourcesData = sourcesResponse.ok ? await sourcesResponse.json() : { sources: [] };

      setContentForReview(reviewData.content || []);
      setApprovedContent(approvedData.content || []);
      setAllArticles(articlesData.stories || []);
      setSources(sourcesData.sources || []);

      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data.stats || {
          articlesAggregated: 0,
          articlesAnalyzed: 0,
          contentGenerated: 0,
          contentApproved: 0,
          totalBlogs: 0,
          totalSocialPosts: 0,
          totalVideoScripts: 0
        });
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

      // Update computed stats
      const totalArticles = sourcesData.sources.reduce((sum, source) => sum + source.articles_last_24h, 0);
      const activeSources = sourcesData.sources.filter(source => source.is_active).length;
      
      setStats(prev => ({ 
        ...prev, 
        articlesAggregated: totalArticles,
        activeSources: activeSources,
        articlesAnalyzed: articlesData.stories?.length || 0,
        pendingReview: reviewData.content?.length || 0,
        approvedContent: approvedData.content?.length || 0,
        totalArticlesProcessed: articlesData.stories?.length || 0
      }));

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(ERROR_MESSAGES.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  }, [currentUser, buildUrl]);

  // Fetch jobs data
  const fetchJobs = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const [jobsResponse, statsResponse] = await Promise.all([
        fetch(`${baseUrl}${API_ENDPOINTS.JOBS_RECENT}?limit=20`),
        fetch(`${baseUrl}${API_ENDPOINTS.JOB_STATS}`)
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
  }, []);

  // Toggle bookmark/favorite
  const toggleFavorite = useCallback(async (articleId) => {
    if (!currentUser?.uid) {
      console.warn('User must be logged in to bookmark articles');
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL || '';
    const newFavorites = new Set(favoriteStories);
    
    try {
      if (favoriteStories.has(articleId)) {
        // Remove bookmark
        const response = await fetch(`${baseUrl}${API_ENDPOINTS.BOOKMARKS}?userId=${currentUser.uid}&articleId=${articleId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          newFavorites.delete(articleId);
          console.log(`Removed bookmark for article ${articleId}`);
        } else {
          throw new Error('Failed to remove bookmark');
        }
      } else {
        // Add bookmark
        const response = await fetch(`${baseUrl}${API_ENDPOINTS.BOOKMARKS}`, {
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
  }, [currentUser, favoriteStories]);

  // Set up automatic data refresh
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, REFRESH_INTERVALS.DATA_REFRESH);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    // Data
    stats,
    contentForReview,
    approvedContent,
    allArticles,
    sources,
    jobStats,
    workerStatus,
    favoriteStories,
    
    // State
    loading,
    error,
    
    // Actions
    fetchData,
    fetchJobs,
    toggleFavorite,
    
    // Setters for external updates
    setContentForReview,
    setApprovedContent,
    setAllArticles,
    setSources,
    setJobStats,
    setWorkerStatus,
    setStats
  };
};

export default useProjectEdenData; 