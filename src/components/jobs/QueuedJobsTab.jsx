import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import LoadingState from '../ui/loading-state';
import ErrorBoundary from '../ui/error-boundary';
import StatusBadge from '../ui/status-badge';
import JobLogViewer from './JobLogViewer';
import { useAccount } from '../../contexts/AccountContext';
import { 
  RefreshCw, 
  Clock, 
  X, 
  Play,
  Loader2,
  Activity,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDateTime, getEstimatedWaitTime } from '../../utils/helpers';
import HelpSection from '../common/HelpSection';

/**
 * Queued Jobs Tab Component
 * Displays jobs waiting to be processed AND currently processing jobs with real-time updates
 */
const QueuedJobsTab = ({
  jobs,
  jobStats,
  workerStatus,
  loading,
  onRefresh,
  onCancelJob,
  onStartWorker
}) => {
  const { withAccountContext } = useAccount();
  const [realTimeJobs, setRealTimeJobs] = useState(jobs);
  const [realTimeStats, setRealTimeStats] = useState(jobStats);
  const [realTimeWorker, setRealTimeWorker] = useState(workerStatus);
  const [isConnected, setIsConnected] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const eventSourceRef = useRef(null);

  // Real-time updates via polling (more reliable than SSE with headers)
  useEffect(() => {
    let intervalId;
    
    const fetchUpdates = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const accountOptions = withAccountContext();
        
        const response = await fetch(`${baseUrl}/api/eden/jobs/queue/stats`, accountOptions);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRealTimeStats(data.stats);
            setRealTimeWorker(data.worker);
            
            if (!isConnected) {
              setIsConnected(true);
              console.log('🔄 Connected to job updates');
            }
          }
        } else {
          if (isConnected) {
            setIsConnected(false);
            console.error('Job updates connection failed:', response.status);
          }
        }
        
        // Also fetch recent jobs
        const jobsResponse = await fetch(`${baseUrl}/api/eden/jobs/recent?limit=20`, accountOptions);
        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          if (jobsData.success && jobsData.jobs) {
            setRealTimeJobs(jobsData.jobs);
          }
        }
        
      } catch (error) {
        console.error('Error fetching job updates:', error);
        if (isConnected) {
          setIsConnected(false);
        }
      }
    };

    // Initial fetch
    fetchUpdates();
    
    // Poll every 3 seconds for real-time feel
    intervalId = setInterval(fetchUpdates, 3000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [withAccountContext, isConnected]);

  // Update real-time jobs when props change
  useEffect(() => {
    setRealTimeJobs(jobs);
  }, [jobs]);

  useEffect(() => {
    setRealTimeStats(jobStats);
  }, [jobStats]);

  useEffect(() => {
    setRealTimeWorker(workerStatus);
  }, [workerStatus]);

  // Filter for active jobs - both queued AND processing
  const activeJobs = realTimeJobs.filter(job => 
    job.status === 'queued' || 
    job.status === 'pending' || 
    job.status === 'created' ||
    job.status === 'processing'  // Key addition: show processing jobs too!
  );
  
  // Separate queued vs processing for better display
  const queuedJobs = activeJobs.filter(job => 
    job.status === 'queued' || job.status === 'pending' || job.status === 'created'
  );
  const processingJobs = activeJobs.filter(job => job.status === 'processing');

  const toggleJobLogs = (jobId) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Content Generation Jobs</CardTitle>
              <CardDescription>
                Jobs waiting to be processed and currently processing jobs with real-time updates
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {isConnected && (
                <Badge variant="default" className="text-xs">
                  <Activity className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              )}
              <Badge variant="outline" className="text-sm">
                {queuedJobs.length} queued
              </Badge>
              {processingJobs.length > 0 && (
                <Badge variant="default" className="text-sm">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {processingJobs.length} processing
                </Badge>
              )}
            </div>
          </div>
          
          {/* Help section */}
          <HelpSection 
            title="⏳ Active Jobs Help"
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
            textColor="text-blue-800"
            headingColor="text-blue-900"
          >
            <h3 className="font-semibold text-blue-900 mb-2">🔄 What you're viewing:</h3>
            <p className="text-sm text-blue-800 mb-3">
              Real-time view of content generation jobs that are queued (waiting) or currently processing. 
              This page updates automatically to show progress and logs.
            </p>
            <h4 className="font-semibold text-blue-900 mb-1">📊 Job statuses:</h4>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li><strong>Queued:</strong> Waiting to be processed in FIFO order</li>
              <li><strong>Processing:</strong> Currently being worked on by the job worker</li>
              <li>Click "Show Logs" to see real-time progress and debugging information</li>
              <li>Completed jobs move to the Review tab for human approval</li>
            </ul>
          </HelpSection>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Loading active jobs..." count={3} />
          ) : (
            <>
              {/* Worker Status Alert */}
              {!realTimeWorker.isRunning && activeJobs.length > 0 && (
                <WorkerStatusAlert onStartWorker={onStartWorker} />
              )}

              {/* Connection Status */}
              {!isConnected && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-800">
                      Real-time updates unavailable. Click refresh for latest status.
                    </span>
                  </div>
                </div>
              )}

              {/* Processing Jobs Section */}
              {processingJobs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    Currently Processing ({processingJobs.length})
                  </h3>
                  <div className="space-y-4">
                    {processingJobs.map((job, index) => (
                      <ProcessingJobCard 
                        key={`processing-job-${job.job_id}`}
                        job={job}
                        onCancelJob={onCancelJob}
                        expandedLogs={expandedLogs}
                        onToggleLogs={toggleJobLogs}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Queued Jobs Section */}
              {queuedJobs.length === 0 && processingJobs.length === 0 ? (
                <EmptyState />
              ) : queuedJobs.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    Waiting in Queue ({queuedJobs.length})
                  </h3>
                <JobsList 
                  queuedJobs={queuedJobs} 
                    workerStatus={realTimeWorker}
                  onCancelJob={onCancelJob}
                    expandedLogs={expandedLogs}
                    onToggleLogs={toggleJobLogs}
                />
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

/**
 * Worker Status Alert Component
 */
const WorkerStatusAlert = ({ onStartWorker }) => (
  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 mb-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium text-orange-900">Job Worker Stopped</h3>
        <p className="text-sm text-orange-800">Start the job worker to process queued jobs</p>
      </div>
      <Button 
        onClick={onStartWorker} 
        size="sm"
        className="bg-orange-600 hover:bg-orange-700"
      >
        <Play className="w-4 h-4 mr-2" />
        Start Worker
      </Button>
    </div>
  </div>
);

/**
 * Empty State Component
 */
const EmptyState = () => (
  <div className="text-center py-8 text-gray-500">
    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <p>No active jobs</p>
    <p className="text-sm">Generate content from stories to see queued and processing jobs here</p>
    <p className="text-xs mt-2">This page shows real-time updates as jobs are processed</p>
  </div>
);

/**
 * Processing Job Card Component - Enhanced for real-time feedback
 */
const ProcessingJobCard = ({ job, onCancelJob, expandedLogs, onToggleLogs }) => {
  const isLogsExpanded = expandedLogs.has(job.job_id);

  return (
    <div className="space-y-2">
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg">Job #{job.job_id}</CardTitle>
                <Badge variant="default" className="text-xs bg-blue-600">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Processing
                </Badge>
                <StatusBadge 
                  status={job.job_type.replace('_', ' ')} 
                  type="content"
                  className="bg-blue-100 text-blue-700 border-blue-200"
                />
              </div>
              
              {/* Progress Bar */}
              {job.progress_percentage > 0 && (
                <div className="mb-3">
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
                    <p className="text-xs text-blue-700 mt-1">{job.progress_details}</p>
                  )}
                </div>
              )}
              
              <CardDescription className="mt-2">
                Started {formatDateTime(job.started_at || job.created_at)}
              </CardDescription>
              
              {/* Job Details */}
              <JobDetails job={job} queuePosition={null} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggleLogs(job.job_id)}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isLogsExpanded ? 'Hide' : 'Show'} Logs
                {isLogsExpanded ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Job Logs */}
      {isLogsExpanded && (
        <JobLogViewer
          job={job}
          isExpanded={isLogsExpanded}
          onToggleExpanded={() => onToggleLogs(job.job_id)}
          className="ml-4"
        />
      )}
    </div>
  );
};

