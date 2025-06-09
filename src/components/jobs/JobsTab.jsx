import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import LoadingState from '../ui/loading-state';
import ErrorBoundary from '../ui/error-boundary';
import StatusBadge from '../ui/status-badge';
import JobLogViewer from './JobLogViewer';
import { 
  RefreshCw, 
  Clock, 
  X, 
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { formatDateTime } from '../../utils/helpers';

/**
 * Jobs Tab Component
 * Displays job queue statistics and recent jobs with management actions
 */
const JobsTab = ({
  jobs,
  jobStats,
  workerStatus,
  loading,
  onRefresh,
  onCancelJob,
  onRetryJob,
  selectedJobIdForLogs,
  onSelectJobForLogs,
  onShowLogs
}) => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedJobId, setSelectedJobId] = useState(null);

  // Filter jobs by status
  const activeJobs = jobs.filter(job => ['queued', 'processing'].includes(job.status));
  const completedJobs = jobs.filter(job => ['completed', 'failed', 'cancelled'].includes(job.status));

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
              <Badge variant="default" className="bg-blue-500 text-white">
                📺 Live
              </Badge>
              <Badge variant={workerStatus.isRunning ? 'success' : 'secondary'}>
                {activeJobs.length} queued
              </Badge>
              <Badge variant="outline">
                {activeJobs.filter(j => j.status === 'processing').length} processing
              </Badge>
            </div>
          </div>

          {/* Queue Statistics */}
          <JobStatistics jobStats={jobStats} />
          
          {/* Current Job */}
          {workerStatus.currentJob && (
            <CurrentJobIndicator currentJob={workerStatus.currentJob} />
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-4 mt-4 border-b">
            <Button
              variant={activeTab === 'active' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('active')}
              className="h-8 px-4"
            >
              Active ({activeJobs.length})
            </Button>
            <Button
              variant={activeTab === 'completed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('completed')}
              className="h-8 px-4"
            >
              Recent Completed ({completedJobs.length})
            </Button>
            {selectedJobId && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-600">Viewing logs for Job #{selectedJobId}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedJobId(null)}
                  className="h-6 px-2 text-xs"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <LoadingState message="Loading jobs..." count={4} />
          ) : (
            <>
              {activeTab === 'active' ? (
                <JobsList 
                  jobs={activeJobs}
                  onCancelJob={onCancelJob}
                  onRetryJob={onRetryJob}
                  selectedJobId={selectedJobId}
                  onSelectJob={setSelectedJobId}
                  selectedJobIdForLogs={selectedJobIdForLogs}
                  onSelectJobForLogs={onSelectJobForLogs}
                  onShowLogs={onShowLogs}
                  showActiveHelp={true}
                />
              ) : (
                <JobsList 
                  jobs={completedJobs}
                  onCancelJob={onCancelJob}
                  onRetryJob={onRetryJob}
                  selectedJobId={selectedJobId}
                  onSelectJob={setSelectedJobId}
                  selectedJobIdForLogs={selectedJobIdForLogs}
                  onSelectJobForLogs={onSelectJobForLogs}
                  onShowLogs={onShowLogs}
                  showArticleIds={true}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

/**
 * Job Statistics Component
 */
const JobStatistics = ({ jobStats }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
    <StatCard
      title="Queued"
      value={jobStats.summary.queued || 0}
      variant="warning"
    />
    <StatCard
      title="Processing"
      value={jobStats.summary.processing || 0}
      variant="default"
    />
    <StatCard
      title="Completed"
      value={jobStats.summary.completed || 0}
      variant="success"
    />
    <StatCard
      title="Failed"
      value={jobStats.summary.failed || 0}
      variant="destructive"
    />
    <StatCard
      title="Total (24h)"
      value={jobStats.summary.total_jobs || 0}
      variant="outline"
    />
  </div>
);

/**
 * Stat Card Component
 */
const StatCard = ({ title, value, variant }) => (
  <Card className="border-2">
    <CardContent className="pt-4">
      <div className="text-2xl font-bold text-gray-600">{value}</div>
      <p className="text-xs text-muted-foreground">{title}</p>
    </CardContent>
  </Card>
);

/**
 * Current Job Indicator Component
 */
const CurrentJobIndicator = ({ currentJob }) => (
  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
    <div className="flex items-center gap-2 mb-2">
      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      <span className="font-medium text-blue-900">Currently Processing</span>
    </div>
    <p className="text-sm text-blue-800">
      Job #{currentJob.job_id} ({currentJob.job_type})
    </p>
    <p className="text-xs text-blue-600">
      Started: {formatDateTime(currentJob.created_at)}
    </p>
  </div>
);

/**
 * Jobs List Component
 */
const JobsList = ({ jobs, onCancelJob, onRetryJob, selectedJobId, onSelectJob, selectedJobIdForLogs, onSelectJobForLogs, onShowLogs, showActiveHelp = false, showArticleIds = false }) => {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        {showActiveHelp ? (
          <>
            <p>No active jobs</p>
            <p className="text-sm">Generate content from stories to see queued and processing jobs here</p>
            <p className="text-xs text-muted-foreground mt-2">This page shows real-time updates as jobs are processed</p>
          </>
        ) : (
          <>
            <p>No completed jobs found</p>
            <p className="text-sm">Complete some content generation jobs to see their results and article mappings here</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">
          {showActiveHelp ? 'Active Jobs' : 'Completed Jobs'}
          {showArticleIds && <span className="text-xs text-muted-foreground ml-2">(with Article IDs)</span>}
        </h3>
        <span className="text-sm text-muted-foreground">{jobs.length} jobs</span>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard
            key={`job-${job.job_id}`}
            job={job}
            onCancelJob={onCancelJob}
            onRetryJob={onRetryJob}
            isSelected={selectedJobId === job.job_id}
            onSelect={() => onSelectJob(job.job_id)}
            selectedJobIdForLogs={selectedJobIdForLogs}
            onSelectJobForLogs={onSelectJobForLogs}
            onShowLogs={onShowLogs}
            showArticleIds={showArticleIds}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Job Card Component
 */
const JobCard = ({ job, onCancelJob, onRetryJob, isSelected, onSelect, selectedJobIdForLogs, onSelectJobForLogs, onShowLogs, showArticleIds }) => {
  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="space-y-2">
      <Card className={`border ${isSelected ? 'ring-2 ring-blue-500 border-blue-300' : ''}`}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium">#{job.job_id}</span>
                <Badge variant="outline" className="text-xs">
                  {job.job_type.replace('_', ' ')}
                </Badge>
                <StatusBadge status={job.status} type="job" />
                
                {/* Article ID Badge */}
                {showArticleIds && job.payload && job.payload.specificStoryId && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                    📄 Story #{job.payload.specificStoryId}
                  </Badge>
                )}
              </div>

              <JobTimestamps job={job} />

              {/* Job Progress */}
              {job.status === 'processing' && job.progress_percentage > 0 && (
                <JobProgress job={job} />
              )}

              {/* Job Payload */}
              {job.payload && <JobPayload payload={job.payload} showArticleIds={showArticleIds} />}

              {/* Job Results */}
              {job.results && job.status === 'completed' && (
                <JobResults results={job.results} job={job} />
              )}

              {/* Error Message */}
              {job.error_message && <JobError errorMessage={job.error_message} />}
            </div>

            {/* Job Actions */}
            <div className="flex items-center gap-2 ml-4">
              {/* Filter Logs Button */}
              <Button
                size="sm"
                variant={selectedJobIdForLogs === job.job_id ? "default" : "outline"}
                onClick={() => {
                  onSelectJobForLogs(job.job_id);
                  onShowLogs();
                }}
                className="h-7 px-2 text-xs"
                title="Open log viewer filtered to this job"
              >
                🔍 View Logs
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLogs(!showLogs)}
                className="h-7 px-2 text-xs"
              >
                <FileText className="w-3 h-3 mr-1" />
                {showLogs ? 'Hide' : 'Show'} Logs
                {showLogs ? (
                  <ChevronUp className="w-3 h-3 ml-1" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-1" />
                )}
              </Button>
              
              {job.status === 'queued' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancelJob(job.job_id)}
                  className="h-7 px-2 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              )}
              {job.status === 'failed' && job.retry_count < job.max_retries && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRetryJob(job.job_id)}
                  className="h-7 px-2 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Logs */}
      {showLogs && (
        <JobLogViewer
          job={job}
          isExpanded={showLogs}
          onToggleExpanded={setShowLogs}
          className="ml-4"
        />
      )}
    </div>
  );
};

/**
 * Job Timestamps Component
 */
const JobTimestamps = ({ job }) => (
  <div className="text-sm text-gray-600 mb-2">
    <div className="flex items-center gap-4 text-xs">
      <span>Created: {formatDateTime(job.created_at)}</span>
      {job.started_at && (
        <span>Started: {formatDateTime(job.started_at)}</span>
      )}
      {job.completed_at && (
        <span>Completed: {formatDateTime(job.completed_at)}</span>
      )}
      {job.duration && (
        <span>Duration: {job.duration}s</span>
      )}
    </div>
  </div>
);

/**
 * Job Progress Component
 */
const JobProgress = ({ job }) => (
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
);

/**
 * Job Payload Component
 */
const JobPayload = ({ payload, showArticleIds }) => (
  <div className="mb-2">
    <span className="text-xs font-medium text-gray-700">Parameters: </span>
    <span className="text-xs text-gray-600">
      {payload.specificStoryId ? (
        showArticleIds ? (
          <>
            <span className="font-medium text-blue-700">Story #{payload.specificStoryId}</span>
            {payload.limit && `, Limit: ${payload.limit}`}
          </>
        ) : (
          `Story #${payload.specificStoryId}${payload.limit ? `, Limit: ${payload.limit}` : ''}`
        )
      ) : payload.limit ? (
        `Top ${payload.limit} stories`
      ) : (
        Object.keys(payload).length === 0 ? 'None' : JSON.stringify(payload)
      )}
    </span>
  </div>
);

/**
 * Job Results Component
 */
const JobResults = ({ results, job }) => (
  <div className="mb-2 p-2 bg-green-50 rounded border border-green-200">
    <span className="text-xs font-medium text-green-800">Results: </span>
    <div className="text-xs text-green-700 mt-1">
      {results.contentGenerated && (
        <div>✅ {results.contentGenerated} content pieces generated</div>
      )}
      {results.blogId && (
        <div>📝 Generated Blog ID: <span className="font-medium">#{results.blogId}</span></div>
      )}
      {results.blogIds && results.blogIds.length > 0 && (
        <div>📝 Generated Blog IDs: {results.blogIds.map(id => `#${id}`).join(', ')}</div>
      )}
      {results.specificStoryId && (
        <div>📄 Source Story: <span className="font-medium">#{results.specificStoryId}</span></div>
      )}
      {results.storyTitle && (
        <div className="text-xs text-green-600 italic mt-1">"{results.storyTitle}"</div>
      )}
      {results.articlesAggregated && (
        <div>📰 {results.articlesAggregated} articles aggregated</div>
      )}
      {results.articlesAnalyzed && (
        <div>🧠 {results.articlesAnalyzed} articles analyzed</div>
      )}
    </div>
  </div>
);

/**
 * Job Error Component
 */
const JobError = ({ errorMessage }) => (
  <div className="mb-2 p-2 bg-red-50 rounded border border-red-200">
    <span className="text-xs font-medium text-red-800">Error: </span>
    <span className="text-xs text-red-700">{errorMessage}</span>
  </div>
);

export default JobsTab; 