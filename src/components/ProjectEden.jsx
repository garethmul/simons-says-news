import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ProgressModal from './ProgressModal';
import PromptManagement from './PromptManagement';
import LogViewer from './LogViewer';
import { 
  RefreshCw, 
  Eye, 
  Edit, 
  Check, 
  X, 
  Play, 
  Image, 
  FileText, 
  Video, 
  Share2,
  TrendingUp,
  Clock,
  Users,
  BookOpen,
  Heart,
  MessageSquare,
  ExternalLink,
  Calendar,
  Star,
  Loader2,
  HelpCircle,
  Terminal,
  Search,
  LogOut,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ProjectEden = () => {
  const { currentUser, logout } = useAuth();
  
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
  const [topStories, setTopStories] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Top Stories state
  const [topStoriesPage, setTopStoriesPage] = useState(1);
  const [topStoriesSearch, setTopStoriesSearch] = useState('');
  const [topStoriesSortBy, setTopStoriesSortBy] = useState('relevance');
  const [favoriteStories, setFavoriteStories] = useState(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const topStoriesPerPage = 10;

  // State for approved content modal
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [selectedApprovedContent, setSelectedApprovedContent] = useState(null);

  // Pagination state for all articles
  const [allArticlesPage, setAllArticlesPage] = useState(1);
  const [articlesPerPage] = useState(10);

  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [jobStats, setJobStats] = useState({
    summary: { total_jobs: 0, queued: 0, processing: 0, completed: 0, failed: 0 },
    details: []
  });
  const [workerStatus, setWorkerStatus] = useState({ isRunning: false, currentJob: null });
  const [jobsLoading, setJobsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Additional state variables
  const [analyzingMore, setAnalyzingMore] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);

  // Hash routing functionality
  useEffect(() => {
    // Function to get tab from URL hash
    const getTabFromHash = () => {
      const hash = window.location.hash.substring(1); // Remove the #
      const validTabs = ['dashboard', 'review', 'approved', 'stories', 'jobs', 'prompts'];
      return validTabs.includes(hash) ? hash : 'dashboard';
    };

    // Set initial tab from URL
    setActiveTab(getTabFromHash());

    // Listen for hash changes
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Function to handle tab changes and update URL
  const handleTabChange = (tabValue) => {
    setActiveTab(tabValue);
    window.history.pushState(null, null, `#${tabValue}`);
  };

  // Helper function to get direct link to a tab
  const getTabUrl = (tabValue) => {
    return `${window.location.origin}${window.location.pathname}#${tabValue}`;
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
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
        fetch(`${baseUrl}/api/eden/content/review`),
        fetch(`${baseUrl}/api/eden/content/review?status=approved`),
        fetch(`${baseUrl}/api/eden/news/top-stories?limit=100&minScore=0.1`),
        fetch(`${baseUrl}/api/eden/stats/generation`),
        fetch(`${baseUrl}/api/eden/jobs/queue/stats`),
        // Fetch user's bookmarks
        currentUser?.uid ? fetch(`${baseUrl}/api/eden/bookmarks/ids?userId=${currentUser.uid}`) : Promise.resolve({ json: () => ({ articleIds: [] }) }),
        fetch(`${baseUrl}/api/eden/news/sources/status`)
      ]);

      // Store data for later use
      let reviewData = { content: [] };
      let approvedData = { content: [] };
      let articlesData = { stories: [] };
      let sourcesData = { sources: [] };

      if (reviewResponse.ok) {
        reviewData = await reviewResponse.json();
        setContentForReview(reviewData.content || []);
      }

      if (approvedResponse.ok) {
        approvedData = await approvedResponse.json();
        setApprovedContent(approvedData.content || []);
      }

      if (articlesResponse.ok) {
        articlesData = await articlesResponse.json();
        setAllArticles(articlesData.stories || []);
        setTopStories(articlesData.stories?.slice(0, 10) || []);
      }

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

      if (sourcesResponse.ok) {
        sourcesData = await sourcesResponse.json();
        setSources(sourcesData.sources || []);
      }

      // Update stats with all the data
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

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Fetch data from server
  useEffect(() => {
    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser]);

  // Fetch jobs when Jobs tab is accessed
  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchJobs();
    }
  }, [activeTab]);

  const approveContent = async (contentId, contentType) => {
    try {
      console.log(`✅ Approving ${contentType} ${contentId}`);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/content/${contentType}/${contentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      
      if (response.ok) {
        console.log(`✅ Content approved successfully`);
        await fetchData();
      } else {
        console.error('Failed to approve content');
      }
    } catch (error) {
      console.error('Error approving content:', error);
    }
  };
  
  const rejectContent = async (contentId, contentType) => {
    try {
      console.log(`❌ Rejecting ${contentType} ${contentId}`);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/content/${contentType}/${contentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      
      if (response.ok) {
        console.log(`✅ Content rejected successfully`);
        await fetchData();
      } else {
        console.error('Failed to reject content');
      }
    } catch (error) {
      console.error('Error rejecting content:', error);
    }
  };

  const analyzeMoreArticles = async () => {
    setAnalyzingMore(true);
    try {
      console.log('🧠 Analyzing more articles...');
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/news/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Analyzed ${data.analyzed} more articles`);
        await fetchData(); // Refresh to show newly analyzed articles
      } else {
        console.error('Failed to analyze more articles');
      }
    } catch (error) {
      console.error('Error analyzing more articles:', error);
    } finally {
      setAnalyzingMore(false);
    }
  };

  const runFullCycle = async () => {
    try {
      console.log('🤖 Starting full automation cycle...');
      setShowProgressModal(true);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/automate/full-cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Full cycle job created:', data.jobId);
        setShowProgressModal(false);
        await fetchData();
      } else {
        console.error('Failed to start automation cycle');
        setShowProgressModal(false);
      }
    } catch (error) {
      console.error('Error running full cycle:', error);
      setShowProgressModal(false);
    }
  };

  const cancelJob = async (jobId) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/jobs/${jobId}/cancel`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log('✅ Job cancelled:', jobId);
        fetchJobs(); // Refresh jobs list
      } else {
        const errorData = await response.json();
        console.error('❌ Job cancellation failed:', errorData.error);
        alert(`Failed to cancel job: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Job cancellation error:', error);
      alert(`Error cancelling job: ${error.message}`);
    }
  };

  const retryJob = async (jobId) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/jobs/${jobId}/retry`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log('✅ Job retried:', jobId);
        fetchJobs(); // Refresh jobs list
      } else {
        const errorData = await response.json();
        console.error('❌ Job retry failed:', errorData.error);
        alert(`Failed to retry job: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Job retry error:', error);
      alert(`Error retrying job: ${error.message}`);
    }
  };

  const resetAutomation = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/automate/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('Automation progress reset successfully');
        setShowProgressModal(false);
      }
    } catch (error) {
      console.error('Error resetting automation:', error);
    }
  };

  const handleProgressComplete = async (results) => {
    // Update stats with results from automation
    if (results) {
      setStats(prev => ({
        ...prev,
        articlesAggregated: results.articlesAggregated || prev.articlesAggregated,
        articlesAnalyzed: results.articlesAnalyzed || prev.articlesAnalyzed,
        contentGenerated: results.contentGenerated || prev.contentGenerated
      }));
    }
    
    // Refresh all dashboard data
    await fetchData();
    
    // Close progress modal after a short delay
    setTimeout(() => {
      setShowProgressModal(false);
    }, 2000);
  };

  const updateContentStatus = async (contentType, contentId, newStatus) => {
    try {
      console.log(`📝 Updating ${contentType} ${contentId} to ${newStatus}`);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/content/${contentType}/${contentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        console.log(`✅ Status updated successfully`);
        await fetchData(); // Refresh data
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const openDetailedReview = (content) => {
    setSelectedContent(content);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedContent(null);
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      review_pending: 'warning',
      approved: 'success',
      published: 'default',
      rejected: 'destructive'
    };
    
    return <Badge variant={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  // Top Stories helper functions
  const toggleFavoriteStory = (storyId) => {
    const newFavorites = new Set(favoriteStories);
    if (newFavorites.has(storyId)) {
      newFavorites.delete(storyId);
    } else {
      newFavorites.add(storyId);
    }
    setFavoriteStories(newFavorites);
  };

  // Toggle favorite/bookmark status
  const toggleFavorite = async (articleId) => {
    if (!currentUser?.uid) {
      console.warn('User must be logged in to bookmark articles');
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL || '';
    const newFavorites = new Set(favoriteStories);
    
    try {
      if (favoriteStories.has(articleId)) {
        // Remove bookmark
        const response = await fetch(`${baseUrl}/api/eden/bookmarks?userId=${currentUser.uid}&articleId=${articleId}`, {
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
        const response = await fetch(`${baseUrl}/api/eden/bookmarks`, {
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
      // Revert on error
      setFavoriteStories(favoriteStories);
    }
  };

  const getFilteredAndSortedStories = () => {
    let filtered = allArticles;

    // Apply search filter
    if (topStoriesSearch) {
      filtered = filtered.filter(story => {
        if (!story) return false;
        
        const searchLower = topStoriesSearch.toLowerCase();
        const titleMatch = story.title && story.title.toLowerCase().includes(searchLower);
        const sourceMatch = story.source_name && story.source_name.toLowerCase().includes(searchLower);
        const keywordsMatch = story.keywords_ai && story.keywords_ai.toLowerCase().includes(searchLower);
        
        return titleMatch || sourceMatch || keywordsMatch;
      });
    }

    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(story => favoriteStories.has(story.article_id));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (topStoriesSortBy) {
        case 'relevance':
          return b.relevance_score - a.relevance_score;
        case 'date':
          return new Date(b.publication_date) - new Date(a.publication_date);
        case 'source':
          return (a.source_name || '').localeCompare(b.source_name || '');
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return b.relevance_score - a.relevance_score;
      }
    });

    return filtered;
  };

  const getPaginatedStories = () => {
    const filtered = getFilteredAndSortedStories();
    const start = (topStoriesPage - 1) * topStoriesPerPage;
    const end = start + topStoriesPerPage;
    return {
      stories: filtered.slice(start, end),
      totalStories: filtered.length,
      totalPages: Math.ceil(filtered.length / topStoriesPerPage)
    };
  };

  // Job management functions
  const fetchJobs = async () => {
    try {
      setJobsLoading(true);
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const [jobsResponse, statsResponse] = await Promise.all([
        fetch(`${baseUrl}/api/eden/jobs/recent?limit=20`),
        fetch(`${baseUrl}/api/eden/jobs/queue/stats`)
      ]);
      
      if (jobsResponse.ok && statsResponse.ok) {
        const jobsData = await jobsResponse.json();
        const statsData = await statsResponse.json();
        
        setJobs(jobsData.jobs || []);
        setJobStats(statsData.stats || { summary: {}, details: [] });
        setWorkerStatus(statsData.worker || { isRunning: false });
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setJobsLoading(false);
    }
  };

  const generateContentFromStory = async (storyId) => {
    try {
      setGenerating(true);
      console.log('Creating content generation job for story:', storyId);
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/content/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1, specificStoryId: storyId })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Content generation job created:', data.jobId);
        
        // Show success notification
        alert(`Content generation job created! Job ID: ${data.jobId}\nCheck the Jobs tab to monitor progress.`);
        
        // Refresh jobs list
        fetchJobs();
      } else {
        const errorData = await response.json();
        console.error('❌ Job creation failed:', errorData.error);
        alert(`Failed to create job: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Job creation error:', error);
      alert(`Error creating job: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const startJobWorker = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/jobs/worker/start`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log('✅ Job worker started');
        // Refresh worker status
        fetchJobs();
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to start job worker:', errorData.error);
        alert(`Failed to start job worker: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Error starting job worker:', error);
      alert(`Error starting job worker: ${error.message}`);
    }
  };

  const createContentJob = async (specificStoryId = null) => {
    try {
      setGeneratingContent(true);
      console.log('📝 Creating content generation job...');
      
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const payload = specificStoryId 
        ? { specificStoryId }
        : { limit: 5 };
      
      const response = await fetch(`${baseUrl}/api/eden/content/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Content generation job created:', data.jobId);
        
        // Refresh data and switch to jobs tab
        await fetchData();
        handleTabChange('jobs');
      } else {
        const errorData = await response.json();
        console.error('❌ Content generation failed:', errorData.error);
        alert(`Failed to create content: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Content generation error:', error);
      alert(`Error creating content: ${error.message}`);
    } finally {
      setGeneratingContent(false);
    }
  };

  // Loading skeleton component
  const LoadingCard = ({ lines = 3 }) => (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </CardHeader>
      <CardContent>
        {[...Array(lines)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded mb-2" style={{ width: `${80 + Math.random() * 20}%` }}></div>
        ))}
      </CardContent>
    </Card>
  );

  // Professional loading state
  const LoadingState = ({ message = "Loading content...", count = 3 }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-gray-600 font-medium">{message}</span>
        </div>
      </div>
      {[...Array(count)].map((_, i) => (
        <LoadingCard key={i} lines={3 + (i % 2)} />
      ))}
    </div>
  );

  // Simple LiveLogs button component
  const LiveLogs = () => (
    <Button 
      onClick={() => setShowLogViewer(true)} 
      variant="outline" 
      disabled={showProgressModal}
    >
      <Terminal className="w-4 h-4 mr-2" />
      Live Logs
    </Button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Disabled overlay when automation is running */}
        {showProgressModal && (
          <div className="fixed inset-0 bg-white bg-opacity-60 z-40 pointer-events-none" />
        )}
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Project Eden</h1>
              <p className="text-lg text-gray-600">AI-Powered Content Automation for Eden.co.uk</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={fetchData} variant="outline" disabled={loading || showProgressModal}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={runFullCycle} disabled={loading || showProgressModal}>
                <Zap className="w-4 h-4 mr-2" />
                Run Full Cycle
              </Button>
              <LiveLogs />
              <Button 
                variant="ghost" 
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout ({currentUser?.email})
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className={`grid grid-cols-1 md:grid-cols-5 gap-6 mb-8 ${showProgressModal ? 'opacity-50 pointer-events-none' : ''}`}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles Aggregated</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.articlesAggregated}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles Analyzed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.articlesAnalyzed}</div>
              <p className="text-xs text-muted-foreground">AI relevance scoring</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Generated</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.contentGenerated}</div>
              <p className="text-xs text-muted-foreground">Blog posts, social, video</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingReview}</div>
              <p className="text-xs text-muted-foreground">Awaiting human approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Content</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approvedContent}</div>
              <p className="text-xs text-muted-foreground">Ready for publishing</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="review">Review ({contentForReview.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedContent.length})</TabsTrigger>
            <TabsTrigger value="stories">Stories ({allArticles.length})</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
          </TabsList>

          {/* Automation Running Message */}
          {showProgressModal && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <div>
                    <p className="font-medium text-gray-900">Automation in Progress</p>
                    <p className="text-sm text-gray-600">Please wait while Project Eden processes your request</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {loading ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
                        <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <LoadingState message="Loading dashboard statistics..." count={4} />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>System Overview</CardTitle>
                    <CardDescription>
                      Project Eden automation status and recent activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* System Status */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center">
                              <Check className="w-5 h-5 text-green-600 mr-2" />
                              <span className="font-medium text-green-800">News Aggregation</span>
                            </div>
                            <Badge variant="success">Active</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center">
                              <Check className="w-5 h-5 text-green-600 mr-2" />
                              <span className="font-medium text-green-800">AI Analysis</span>
                            </div>
                            <Badge variant="success">Active</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center">
                              <Check className="w-5 h-5 text-green-600 mr-2" />
                              <span className="font-medium text-green-800">Content Generation</span>
                            </div>
                            <Badge variant="success">Active</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center">
                              <Loader2 className="w-5 h-5 text-blue-600 mr-2" />
                              <span className="font-medium text-blue-800">Job Worker</span>
                            </div>
                            <Badge variant={workerStatus.isRunning ? 'success' : 'secondary'}>
                              {workerStatus.isRunning ? 'Running' : 'Stopped'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                        <div className="space-y-3">
                          <Button onClick={runFullCycle} className="w-full justify-start" disabled={loading || showProgressModal}>
                            <Zap className="w-4 h-4 mr-2" />
                            Run Full Automation Cycle
                          </Button>
                          <Button 
                            onClick={() => handleTabChange('stories')} 
                            variant="outline" 
                            className="w-full justify-start"
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            View Stories ({allArticles.length})
                          </Button>
                          <Button 
                            onClick={() => handleTabChange('review')} 
                            variant="outline" 
                            className="w-full justify-start"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review Content ({contentForReview.length})
                          </Button>
                          <Button 
                            onClick={() => handleTabChange('jobs')} 
                            variant="outline" 
                            className="w-full justify-start"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Monitor Jobs ({jobStats.summary.total_jobs || 0})
                          </Button>
                          <Button 
                            onClick={() => handleTabChange('prompts')} 
                            variant="outline" 
                            className="w-full justify-start"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Manage Prompts
                          </Button>
                          {!workerStatus.isRunning && (
                            <Button 
                              onClick={startJobWorker} 
                              variant="outline" 
                              className="w-full justify-start text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start Job Worker
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        {stats.articlesAggregated > 0 && (
                          <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <FileText className="w-5 h-5 text-blue-600 mr-3" />
                            <span className="text-blue-800">
                              {stats.articlesAggregated} articles aggregated from {stats.activeSources} news sources
                            </span>
                          </div>
                        )}
                        {stats.articlesAnalyzed > 0 && (
                          <div className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <TrendingUp className="w-5 h-5 text-purple-600 mr-3" />
                            <span className="text-purple-800">
                              {stats.articlesAnalyzed} articles analyzed for relevance
                            </span>
                          </div>
                        )}
                        {stats.contentGenerated > 0 && (
                          <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                            <BookOpen className="w-5 h-5 text-green-600 mr-3" />
                            <span className="text-green-800">
                              {stats.contentGenerated} content pieces generated
                            </span>
                          </div>
                        )}
                        {stats.pendingReview > 0 && (
                          <div className="flex items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <Eye className="w-5 h-5 text-orange-600 mr-3" />
                            <span className="text-orange-800">
                              {stats.pendingReview} content pieces awaiting review
                            </span>
                          </div>
                        )}
                        {(stats.articlesAggregated === 0 && stats.articlesAnalyzed === 0 && stats.contentGenerated === 0) && (
                          <div className="text-center py-6 text-gray-500">
                            <div className="text-sm">No recent activity</div>
                            <div className="text-xs mt-1">Run the full cycle to start processing content</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Content Review Tab */}
          <TabsContent value="review" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Content Awaiting Review</CardTitle>
                    <CardDescription>
                      Review and approve AI-generated content before publishing
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {contentForReview.length} items pending
                  </Badge>
                </div>
                
                {/* Explanatory section */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">📋 What you're viewing:</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    AI-generated content based on top Christian news stories. Each piece includes blog posts, social media content, and video scripts created from relevant news articles.
                  </p>
                  <h4 className="font-semibold text-blue-900 mb-1">🎯 Next steps:</h4>
                  <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                    <li>Review each content piece for accuracy and tone</li>
                    <li>Check source article information for context</li>
                    <li>Approve quality content or reject for revision</li>
                    <li>Approved content moves to the "Approved Content" tab</li>
                  </ul>
                </div>
              </CardHeader>
              <CardContent>
                {loading && contentForReview.length === 0 ? (
                  <LoadingState message="Loading content for review..." count={3} />
                ) : contentForReview.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No content pending review</p>
                    <p className="text-sm">Run the full cycle to generate new content</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <span>Showing {contentForReview.length} content piece{contentForReview.length !== 1 ? 's' : ''}</span>
                      <span>Total pending review: {stats.pendingReview}</span>
                    </div>
                    {contentForReview.map((content, index) => (
                      <Card key={`review-content-${content.gen_article_id}`} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-lg">{content.title}</CardTitle>
                                <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                              </div>
                              <CardDescription className="mt-2">
                                {content.content_type} • {content.word_count} words • 
                                Created {new Date(content.created_at).toLocaleDateString()}
                              </CardDescription>
                              
                              {/* Date/Time Information */}
                              <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Created: {new Date(content.created_at).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {Math.floor((new Date() - new Date(content.created_at)) / (1000 * 60 * 60 * 24))} days ago
                                </span>
                              </div>
                              
                              {/* Source Article Information */}
                              {content.sourceArticle && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">Source Article</span>
                                    <Badge variant="outline" className="text-xs">
                                      <Star className="w-3 h-3 mr-1" />
                                      {(content.sourceArticle.relevance_score * 100).toFixed(0)}% relevance
                                    </Badge>
                                  </div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                                    {content.sourceArticle.title}
                                  </h4>
                                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(content.sourceArticle.publication_date).toLocaleDateString()}
                                    </span>
                                    <span>{content.sourceArticle.source_name}</span>
                                  </div>
                                  <p className="text-xs text-gray-700 line-clamp-2 mb-2">
                                    {content.sourceArticle.summary}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-wrap gap-1">
                                      {content.sourceArticle.keywords?.split(',').slice(0, 3).map((keyword, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {keyword.trim()}
                                        </Badge>
                                      ))}
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-xs h-6 px-2"
                                      onClick={() => window.open(content.sourceArticle.url, '_blank')}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      View Original
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(content.status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="prose max-w-none mb-4">
                            <div 
                              className="text-sm text-gray-700 line-clamp-3"
                              dangerouslySetInnerHTML={{ 
                                __html: content.body_draft?.substring(0, 300) + '...' 
                              }}
                            />
                          </div>
                          
                          {/* Associated Content */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {content.socialPosts?.length > 0 && (
                              <Badge variant="outline">
                                <Share2 className="w-3 h-3 mr-1" />
                                {content.socialPosts.length} Social Posts
                              </Badge>
                            )}
                            {content.videoScripts?.length > 0 && (
                              <Badge variant="outline">
                                <Video className="w-3 h-3 mr-1" />
                                {content.videoScripts.length} Video Scripts
                              </Badge>
                            )}
                            {content.images?.length > 0 && (
                              <Badge variant="outline">
                                <Image className="w-3 h-3 mr-1" />
                                {content.images.length} Images
                              </Badge>
                            )}
                          </div>

                          {/* Generated Images Gallery */}
                          {content.images && content.images.length > 0 && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center gap-2 mb-3">
                                <Image className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">Generated Images ({content.images.length})</span>
                                <Badge variant="secondary" className="text-xs">Sirv CDN + Pexels</Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                {content.images.map((image, imageIndex) => (
                                  <div key={`content-${content.gen_article_id}-image-${image.id || imageIndex}`} className="relative group">
                                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 border">
                                      <img
                                        src={image.sirvUrl}
                                        alt={image.altText}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        loading="lazy"
                                        onError={(e) => {
                                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNHB4IiBmaWxsPSIjNjU3Mzg5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgZXJyb3I8L3RleHQ+PC9zdmc+';
                                        }}
                                      />
                                    </div>
                                    {/* Image overlay with details */}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <div className="text-white text-center p-2">
                                        <div className="text-xs font-medium mb-1">#{imageIndex + 1}</div>
                                        <div className="text-xs text-gray-200 line-clamp-2 mb-2">{image.altText}</div>
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => window.open(image.sirvUrl, '_blank')}
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                    {/* Search query badge */}
                                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Badge variant="outline" className="text-xs bg-white/90 text-gray-700">
                                        {image.query}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Images sourced from Pexels and optimised via Sirv CDN • AI-generated alt text and search queries
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openDetailedReview(content)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => approveContent(content.gen_article_id, content.content_type)}
                              disabled={loading}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => rejectContent(content.gen_article_id, content.content_type)}
                              disabled={loading}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approved Content Tab */}
          <TabsContent value="approved" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Approved Content</CardTitle>
                    <CardDescription>
                      Content approved and ready for publishing to Eden.co.uk
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {approvedContent.length} items ready
                  </Badge>
                </div>
                
                {/* Explanatory section */}
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">✅ What you're viewing:</h3>
                  <p className="text-sm text-green-800 mb-3">
                    Human-approved content that has passed quality review. These pieces are ready for publication and include all associated social media posts and video scripts.
                  </p>
                  <h4 className="font-semibold text-green-900 mb-1">🚀 Next steps:</h4>
                  <ul className="text-sm text-green-800 list-disc list-inside space-y-1">
                    <li>Publish content directly to Eden.co.uk</li>
                    <li>Schedule social media posts across platforms</li>
                    <li>Use video scripts for content creation</li>
                    <li>Return to review if changes are needed</li>
                  </ul>
                </div>
              </CardHeader>
              <CardContent>
                {loading && approvedContent.length === 0 ? (
                  <LoadingState message="Loading approved content..." count={3} />
                ) : approvedContent.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No approved content</p>
                    <p className="text-sm">Approve content from the review tab to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <span>Showing {approvedContent.length} approved piece{approvedContent.length !== 1 ? 's' : ''}</span>
                      <span>Total approved: {stats.approvedContent}</span>
                    </div>
                    {approvedContent.map((content, index) => (
                      <Card key={`approved-content-${content.gen_article_id}`} className="border-l-4 border-l-green-500">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-lg">{content.title}</CardTitle>
                                <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                              </div>
                              <CardDescription className="mt-2">
                                {content.content_type} • {content.word_count} words • 
                                Approved {new Date(content.reviewed_by_human_at || content.created_at).toLocaleDateString()}
                              </CardDescription>
                              
                              {/* Source Article Information */}
                              {content.sourceArticle && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">Source Article</span>
                                    <Badge variant="outline" className="text-xs">
                                      <Star className="w-3 h-3 mr-1" />
                                      {(content.sourceArticle.relevance_score * 100).toFixed(0)}% relevance
                                    </Badge>
                                  </div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                                    {content.sourceArticle.title}
                                  </h4>
                                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(content.sourceArticle.publication_date).toLocaleDateString()}
                                    </span>
                                    <span>{content.sourceArticle.source_name}</span>
                                  </div>
                                  <p className="text-xs text-gray-700 line-clamp-2 mb-2">
                                    {content.sourceArticle.summary}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-wrap gap-1">
                                      {content.sourceArticle.keywords?.split(',').slice(0, 3).map((keyword, keywordIndex) => (
                                        <Badge key={`approved-${content.gen_article_id}-source-keyword-${keywordIndex}`} variant="secondary" className="text-xs">
                                          {keyword.trim()}
                                        </Badge>
                                      ))}
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-xs h-6 px-2"
                                      onClick={() => window.open(content.sourceArticle.url, '_blank')}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      View Original
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(content.status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="prose max-w-none mb-4">
                            <div 
                              className="text-sm text-gray-700 line-clamp-3"
                              dangerouslySetInnerHTML={{ 
                                __html: content.body_draft?.substring(0, 300) + '...' 
                              }}
                            />
                          </div>
                          
                          {/* Associated Content */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {content.socialPosts?.length > 0 && (
                              <Badge variant="outline">
                                <Share2 className="w-3 h-3 mr-1" />
                                {content.socialPosts.length} Social Posts
                              </Badge>
                            )}
                            {content.videoScripts?.length > 0 && (
                              <Badge variant="outline">
                                <Video className="w-3 h-3 mr-1" />
                                {content.videoScripts.length} Video Scripts
                              </Badge>
                            )}
                            {content.images?.length > 0 && (
                              <Badge variant="outline">
                                <Image className="w-3 h-3 mr-1" />
                                {content.images.length} Images
                              </Badge>
                            )}
                          </div>

                          {/* Generated Images Gallery */}
                          {content.images && content.images.length > 0 && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center gap-2 mb-3">
                                <Image className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">Generated Images ({content.images.length})</span>
                                <Badge variant="secondary" className="text-xs">Sirv CDN + Pexels</Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                {content.images.map((image, imageIndex) => (
                                  <div key={`content-${content.gen_article_id}-image-${image.id || imageIndex}`} className="relative group">
                                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 border">
                                      <img
                                        src={image.sirvUrl}
                                        alt={image.altText}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        loading="lazy"
                                        onError={(e) => {
                                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNHB4IiBmaWxsPSIjNjU3Mzg5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgZXJyb3I8L3RleHQ+PC9zdmc+';
                                        }}
                                      />
                                    </div>
                                    {/* Image overlay with details */}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <div className="text-white text-center p-2">
                                        <div className="text-xs font-medium mb-1">#{imageIndex + 1}</div>
                                        <div className="text-xs text-gray-200 line-clamp-2 mb-2">{image.altText}</div>
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => window.open(image.sirvUrl, '_blank')}
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                    {/* Search query badge */}
                                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Badge variant="outline" className="text-xs bg-white/90 text-gray-700">
                                        {image.query}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Images sourced from Pexels and optimised via Sirv CDN • AI-generated alt text and search queries
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openDetailedReview(content)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => updateContentStatus('article', content.gen_article_id, 'published')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Publish
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateContentStatus('article', content.gen_article_id, 'review_pending')}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Return to Review
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Stories Tab */}
          <TabsContent value="stories" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Christian News Stories</CardTitle>
                    <CardDescription>
                      All analyzed stories for Eden's content strategy
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {allArticles.length} analyzed stories
                  </Badge>
                </div>
                
                {/* Explanatory section */}
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2">🏆 What you're viewing:</h3>
                  <p className="text-sm text-purple-800 mb-3">
                    All {allArticles.length} analyzed Christian news stories from {stats.articlesAggregated} articles discovered across {stats.activeSources} news sources. 
                    Stories are ranked by AI relevance scoring based on Christian themes, values, and Eden's audience interests.
                  </p>
                  <h4 className="font-semibold text-purple-900 mb-1">🎯 Story breakdown:</h4>
                  <ul className="text-sm text-purple-800 list-disc list-inside space-y-1 mb-3">
                    <li>{allArticles.filter(a => a.relevance_score >= 0.6).length} high relevance stories (60%+ score)</li>
                    <li>{allArticles.filter(a => a.relevance_score >= 0.3 && a.relevance_score < 0.6).length} moderate relevance stories (30-60% score)</li>
                    <li>{allArticles.filter(a => a.relevance_score < 0.3).length} lower relevance stories (&lt;30% score)</li>
                    <li>AI filters for Christian themes, values, and audience alignment</li>
                  </ul>
                  <h4 className="font-semibold text-purple-900 mb-1">📈 Next steps:</h4>
                  <ul className="text-sm text-purple-800 list-disc list-inside space-y-1">
                    <li>Generate AI content from high-scoring stories</li>
                    <li>Review source articles for additional context</li>
                    <li>Use "Generate Content" to create blog posts and social media</li>
                    <li>Star your favorite stories for quick access</li>
                  </ul>
                </div>
              </CardHeader>
              <CardContent>
                {loading && allArticles.length === 0 ? (
                  <LoadingState message="Loading stories..." count={5} />
                ) : allArticles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No analyzed stories available</p>
                    <p className="text-sm">Run news aggregation and analysis to see stories</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search and Filter Controls */}
                    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-64">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <Input
                            placeholder="Search stories, sources, or keywords..."
                            value={topStoriesSearch}
                            onChange={(e) => {
                              setTopStoriesSearch(e.target.value);
                              setTopStoriesPage(1); // Reset to first page
                            }}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      <Select value={topStoriesSortBy} onValueChange={setTopStoriesSortBy}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Sort by Relevance</SelectItem>
                          <SelectItem value="date">Sort by Date</SelectItem>
                          <SelectItem value="source">Sort by Source</SelectItem>
                          <SelectItem value="title">Sort by Title</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant={showFavoritesOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setShowFavoritesOnly(!showFavoritesOnly);
                          setTopStoriesPage(1);
                        }}
                      >
                        <Star className={`w-4 h-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                        {showFavoritesOnly ? 'Show All' : 'Favorites Only'}
                      </Button>
                    </div>

                    {(() => {
                      const { stories, totalStories, totalPages } = getPaginatedStories();
                      
                      return (
                        <>
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                            <span>
                              Showing {((topStoriesPage - 1) * topStoriesPerPage) + 1}-{Math.min(topStoriesPage * topStoriesPerPage, totalStories)} of {totalStories} stories
                              {showFavoritesOnly && ` (${favoriteStories.size} favorites)`}
                            </span>
                            <span>{allArticles.length} total analyzed • {stats.articlesAggregated} discovered</span>
                          </div>

                          {stories.map((story, index) => (
                            <Card key={`top-story-${story.article_id}`} className="border-l-4 border-l-green-500">
                              <CardHeader>
                                <div className="flex items-center gap-2 mb-2">
                                  <CardTitle className="text-lg flex-1">{story.title}</CardTitle>
                                  <Badge variant="outline" className="text-xs">
                                    #{((topStoriesPage - 1) * topStoriesPerPage) + index + 1}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {(story.relevance_score * 100).toFixed(0)}% relevance
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleFavorite(story.article_id)}
                                    className="p-1 h-8 w-8"
                                  >
                                    <Star className={`w-4 h-4 ${favoriteStories.has(story.article_id) ? 'fill-current text-yellow-500' : 'text-gray-400'}`} />
                                  </Button>
                                </div>
                                <CardDescription>
                                  {story.source_name} • 
                                  {new Date(story.publication_date).toLocaleDateString()}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-gray-700 mb-3">{story.summary_ai}</p>
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {story.keywords_ai?.split(',').slice(0, 5).map((keyword, keywordIndex) => (
                                    <Badge key={`story-${story.article_id}-keyword-${keywordIndex}`} variant="secondary" className="text-xs">
                                      {keyword.trim()}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => window.open(story.url, '_blank')}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Original
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => generateContentFromStory(story.article_id)}
                                    disabled={loading}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Generate Content
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTopStoriesPage(Math.max(1, topStoriesPage - 1))}
                                disabled={topStoriesPage === 1}
                              >
                                Previous
                              </Button>
                              
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                  const pageNum = Math.max(1, Math.min(totalPages - 4, topStoriesPage - 2)) + i;
                                  if (pageNum > totalPages) return null;
                                  
                                  return (
                                    <Button
                                      key={`top-stories-page-${pageNum}`}
                                      variant={pageNum === topStoriesPage ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setTopStoriesPage(pageNum)}
                                      className="w-8 h-8 p-0"
                                    >
                                      {pageNum}
                                    </Button>
                                  );
                                })}
                              </div>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTopStoriesPage(Math.min(totalPages, topStoriesPage + 1))}
                                disabled={topStoriesPage === totalPages}
                              >
                                Next
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Articles Tab */}
          <TabsContent value="all-articles" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Articles</CardTitle>
                    <CardDescription>
                      All articles processed by Project Eden
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {allArticles.length} analyzed articles
                  </Badge>
                </div>
                
                {/* Explanatory section */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">📊 What you're viewing:</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Complete list of {allArticles.length} articles that have been analyzed by AI from {stats.articlesAggregated} total articles discovered. 
                    Each article has been scored for relevance to Christian audiences and Eden's content strategy.
                  </p>
                  <h4 className="font-semibold text-gray-900 mb-1">🔍 Why only {allArticles.length} of {stats.articlesAggregated} articles?</h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                    <li>AI analysis is performed in batches of 20 articles at a time to manage API costs</li>
                    <li>Only analyzed articles (with AI relevance scores) are shown here</li>
                    <li>{stats.articlesAggregated - allArticles.length} articles are still awaiting AI analysis</li>
                    <li>Analysis includes relevance scoring, keyword extraction, and summarization</li>
                  </ul>
                  <h4 className="font-semibold text-gray-900 mb-1">📈 Analysis breakdown:</h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                    <li>{allArticles.filter(a => a.relevance_score >= 0.6).length} articles meet high relevance criteria (60%+)</li>
                    <li>{allArticles.filter(a => a.relevance_score >= 0.3 && a.relevance_score < 0.6).length} articles have moderate relevance (30-60%)</li>
                    <li>{allArticles.filter(a => a.relevance_score < 0.3).length} articles have lower relevance (&lt;30%)</li>
                    <li>Articles are sorted by relevance score (highest first)</li>
                  </ul>
                  <h4 className="font-semibold text-gray-900 mb-1">🎯 Next steps:</h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                    <li>Click "Analyze More Articles" to process additional articles</li>
                    <li>Review individual articles to understand AI scoring</li>
                    <li>Generate content from high-scoring articles</li>
                    <li>Use keyword insights for content planning</li>
                    <li>Monitor source performance and relevance trends</li>
                    <li>Star articles you want to generate content from</li>
                  </ul>
                  
                  {stats.articlesAggregated > allArticles.length && (
                    <div className="mt-4 pt-3 border-t border-gray-300">
                      <Button 
                        onClick={analyzeMoreArticles}
                        disabled={loading}
                        size="sm"
                        className="mr-2"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Analyze More Articles ({stats.articlesAggregated - allArticles.length} remaining)
                      </Button>
                      <span className="text-xs text-gray-600">
                        This will analyze the next 20 articles with AI
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading && allArticles.length === 0 ? (
                  <LoadingState message="Loading all articles..." count={5} />
                ) : allArticles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No articles processed</p>
                    <p className="text-sm">Run the full cycle to process new articles</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search and Filter Controls */}
                    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-64">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <Input
                            placeholder="Search articles, sources, or keywords..."
                            value={topStoriesSearch}
                            onChange={(e) => {
                              setTopStoriesSearch(e.target.value);
                              setTopStoriesPage(1); // Reset to first page
                            }}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      <Select value={topStoriesSortBy} onValueChange={setTopStoriesSortBy}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Sort by Relevance</SelectItem>
                          <SelectItem value="date">Sort by Date</SelectItem>
                          <SelectItem value="source">Sort by Source</SelectItem>
                          <SelectItem value="title">Sort by Title</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant={showFavoritesOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setShowFavoritesOnly(!showFavoritesOnly);
                          setTopStoriesPage(1);
                        }}
                      >
                        <Star className={`w-4 h-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                        {showFavoritesOnly ? 'Show All' : 'Starred Only'}
                      </Button>
                    </div>

                    {(() => {
                      const { stories, totalStories, totalPages } = getPaginatedStories();
                      
                      return (
                        <>
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                            <span>
                              Showing {((topStoriesPage - 1) * topStoriesPerPage) + 1}-{Math.min(topStoriesPage * topStoriesPerPage, totalStories)} of {totalStories} articles
                              {showFavoritesOnly && ` (${favoriteStories.size} starred)`}
                            </span>
                            <span>{allArticles.length} total analyzed • {stats.articlesAggregated} discovered</span>
                          </div>

                          {stories.map((article, index) => (
                            <Card key={`all-article-${article.article_id}`} className="border-l-4 border-l-purple-500">
                              <CardHeader>
                                <div className="flex items-center gap-2 mb-2">
                                  <CardTitle className="text-lg flex-1">{article.title}</CardTitle>
                                  <Badge variant="outline" className="text-xs">
                                    #{((topStoriesPage - 1) * topStoriesPerPage) + index + 1}
                                  </Badge>
                                  <Badge 
                                    variant={article.relevance_score >= 0.6 ? "default" : article.relevance_score >= 0.3 ? "secondary" : "outline"} 
                                    className="text-xs"
                                  >
                                    {(article.relevance_score * 100).toFixed(0)}% relevance
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleFavorite(article.article_id)}
                                    className="p-1 h-8 w-8"
                                  >
                                    <Star className={`w-4 h-4 ${favoriteStories.has(article.article_id) ? 'fill-current text-yellow-500' : 'text-gray-400'}`} />
                                  </Button>
                                </div>
                                <CardDescription>
                                  {article.source_name} • 
                                  {new Date(article.publication_date).toLocaleDateString()}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-gray-700 mb-3">{article.summary_ai}</p>
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {article.keywords_ai?.split(',').slice(0, 5).map((keyword, keywordIndex) => (
                                    <Badge key={`article-${article.article_id}-keyword-${keywordIndex}`} variant="secondary" className="text-xs">
                                      {keyword.trim()}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => window.open(article.url, '_blank')}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Original
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => generateContentFromStory(article.article_id)}
                                    disabled={loading}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Generate Content
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTopStoriesPage(Math.max(1, topStoriesPage - 1))}
                                disabled={topStoriesPage === 1}
                              >
                                Previous
                              </Button>
                              
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                  const pageNum = Math.max(1, Math.min(totalPages - 4, topStoriesPage - 2)) + i;
                                  if (pageNum > totalPages) return null;
                                  
                                  return (
                                    <Button
                                      key={`all-articles-page-${pageNum}`}
                                      variant={pageNum === topStoriesPage ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setTopStoriesPage(pageNum)}
                                      className="w-8 h-8 p-0"
                                    >
                                      {pageNum}
                                    </Button>
                                  );
                                })}
                              </div>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTopStoriesPage(Math.min(totalPages, topStoriesPage + 1))}
                                disabled={topStoriesPage === totalPages}
                              >
                                Next
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* News Sources Tab */}
          <TabsContent value="sources" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Christian News Sources</CardTitle>
                    <CardDescription>
                      Status and performance of configured news sources
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {stats.activeSources} active sources
                  </Badge>
                </div>
                
                {/* Explanatory section */}
                {!loading && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h3 className="font-semibold text-orange-900 mb-2">📡 What you're viewing:</h3>
                    <p className="text-sm text-orange-800 mb-3">
                      {sources.length} configured Christian news sources that Project Eden monitors for relevant content. 
                      Sources include major Christian publications, denominational news, and faith-focused media outlets.
                    </p>
                    <h4 className="font-semibold text-orange-900 mb-1">📊 Source performance:</h4>
                    <ul className="text-sm text-orange-800 list-disc list-inside space-y-1 mb-3">
                      <li>{stats.activeSources} sources are currently active and being monitored</li>
                      <li>{sources.filter(s => s.articles_last_24h > 0).length} sources provided articles in the last 24 hours</li>
                      <li>Total articles discovered: {stats.articlesAggregated} from all sources</li>
                      <li>RSS feeds are checked regularly for new content</li>
                    </ul>
                    <h4 className="font-semibold text-orange-900 mb-1">🔧 Next steps:</h4>
                    <ul className="text-sm text-orange-800 list-disc list-inside space-y-1">
                      <li>Monitor source performance and article quality</li>
                      <li>Add new Christian news sources as needed</li>
                      <li>Update RSS feed URLs if sources change</li>
                      <li>Deactivate sources that consistently provide low-relevance content</li>
                    </ul>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {loading && sources.length === 0 ? (
                  <LoadingState message="Loading news sources..." count={4} />
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Showing all {sources.length} configured sources</span>
                        <span>{sources.reduce((sum, s) => sum + s.articles_last_24h, 0)} articles in last 24h</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sources.map((source, index) => (
                        <Card key={`source-${source.source_id || index}`} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{source.name}</CardTitle>
                                <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                              </div>
                              <Badge variant={source.is_active ? 'success' : 'secondary'}>
                                {source.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Articles (24h):</span>
                                <span className="font-medium">{source.articles_last_24h}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Last scraped:</span>
                                <span className="font-medium">
                                  {source.last_scraped_at ? 
                                    new Date(source.last_scraped_at).toLocaleTimeString() : 
                                    'Never'
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">RSS Feed:</span>
                                <span className="font-medium">
                                  {source.rss_feed_url ? '✓' : '✗'}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {loading ? (
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>
                    Project Eden automation metrics and insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LoadingState message="Loading analytics..." count={6} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>
                    Project Eden automation metrics and insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalArticlesProcessed}</div>
                      <div className="text-sm text-gray-600">Total Articles Processed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">{stats.activeSources}</div>
                      <div className="text-sm text-gray-600">Active News Sources</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">{stats.contentGenerated}</div>
                      <div className="text-sm text-gray-600">Content Pieces Generated</div>
                    </div>
                  </div>
                  
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 mb-1">{stats.articlesAggregated}</div>
                      <div className="text-sm text-gray-600">Articles Aggregated (24h)</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600 mb-1">{stats.articlesAnalyzed}</div>
                      <div className="text-sm text-gray-600">Articles Analyzed</div>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <Check className="w-5 h-5 text-green-600 mr-2" />
                      <span className="font-medium text-green-800">Project Eden Status: Fully Operational</span>
                    </div>
                    <p className="text-sm text-green-700 mt-2">
                      All systems are running smoothly. News aggregation, AI analysis, and content generation are working as expected.
                    </p>
                    <div className="mt-4 text-sm text-green-700">
                      <p><strong>Data Breakdown:</strong></p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>{stats.articlesAggregated} articles found from {stats.activeSources} active news sources</li>
                        <li>{stats.articlesAnalyzed} articles analyzed for relevance</li>
                        <li>{stats.contentGenerated} content pieces generated</li>
                        <li>{stats.pendingReview} items awaiting review</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Prompt Management Tab */}
          <TabsContent value="prompts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prompt Management</CardTitle>
                <CardDescription>
                  Manage and create prompts for AI content generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PromptManagement />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Job Queue & Background Tasks</CardTitle>
                    <CardDescription>
                      Monitor content generation and automation jobs
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={fetchJobs} variant="outline" size="sm" disabled={jobsLoading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${jobsLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Badge variant={workerStatus.isRunning ? 'success' : 'secondary'}>
                      Worker: {workerStatus.isRunning ? 'Running' : 'Stopped'}
                    </Badge>
                  </div>
                </div>

                {/* Queue Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                  <Card className="border-2">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-yellow-600">{jobStats.summary.queued || 0}</div>
                      <p className="text-xs text-muted-foreground">Queued</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-blue-600">{jobStats.summary.processing || 0}</div>
                      <p className="text-xs text-muted-foreground">Processing</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-green-600">{jobStats.summary.completed || 0}</div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-red-600">{jobStats.summary.failed || 0}</div>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-gray-600">{jobStats.summary.total_jobs || 0}</div>
                      <p className="text-xs text-muted-foreground">Total (24h)</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Current Job */}
                {workerStatus.currentJob && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      <span className="font-medium text-blue-900">Currently Processing</span>
                    </div>
                    <p className="text-sm text-blue-800">
                      Job #{workerStatus.currentJob.job_id} ({workerStatus.currentJob.job_type})
                    </p>
                    <p className="text-xs text-blue-600">
                      Started: {new Date(workerStatus.currentJob.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardHeader>

              <CardContent>
                {/* Recent Jobs List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Recent Jobs</h3>
                    <span className="text-sm text-muted-foreground">{jobs.length} jobs</span>
                  </div>

                  {jobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No jobs found</p>
                      <p className="text-sm">Create content generation or full cycle jobs to see them here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map((job) => (
                        <Card key={`job-${job.job_id}`} className="border">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-medium">#{job.job_id}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {job.job_type.replace('_', ' ')}
                                  </Badge>
                                  {job.status === 'queued' && (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                      Queued
                                    </Badge>
                                  )}
                                  {job.status === 'processing' && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      Processing ({job.progress_percentage}%)
                                    </Badge>
                                  )}
                                  {job.status === 'completed' && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Completed
                                    </Badge>
                                  )}
                                  {job.status === 'failed' && (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                      Failed
                                    </Badge>
                                  )}
                                  {job.status === 'cancelled' && (
                                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                      Cancelled
                                    </Badge>
                                  )}
                                </div>

                                <div className="text-sm text-gray-600 mb-2">
                                  <div className="flex items-center gap-4 text-xs">
                                    <span>Created: {new Date(job.created_at).toLocaleString()}</span>
                                    {job.started_at && (
                                      <span>Started: {new Date(job.started_at).toLocaleString()}</span>
                                    )}
                                    {job.completed_at && (
                                      <span>Completed: {new Date(job.completed_at).toLocaleString()}</span>
                                    )}
                                    {job.duration && (
                                      <span>Duration: {job.duration}s</span>
                                    )}
                                  </div>
                                </div>

                                {/* Job Progress */}
                                {job.status === 'processing' && job.progress_percentage > 0 && (
                                  <div className="mb-2">
                                    <div className="flex items-center justify-between text-sm mb-1">
                                      <span>Progress</span>
                                      <span>{job.progress_percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                        style={{ width: `${job.progress_percentage}%` }}
                                      ></div>
                                    </div>
                                    {job.progress_details && (
                                      <p className="text-xs text-gray-600 mt-1">{job.progress_details}</p>
                                    )}
                                  </div>
                                )}

                                {/* Job Payload */}
                                {job.payload && (
                                  <div className="mb-2">
                                    <span className="text-xs font-medium text-gray-700">Parameters: </span>
                                    <span className="text-xs text-gray-600">
                                      {job.payload.specificStoryId && `Story #${job.payload.specificStoryId}`}
                                      {job.payload.limit && `, Limit: ${job.payload.limit}`}
                                      {Object.keys(job.payload).length === 0 && 'None'}
                                    </span>
                                  </div>
                                )}

                                {/* Job Results */}
                                {job.results && job.status === 'completed' && (
                                  <div className="mb-2 p-2 bg-green-50 rounded border border-green-200">
                                    <span className="text-xs font-medium text-green-800">Results: </span>
                                    <span className="text-xs text-green-700">
                                      {job.results.contentGenerated && `${job.results.contentGenerated} content pieces generated`}
                                      {job.results.articlesAggregated && `${job.results.articlesAggregated} articles aggregated`}
                                      {job.results.articlesAnalyzed && `, ${job.results.articlesAnalyzed} analyzed`}
                                    </span>
                                  </div>
                                )}

                                {/* Error Message */}
                                {job.error_message && (
                                  <div className="mb-2 p-2 bg-red-50 rounded border border-red-200">
                                    <span className="text-xs font-medium text-red-800">Error: </span>
                                    <span className="text-xs text-red-700">{job.error_message}</span>
                                  </div>
                                )}
                              </div>

                              {/* Job Actions */}
                              <div className="flex items-center gap-2 ml-4">
                                {job.status === 'queued' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => cancelJob(job.job_id)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                )}
                                {job.status === 'failed' && job.retry_count < job.max_retries && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => retryJob(job.job_id)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    Retry
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Detailed Review Modal */}
      {showDetailModal && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedContent.title}</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedContent.content_type} • {selectedContent.word_count} words • 
                    Created {new Date(selectedContent.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedContent.status)}
                  <Button variant="outline" onClick={closeDetailModal}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Source Article Information */}
              {selectedContent.sourceArticle && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Source Article
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-6 border">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          {selectedContent.sourceArticle.title}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(selectedContent.sourceArticle.publication_date).toLocaleDateString()}
                          </span>
                          <span>{selectedContent.sourceArticle.source_name}</span>
                          <Badge variant="outline">
                            <Star className="w-3 h-3 mr-1" />
                            {(selectedContent.sourceArticle.relevance_score * 100).toFixed(0)}% relevance
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => window.open(selectedContent.sourceArticle.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Original
                      </Button>
                    </div>

                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">AI Summary:</h5>
                      <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                        {selectedContent.sourceArticle.summary}
                      </p>
                    </div>
                    
                    {selectedContent.sourceArticle.keywords && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Keywords:</h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedContent.sourceArticle.keywords.split(',').map((keyword, keywordIndex) => (
                            <Badge key={`modal-source-keyword-${keywordIndex}`} variant="secondary">
                              {keyword.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Blog Post Content */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Blog Post
                </h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedContent.body_draft }}
                  />
                </div>
              </div>

              {/* Social Media Posts */}
              {selectedContent.socialPosts && selectedContent.socialPosts.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Share2 className="w-5 h-5 mr-2" />
                    Social Media Posts ({selectedContent.socialPosts.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedContent.socialPosts.map((post) => (
                      <Card key={`modal-social-${post.gen_social_id || post.platform}`} className="border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base capitalize">{post.platform}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.text_draft}</p>
                          <div className="mt-3">
                            <Badge variant={post.emotional_hook_present_ai_check ? 'success' : 'secondary'} className="text-xs">
                              {post.emotional_hook_present_ai_check ? 'Has Emotional Hook' : 'No Emotional Hook'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Scripts */}
              {selectedContent.videoScripts && selectedContent.videoScripts.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Video className="w-5 h-5 mr-2" />
                    Video Scripts ({selectedContent.videoScripts.length})
                  </h3>
                  <div className="space-y-4">
                    {selectedContent.videoScripts.map((script) => (
                      <Card key={`modal-video-${script.gen_video_script_id || script.title}`} className="border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{script.title} ({script.duration_target_seconds}s)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="bg-gray-50 rounded p-4 mb-3">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{script.script_draft}</pre>
                          </div>
                          {script.visual_suggestions && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">Visual Suggestions:</p>
                              <div className="flex flex-wrap gap-1">
                                {JSON.parse(script.visual_suggestions).map((suggestion, suggestionIndex) => (
                                  <Badge key={`script-${script.gen_video_script_id || script.title}-suggestion-${suggestionIndex}`} variant="outline" className="text-xs">
                                    {suggestion}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Links */}
              {selectedContent.suggested_eden_product_links && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Suggested Product Links</h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(selectedContent.suggested_eden_product_links).map((link, linkIndex) => (
                        <Badge key={`modal-product-link-${linkIndex}`} variant="outline" className="text-sm">
                          {link.text} → {link.url}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <Button 
                  onClick={() => approveContent(selectedContent.gen_article_id, selectedContent.content_type)}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve Content
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => rejectContent(selectedContent.gen_article_id, selectedContent.content_type)}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject & Return to Draft
                </Button>
                <Button 
                  variant="secondary"
                  onClick={closeDetailModal}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <ProgressModal 
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          onComplete={handleProgressComplete}
          onReset={resetAutomation}
        />
      )}

      {/* Log Viewer */}
      <LogViewer 
        isOpen={showLogViewer}
        onClose={() => setShowLogViewer(false)}
      />
    </div>
  );
};

export default ProjectEden; 