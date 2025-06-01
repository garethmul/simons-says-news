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
import LogViewer from './LogViewer';
import DetailModal from './content/DetailModal';
import { 
  RefreshCw, 
  Zap,
  Terminal,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProjectEdenData } from '../hooks/useProjectEdenData';
import { useContentActions } from '../hooks/useContentActions';
import { useSourceActions } from '../hooks/useSourceActions';
import { useJobActions } from '../hooks/useJobActions';
import { TAB_ROUTES } from '../utils/constants';
import { getTabFromHash } from '../utils/helpers';
import { useAccount } from '../contexts/AccountContext';
import AccountSwitcher from './AccountSwitcher';

/**
 * Refactored Project Eden Main Component
 * Uses modular components and custom hooks for better maintainability
 */
const ProjectEden = () => {
  const { currentUser, logout } = useAuth();
  const { permissionsLoading, selectedAccount } = useAccount();
  
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
    error,
    fetchData,
    fetchJobs,
    toggleFavorite
  } = useProjectEdenData();

  const {
    approveContent,
    rejectContent,
    updateContentStatus,
    generateContentFromStory,
    analyzeMoreArticles,
    runFullCycle,
    isActionLoading,
    isContentGenerationLoading
  } = useContentActions(fetchData);

  const {
    toggleSourceStatus,
    refreshSource,
    toggleLoadingMap: sourceToggleLoadingMap,
    refreshLoadingMap: sourceRefreshLoadingMap
  } = useSourceActions(fetchData);

  const {
    cancelJob,
    retryJob,
    startJobWorker,
    isActionLoading: isJobActionLoading
  } = useJobActions(() => {
    // Refresh both main data and jobs data
    fetchData();
    fetchJobs().then(setJobs).catch(console.error);
  });

  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedContent, setSelectedContent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [rejectedStories, setRejectedStories] = useState(new Set());
  
  // Loading overlay state with minimum display time
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  // Hash routing functionality
  useEffect(() => {
    const validTabs = Object.values(TAB_ROUTES);
    setActiveTab(getTabFromHash(validTabs));

    const handleHashChange = () => {
      setActiveTab(getTabFromHash(validTabs));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handle tab changes and update URL
  const handleTabChange = (tabValue) => {
    setActiveTab(tabValue);
    window.history.pushState(null, null, `#${tabValue}`);
  };

  // Fetch jobs when certain tabs are accessed
  useEffect(() => {
    if (activeTab === TAB_ROUTES.JOBS || activeTab === TAB_ROUTES.QUEUED) {
      fetchJobs().then(setJobs).catch(console.error);
    }
  }, [activeTab, fetchJobs]);

  // Content review handlers
  const openDetailedReview = (content) => {
    setSelectedContent(content);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedContent(null);
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

  // Manage loading overlay with minimum display time
  useEffect(() => {
    const shouldShowLoading = permissionsLoading || (loading && allArticles.length === 0);
    
    if (shouldShowLoading && !showLoadingOverlay) {
      // Start showing overlay
      setShowLoadingOverlay(true);
      setLoadingStartTime(Date.now());
    } else if (!shouldShowLoading && showLoadingOverlay && loadingStartTime) {
      // Check if minimum time has passed
      const elapsed = Date.now() - loadingStartTime;
      const minDisplayTime = 2000; // 2 seconds
      
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
  }, [permissionsLoading, loading, allArticles.length, showLoadingOverlay, loadingStartTime]);

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
                       loading ? 'Fetching latest data...' : 
                       'Initializing...'}
                    </p>
                    {selectedAccount && (
                      <p className="text-xs text-gray-500 mt-1">
                        Account: {selectedAccount.name}
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
            showProgressModal={showProgressModal}
            onRefresh={fetchData}
            onRunFullCycle={handleRunFullCycle}
            onShowLogs={() => setShowLogViewer(true)}
            onLogout={logout}
          />

          {/* Stats Dashboard */}
          <StatsGrid stats={stats} showProgressModal={showProgressModal} />

          {/* Main Interface */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-11">
              <TabsTrigger value={TAB_ROUTES.DASHBOARD}>Dashboard</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.REVIEW}>Review ({contentForReview.length})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.APPROVED}>Approved ({approvedContent.length})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.ARCHIVED}>Archived ({archivedContent.length})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.REJECTED}>Rejected ({rejectedContent.length})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.STORIES}>Stories ({allArticles.length})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.QUEUED}>Queued ({jobStats.summary.queued || 0})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.JOBS}>Jobs</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.SOURCES}>Sources ({sources.length})</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.PROMPTS}>Prompts</TabsTrigger>
              <TabsTrigger value={TAB_ROUTES.USERS}>Users</TabsTrigger>
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
                isActionLoading={isActionLoading}
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.REJECTED}>
              <RejectedContentTab
                rejectedContent={rejectedContent}
                stats={stats}
                loading={loading}
                onReturnToReview={updateContentStatus}
                onRegenerate={generateContentFromStory}
                onReview={openDetailedReview}
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
              />
            </TabsContent>

            <TabsContent value={TAB_ROUTES.SOURCES}>
              <SourcesTab
                sources={sources}
                loading={loading}
                onRefresh={fetchData}
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
          </Tabs>
        </div>

        {/* Modals */}
        <DetailModal
          showModal={showDetailModal}
          selectedContent={selectedContent}
          onClose={closeDetailModal}
          onApprove={approveContent}
          onReject={rejectContent}
          onPublish={updateContentStatus}
          onReturnToReview={updateContentStatus}
          onReturnToApproved={updateContentStatus}
          onArchive={updateContentStatus}
          onRegenerate={generateContentFromStory}
          isActionLoading={isActionLoading}
          {...getModalActionProps()}
        />

        <ProgressModal 
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          onComplete={handleProgressComplete}
          onReset={resetAutomation}
        />

        <LogViewer 
          isOpen={showLogViewer}
          onClose={() => setShowLogViewer(false)}
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
  showProgressModal, 
  onRefresh, 
  onRunFullCycle, 
  onShowLogs, 
  onLogout 
}) => (
  <div className="mb-8">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        {/* Account Switcher in top-left */}
        <AccountSwitcher />
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Eden</h1>
        <p className="text-lg text-gray-600">AI Content</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onRefresh} variant="outline" disabled={loading || showProgressModal}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button onClick={onRunFullCycle} disabled={loading || showProgressModal}>
          <Zap className="w-4 h-4 mr-2" />
          Run Full Cycle
        </Button>
        <Button onClick={onShowLogs} variant="outline" disabled={showProgressModal}>
          <Terminal className="w-4 h-4 mr-2" />
          Live Logs
        </Button>
        <Button 
          variant="ghost" 
          onClick={onLogout}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout ({currentUser?.email})
        </Button>
      </div>
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