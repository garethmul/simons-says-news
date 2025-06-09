import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import ErrorBoundary from './ui/error-boundary';
import DashboardTab from './dashboard/DashboardTab';
import ContentReviewTab from './content/ContentReviewTab';
import ApprovedContentTab from './content/ApprovedContentTab';
import ArchivedContentTab from './content/ArchivedContentTab';
import RejectedContentTab from './content/RejectedContentTab';
import StoriesTab from './stories/StoriesTab';
import QueuedJobsTab from './jobs/QueuedJobsTab';
import JobsTab from './jobs/JobsTab';
import SourcesTab from './sources/SourcesTab';
import ProgressModal from './ProgressModal';
import PromptManagement from './PromptManagement';
import AccountUserManagement from './AccountUserManagement';
import ImageGenerationSettings from './ImageGenerationSettings';
import LogViewer from './LogViewer';
import DynamicDetailModal from './content/DynamicDetailModal';
import { 
  RefreshCw, 
  Zap,
  Terminal,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProjectEdenData } from '../hooks/useProjectEdenData';
import { useContentActions } from '../hooks/useContentActions';
import { useSourceActions } from '../hooks/useSourceActions';
import { useJobActions } from '../hooks/useJobActions';
import { TAB_ROUTES } from '../utils/constants';
import { 
  getTabFromHash, 
  getContentIdFromHash, 
  updateUrlForTab, 
  updateUrlForModal, 
  closeModalAndUpdateUrl,
  shouldOpenModalFromUrl,
  parseUrlHash
} from '../utils/helpers';
import { useAccount } from '../contexts/AccountContext';
import AccountSwitcher from './AccountSwitcher';

/**
 * Image Viewer Modal Component
 * Displays images in a full-screen modal with navigation
 */