/**
 * Jobs List Component
 */
const JobsList = ({ queuedJobs, workerStatus, onCancelJob, expandedLogs, onToggleLogs }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
      <span>Showing {queuedJobs.length} queued job{queuedJobs.length !== 1 ? 's' : ''}</span>
      <span>Worker status: {workerStatus.isRunning ? 'Running' : 'Stopped'}</span>
    </div>
    
    {queuedJobs.map((job, index) => (
      <QueuedJobCard 
        key={`queued-job-${job.job_id}`}
        job={job}
        queuePosition={index}
        onCancelJob={onCancelJob}
        expandedLogs={expandedLogs}
        onToggleLogs={onToggleLogs}
      />
    ))}
  </div>
);

/**
 * Queued Job Card Component
 */
const QueuedJobCard = ({ job, queuePosition, onCancelJob, expandedLogs, onToggleLogs }) => {
  const isLogsExpanded = expandedLogs.has(job.job_id);

  return (
    <div className="space-y-2">
  <Card className="border-l-4 border-l-yellow-500">
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CardTitle className="text-lg">Job #{job.job_id}</CardTitle>
            <Badge variant="outline" className="text-xs">#{queuePosition + 1} in queue</Badge>
            <StatusBadge 
              status={job.job_type.replace('_', ' ')} 
              type="content"
              className="bg-yellow-50 text-yellow-700 border-yellow-200"
            />
          </div>
          <CardDescription className="mt-2">
            Created {formatDateTime(job.created_at)}
          </CardDescription>
          
          {/* Job Details */}
          <JobDetails job={job} queuePosition={queuePosition} />
        </div>
        <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggleLogs(job.job_id)}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isLogsExpanded ? 'Hide' : 'Show'} Logs
                {isLogsExpanded ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancelJob(job.job_id)}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </CardHeader>
  </Card>
      
      {/* Job Logs */}
      {isLogsExpanded && (
        <JobLogViewer
          job={job}
          isExpanded={isLogsExpanded}
          onToggleExpanded={() => onToggleLogs(job.job_id)}
          className="ml-4"
        />
      )}
    </div>
);
};

/**
 * Job Details Component
 */
const JobDetails = ({ job, queuePosition }) => (
  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
    <div className="text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-600">Job Type:</span>
        <span className="font-medium">{job.job_type}</span>
      </div>
      {job.payload?.specificStoryId && (
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Story ID:</span>
          <span className="font-medium">#{job.payload.specificStoryId}</span>
        </div>
      )}
      {job.payload?.limit && (
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Content Limit:</span>
          <span className="font-medium">{job.payload.limit}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-gray-600">Position in Queue:</span>
        <span className="font-medium">#{queuePosition + 1}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-600">Estimated Wait:</span>
        <span className="font-medium">
          {getEstimatedWaitTime(queuePosition)}
        </span>
      </div>
    </div>
  </div>
);

export default QueuedJobsTab; 