const ImageViewerModal = ({ images, selectedIndex, metadata, onClose, onIndexChange }) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeydown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [currentIndex]);

  // Update currentIndex when selectedIndex changes
  useEffect(() => {
    setCurrentIndex(selectedIndex);
  }, [selectedIndex]);

  const goToPrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    setCurrentIndex(newIndex);
    onIndexChange(newIndex);
  };

  const goToNext = () => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onIndexChange(newIndex);
  };

  const currentImage = images[currentIndex];

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 bg-black bg-opacity-50 text-white">
          <div>
            <h3 className="text-lg font-semibold">
              Image {currentIndex + 1} of {images.length}
            </h3>
            <p className="text-sm text-gray-200">{currentImage.altText}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Image Display */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-900">
          <div className="relative max-w-full max-h-full">
            <img
              src={currentImage.sirvUrl}
              alt={currentImage.altText}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNHB4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgZXJyb3I8L3RleHQ+PC9zdmc+';
              }}
            />

            {/* Navigation arrows overlay */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="bg-black bg-opacity-50 p-4">
            <div className="flex gap-2 justify-center overflow-x-auto max-w-full">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    onIndexChange(index);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-blue-400 opacity-100' 
                      : 'border-transparent opacity-60 hover:opacity-80'
                  }`}
                >
                  <img
                    src={image.sirvUrl}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Refactored Project Eden Main Component
 * Uses modular components and custom hooks for better maintainability
 */
const ProjectEden = () => {
  const { currentUser, logout } = useAuth();
  const { permissionsLoading, selectedAccount, hasAccess } = useAccount();
  
  // Custom hooks for data and actions
  const {
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
    loading,
    initialLoading,
    backgroundRefreshing,
    error,
    fetchTabData,
    fetchJobs,
    toggleFavorite
  } = useProjectEdenData();

  const {
    approveContent,
    rejectContent,
    updateContentStatus,
    generateContentFromStory,
    regenerateContent,
    analyzeMoreArticles,
    runFullCycle,
    isActionLoading,
    isContentGenerationLoading
  } = useContentActions(() => {
    // Force refresh specific tab data after actions
    console.log(`🔄 Refreshing data for active tab: ${activeTab}`);
    if (activeTab === TAB_ROUTES.REVIEW) fetchTabData('review', true);
    else if (activeTab === TAB_ROUTES.APPROVED) fetchTabData('approved', true);
    else if (activeTab === TAB_ROUTES.ARCHIVED) fetchTabData('archived', true);
    else if (activeTab === TAB_ROUTES.REJECTED) fetchTabData('rejected', true);
    else if (activeTab === TAB_ROUTES.STORIES) fetchTabData('articles', true);
  });

  const {
    toggleSourceStatus,
    refreshSource,
    toggleLoadingMap: sourceToggleLoadingMap,
    refreshLoadingMap: sourceRefreshLoadingMap
  } = useSourceActions(() => {
    // Only refresh sources data, not everything
    fetchTabData('sources');
  });

  const {
    cancelJob,
    retryJob,
    startJobWorker,
    isActionLoading: isJobActionLoading
  } = useJobActions(() => {
    // Refresh jobs data specifically
    fetchJobs().then(setJobs).catch(console.error);
  });

  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedContent, setSelectedContent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [selectedJobIdForLogs, setSelectedJobIdForLogs] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [rejectedStories, setRejectedStories] = useState(new Set());
  
  // Image browser modal state
  const [showImageBrowserModal, setShowImageBrowserModal] = useState(false);
  const [imageBrowserImages, setImageBrowserImages] = useState([]);
  const [imageBrowserIndex, setImageBrowserIndex] = useState(0);
  const [imageBrowserContentId, setImageBrowserContentId] = useState(null);
  
  // Loading overlay state with minimum display time
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  // Hash routing functionality
  useEffect(() => {
    const validTabs = Object.values(TAB_ROUTES);
    setActiveTab(getTabFromHash(validTabs));

    const handleHashChange = () => {
      const newTab = getTabFromHash(validTabs);
      setActiveTab(newTab);
      
      // Handle modal routing from URL
      const contentId = getContentIdFromHash();
      if (contentId && shouldOpenModalFromUrl()) {
        // Find the content with this ID and open modal
        handleOpenModalFromUrl(newTab, contentId);
      } else if (!shouldOpenModalFromUrl() && showDetailModal) {
        // Close modal if URL doesn't indicate modal should be open
        setShowDetailModal(false);
        setSelectedContent(null);
      }
    };

    // Handle initial page load with modal routing
    const contentId = getContentIdFromHash();
    if (contentId && shouldOpenModalFromUrl()) {
      const currentTab = getTabFromHash(validTabs);
      handleOpenModalFromUrl(currentTab, contentId);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [showDetailModal]);

  // Handle opening modal from URL
  const handleOpenModalFromUrl = async (tab, contentId) => {
    console.log(`🔗 Opening modal from URL: ${tab}/${contentId}`);
    
    // Ensure we have the right data loaded for this tab
    let contentArray = [];
    switch (tab) {
      case TAB_ROUTES.REVIEW:
        if (!contentForReview.length) await fetchTabData('review');
        contentArray = contentForReview;
        break;
      case TAB_ROUTES.APPROVED:
        if (!approvedContent.length) await fetchTabData('approved');
        contentArray = approvedContent;
        break;
      case TAB_ROUTES.ARCHIVED:
        if (!archivedContent.length) await fetchTabData('archived');
        contentArray = archivedContent;
        break;
      case TAB_ROUTES.REJECTED:
        if (!rejectedContent.length) await fetchTabData('rejected');
        contentArray = rejectedContent;
        break;
      default:
        return;
    }

    // Find the content with matching ID
    const content = contentArray.find(item => item.gen_article_id === contentId);
    if (content) {
      setSelectedContent(content);
      setShowDetailModal(true);
    } else {
      console.warn(`Content with ID ${contentId} not found in ${tab} tab`);
      // Fallback: remove the content ID from URL
      updateUrlForTab(tab);
    }
  };

  // Load data for initial tab when system is ready
  useEffect(() => {
    if (!permissionsLoading && hasAccess && selectedAccount && !initialLoading) {
      console.log(`🚀 Loading data for initial tab: ${activeTab}`);
      
      // Load data for the current tab
      switch (activeTab) {
        case TAB_ROUTES.REVIEW:
          fetchTabData('review');
          break;
        case TAB_ROUTES.APPROVED:
          fetchTabData('approved');
          break;
        case TAB_ROUTES.ARCHIVED:
          fetchTabData('archived');
          break;
        case TAB_ROUTES.REJECTED:
          fetchTabData('rejected');
          break;
        case TAB_ROUTES.STORIES:
          fetchTabData('articles');
          fetchTabData('bookmarks');
          break;
        case TAB_ROUTES.JOBS:
        case TAB_ROUTES.QUEUED:
          fetchJobs().then(setJobs).catch(console.error);
          break;
        default:
          // Dashboard and other tabs don't need additional data
          break;
      }
    }
  }, [activeTab, permissionsLoading, hasAccess, selectedAccount, initialLoading, fetchTabData, fetchJobs]);

  // Handle tab changes and update URL
  const handleTabChange = (tabValue) => {
    setActiveTab(tabValue);
    updateUrlForTab(tabValue);
    
    // Lazy load data for the new tab
    switch (tabValue) {
      case TAB_ROUTES.REVIEW:
        fetchTabData('review');
        break;
      case TAB_ROUTES.APPROVED:
        fetchTabData('approved');
        break;
      case TAB_ROUTES.ARCHIVED:
        fetchTabData('archived');
        break;
      case TAB_ROUTES.REJECTED:
        fetchTabData('rejected');
        break;
      case TAB_ROUTES.STORIES:
        fetchTabData('articles');
        fetchTabData('bookmarks'); // Also load bookmarks for favorites
        break;
      case TAB_ROUTES.JOBS:
      case TAB_ROUTES.QUEUED:
        fetchJobs().then(setJobs).catch(console.error);
        break;
      case TAB_ROUTES.SOURCES:
        // Sources are already loaded in essential data
        break;
      default:
        // Dashboard and other tabs don't need additional data
        break;
    }
  };

  // Fetch jobs when certain tabs are accessed (but keep the existing logic for backwards compatibility)
  useEffect(() => {
    if (activeTab === TAB_ROUTES.JOBS || activeTab === TAB_ROUTES.QUEUED) {
      fetchJobs().then(setJobs).catch(console.error);
    }
  }, [activeTab, fetchJobs]);

  // Content review handlers
  const openDetailedReview = (content) => {
    setSelectedContent(content);
    setShowDetailModal(true);
    // Update URL to include content ID
    updateUrlForModal(activeTab, content.gen_article_id);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedContent(null);
    // Update URL to remove content ID
    closeModalAndUpdateUrl(activeTab);
  };

  // Image browser modal handlers
  const handleImageClick = (images, imageIndex, contentId) => {
    console.log('🖼️ Opening image browser modal:', { imageIndex, contentId, imagesCount: images.length });
    setImageBrowserImages(images);
    setImageBrowserIndex(imageIndex);
    setImageBrowserContentId(contentId);
    setShowImageBrowserModal(true);
  };

  const closeImageBrowserModal = () => {
    setShowImageBrowserModal(false);
    setImageBrowserImages([]);
    setImageBrowserIndex(0);
    setImageBrowserContentId(null);
  };

  // Content refresh handler for automatic thumbnail updates
  const handleRefreshContent = async (contentId) => {
    console.log('🔄 Refreshing content after image generation:', contentId);
    
    // Refresh the current tab data to get updated images
    switch (activeTab) {
      case TAB_ROUTES.REVIEW:
        await fetchTabData('review', true);
        break;
      case TAB_ROUTES.APPROVED:
        await fetchTabData('approved', true);
        break;
      case TAB_ROUTES.ARCHIVED:
        await fetchTabData('archived', true);
        break;
      case TAB_ROUTES.REJECTED:
        await fetchTabData('rejected', true);
        break;
      default:
        // For other tabs, just do a general refresh
        await fetchTabData(activeTab === 'dashboard' ? 'review' : activeTab.replace(TAB_ROUTES.DASHBOARD, 'review'), true);
        break;
    }
    
    console.log(`✅ Content refreshed for ${activeTab} tab`);
  };

  // Progress modal handlers
  const handleRunFullCycle = async () => {
    try {
      setShowProgressModal(true);
      await runFullCycle();
    } catch (error) {
      console.error('Full cycle error:', error);
      setShowProgressModal(false);
    }
  };

  // Regenerate content handler
  const handleRegenerateContent = async (contentOrStoryId) => {
    try {
      // If called from content review/management, contentOrStoryId is a content object
      if (typeof contentOrStoryId === 'object' && contentOrStoryId.gen_article_id) {
        const content = contentOrStoryId;
        const contentId = content.gen_article_id;
        const storyId = content.sourceArticle?.article_id || content.based_on_scraped_article_id;
        
        if (!storyId) {
          console.error('❌ No source article ID found for regeneration');
          throw new Error('Cannot regenerate: No source article found');
        }
        
        await regenerateContent(contentId, storyId, handleTabChange);
      } else {
        // If called from stories tab, contentOrStoryId is just the story ID
        await generateContentFromStory(contentOrStoryId, handleTabChange);
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      // Could show a toast notification here
    }
  };

  const handleProgressComplete = async (results) => {
    if (results) {
      // Results are handled by the data hook
    }
    
    setTimeout(() => {
      setShowProgressModal(false);
    }, 2000);
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

  // Refresh jobs data
  const handleJobsRefresh = async () => {
    try {
      const jobsData = await fetchJobs();
      setJobs(jobsData);
    } catch (error) {
      console.error('Error refreshing jobs:', error);
    }
  };

  // Story rejection handler
  const handleRejectStory = async (storyId) => {
    try {
      // For now, just add to local state - could be extended to API call
      setRejectedStories(prev => new Set([...prev, storyId]));
      console.log(`Story ${storyId} rejected`);
      
      // Optional: Make API call to persist rejection
      // const baseUrl = import.meta.env.VITE_API_URL || '';
      // await fetch(`${baseUrl}/api/eden/stories/${storyId}/reject`, { method: 'POST' });
    } catch (error) {
      console.error('Error rejecting story:', error);
      // Revert on error
      setRejectedStories(prev => {
        const newSet = new Set(prev);
        newSet.delete(storyId);
        return newSet;
      });
    }
  };

  // Determine modal action props based on active tab
  const getModalActionProps = () => {
    switch (activeTab) {
      case TAB_ROUTES.REVIEW:
        return {
          showApprovalActions: true,
          showPublishActions: false,
          showRejectedActions: false,
          showArchivedActions: false
        };
      case TAB_ROUTES.APPROVED:
        return {
          showApprovalActions: false,
          showPublishActions: true,
          showRejectedActions: false,
          showArchivedActions: false
        };
      case TAB_ROUTES.ARCHIVED:
        return {
          showApprovalActions: false,
          showPublishActions: false,
          showRejectedActions: false,
          showArchivedActions: true
        };
      case TAB_ROUTES.REJECTED:
        return {
          showApprovalActions: false,
          showPublishActions: false,
          showRejectedActions: true,
          showArchivedActions: false
        };
      default:
        return {
          showApprovalActions: true,
          showPublishActions: false,
          showRejectedActions: false,
          showArchivedActions: false
        };
    }
  };

  // Manage loading overlay with minimum display time (updated for new loading states)
  useEffect(() => {
    const shouldShowLoading = permissionsLoading || initialLoading;
    
    if (shouldShowLoading && !showLoadingOverlay) {
      // Start showing overlay
      setShowLoadingOverlay(true);
      setLoadingStartTime(Date.now());
    } else if (!shouldShowLoading && showLoadingOverlay && loadingStartTime) {
      // Check if minimum time has passed
      const elapsed = Date.now() - loadingStartTime;
      const minDisplayTime = 1500; // Reduced to 1.5 seconds for faster experience
      
      if (elapsed >= minDisplayTime) {
        setShowLoadingOverlay(false);
        setLoadingStartTime(null);
      } else {
        // Wait for remaining time
        setTimeout(() => {
          setShowLoadingOverlay(false);
          setLoadingStartTime(null);
        }, minDisplayTime - elapsed);
      }
    }
  }, [permissionsLoading, initialLoading, showLoadingOverlay, loadingStartTime]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Loading overlay during initial load to prevent flickering */}
          {showLoadingOverlay && (
            <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 text-blue-600 animate-spin rounded-full border-3 border-current border-t-transparent"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Loading Project Eden</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {permissionsLoading ? 'Loading account permissions...' : 
                       initialLoading ? 'Loading essential data...' : 
                       'Initializing...'}
                    </p>
                    {selectedAccount && (
                      <p className="text-xs text-gray-500 mt-1">
                        Account: {selectedAccount.name}
                      </p>
                    )}
                    {initialLoading && (
                      <p className="text-xs text-blue-600 mt-2">
                        ⚡ Quick loading - only essentials first
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Disabled overlay when automation is running */}
          {showProgressModal && (
            <div className="fixed inset-0 bg-white bg-opacity-60 z-40 pointer-events-none" />
          )}
          
          {/* Header */}
          <Header 
            currentUser={currentUser}
            loading={loading}
            backgroundRefreshing={backgroundRefreshing}
            showProgressModal={showProgressModal}
            onRefresh={fetchTabData}
            onRunFullCycle={handleRunFullCycle}
            onShowLogs={() => setShowLogViewer(true)}
            onLogout={logout}
          />

          {/* Stats Dashboard */}
          <StatsGrid stats={stats} showProgressModal={showProgressModal} />

          {/* Main Interface */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-12">
              <TabsTrigger value={TAB_ROUTES.DASHBOARD}>Dashboard</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.REVIEW}>Review ({stats.pendingReview || 0})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.APPROVED}>Approved ({stats.approvedContent || 0})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.ARCHIVED}>Archived ({stats.archivedContent || 0})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.REJECTED}>Rejected ({stats.rejectedContent || 0})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.STORIES}>Stories ({stats.articlesAnalyzed || 0})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.QUEUED}>Active ({(jobStats.summary.queued || 0) + (jobStats.summary.processing || 0)})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.JOBS}>Jobs</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.SOURCES}>Sources ({sources.length})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.PROMPTS}>Prompts</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.USERS}>Users</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.IMAGE_SETTINGS}>Image Settings</TabsTrigger>
            </TabsList>

            {/* Automation Running Message */}
            {showProgressModal && <AutomationRunningMessage />}

            {/* Tab Contents */}
            <TabsContent value={TAB_ROUTES.DASHBOARD}>
              <DashboardTab
                stats={stats}
                workerStatus={workerStatus}
                loading={loading}
                onRunFullCycle={handleRunFullCycle}
                onTabChange={handleTabChange}
                onStartWorker={startJobWorker}
                isActionLoading={isActionLoading}
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.REVIEW}>
              <ContentReviewTab
                contentForReview={contentForReview}
                stats={stats}
                loading={loading}
                onApprove={approveContent}
                onReject={rejectContent}
                onReview={openDetailedReview}
                onRegenerate={handleRegenerateContent}
                onImageClick={handleImageClick}
                onRefreshContent={handleRefreshContent}
                isActionLoading={isActionLoading}
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.APPROVED}>
              <ApprovedContentTab
                approvedContent={approvedContent}
                stats={stats}
                loading={loading}
                onPublish={updateContentStatus}
                onReturnToReview={updateContentStatus}
                onArchive={updateContentStatus}
                onReview={openDetailedReview}
                onImageClick={handleImageClick}
                onRefreshContent={handleRefreshContent}
                isActionLoading={isActionLoading}
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.ARCHIVED}>
              <ArchivedContentTab
                archivedContent={archivedContent}
                stats={stats}
                loading={loading}
                onReturnToApproved={updateContentStatus}
                onReview={openDetailedReview}
                onImageClick={handleImageClick}
                onRefreshContent={handleRefreshContent}
                isActionLoading={isActionLoading}
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.REJECTED}>
              <RejectedContentTab
                rejectedContent={rejectedContent}
                stats={stats}
                loading={loading}
                onReturnToReview={updateContentStatus}
                onRegenerate={handleRegenerateContent}
                onReview={openDetailedReview}
                onImageClick={handleImageClick}
                onRefreshContent={handleRefreshContent}
                isActionLoading={isActionLoading}
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.STORIES}>
              <StoriesTab
                allArticles={allArticles}
                stats={stats}
                favoriteStories={favoriteStories}
                loading={loading}
                onGenerateContent={(storyId) => generateContentFromStory(storyId, handleTabChange)}
                onToggleFavorite={toggleFavorite}
                onRejectStory={handleRejectStory}
                rejectedStories={rejectedStories}
                onTabChange={handleTabChange}
                isContentGenerationLoading={isContentGenerationLoading}
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.QUEUED}>
              <QueuedJobsTab
                jobs={jobs}
                jobStats={jobStats}
                workerStatus={workerStatus}
                loading={loading}
                onRefresh={handleJobsRefresh}
                onCancelJob={cancelJob}
                onStartWorker={startJobWorker}
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.JOBS}>
              <JobsTab
                jobs={jobs}
                jobStats={jobStats}
                workerStatus={workerStatus}
                loading={loading}
                onRefresh={handleJobsRefresh}
                onCancelJob={cancelJob}
                onRetryJob={retryJob}
                selectedJobIdForLogs={selectedJobIdForLogs}
                onSelectJobForLogs={setSelectedJobIdForLogs}
                onShowLogs={() => setShowLogViewer(true)}
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.SOURCES}>
              <SourcesTab
                sources={sources}
                loading={loading}
                onRefresh={fetchTabData}
                onToggleSourceStatus={toggleSourceStatus}
                onRefreshSource={refreshSource}
                toggleLoadingMap={sourceToggleLoadingMap}
                refreshLoadingMap={sourceRefreshLoadingMap}
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.PROMPTS}>
              <PromptManagement />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.USERS}>
              <AccountUserManagement />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.IMAGE_SETTINGS}>
              <ImageGenerationSettings />
            </TabsContent>
          </Tabs>
        </div>

        {/* Modals */}
        <DynamicDetailModal
          showModal={showDetailModal}
          selectedContent={selectedContent}
          onClose={closeDetailModal}
          onApprove={approveContent}
          onReject={rejectContent}
          onPublish={updateContentStatus}
          onReturnToReview={updateContentStatus}
          onReturnToApproved={updateContentStatus}
          onArchive={updateContentStatus}
          onRegenerate={handleRegenerateContent}
          onRefreshContent={handleRefreshContent}
          isActionLoading={isActionLoading}
          {...getModalActionProps()}
        />

        {/* Image Browser Modal */}
        {showImageBrowserModal && (
          <ImageViewerModal
            images={imageBrowserImages}
            selectedIndex={imageBrowserIndex}
            metadata={[]}
            onClose={closeImageBrowserModal}
            onIndexChange={setImageBrowserIndex}
          />
        )}

        <ProgressModal 
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          onComplete={handleProgressComplete}
          onReset={resetAutomation}
        />

        <LogViewer 
          isOpen={showLogViewer}
          onClose={() => {
            setShowLogViewer(false);
            // Clear job selection when closing log viewer
            setSelectedJobIdForLogs(null);
          }}
          selectedJobId={selectedJobIdForLogs}
        />
      </div>
    </ErrorBoundary>
  );
};

/**
 * Header Component
 */
const Header = ({ 
  currentUser, 
  loading, 
  backgroundRefreshing, 
  showProgressModal, 
  onRefresh, 
  onRunFullCycle, 
  onShowLogs, 
  onLogout 
}) => (
  <div className="flex items-center justify-between mb-8">
    <div className="flex items-center gap-4">
      <h1 className="text-3xl font-bold text-gray-900">Project Eden</h1>
      {backgroundRefreshing && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          <div className="w-3 h-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
          <span>Updating data...</span>
        </div>
      )}
      <AccountSwitcher />
      </div>
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={() => onRefresh()}
        disabled={loading || showProgressModal}
        className="flex items-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      <Button
        onClick={onRunFullCycle}
        disabled={loading || showProgressModal}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
      >
        <Zap className="w-4 h-4" />
        Full Automation
        </Button>
      <Button
        variant="outline"
        onClick={onShowLogs}
        className="flex items-center gap-2"
      >
        <Terminal className="w-4 h-4" />
        Logs
        </Button>
        <Button 
          variant="ghost" 
          onClick={onLogout}
        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
        <LogOut className="w-4 h-4" />
        Sign Out
        </Button>
    </div>
  </div>
);

/**
 * Stats Grid Component (simplified version)
 */
const StatsGrid = ({ stats, showProgressModal }) => (
  <div className={`grid grid-cols-1 md:grid-cols-5 gap-6 mb-8 ${showProgressModal ? 'opacity-50 pointer-events-none' : ''}`}>
    {/* Stats cards - simplified for brevity */}
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-2xl font-bold">{stats.articlesAggregated}</div>
      <div className="text-sm text-gray-600">Articles Aggregated</div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-2xl font-bold">{stats.articlesAnalyzed}</div>
      <div className="text-sm text-gray-600">Articles Analyzed</div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-2xl font-bold">{stats.contentGenerated}</div>
      <div className="text-sm text-gray-600">Content Generated</div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-2xl font-bold">{stats.pendingReview}</div>
      <div className="text-sm text-gray-600">Pending Review</div>
    </div>
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-2xl font-bold">{stats.approvedContent}</div>
      <div className="text-sm text-gray-600">Approved Content</div>
    </div>
  </div>
);

/**
 * Automation Running Message Component
 */
const AutomationRunningMessage = () => (
  <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 text-blue-500 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <div>
          <p className="font-medium text-gray-900">Automation in Progress</p>
          <p className="text-sm text-gray-600">Please wait while Project Eden processes your request</p>
        </div>
      </div>
    </div>
  </div>
);

export default ProjectEden; 