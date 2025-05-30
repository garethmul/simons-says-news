import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import LoadingState from '../ui/loading-state';
import ErrorBoundary from '../ui/error-boundary';
import StatusBadge from '../ui/status-badge';
import { 
  RefreshCw, 
  Clock, 
  X, 
  RotateCcw,
  Loader2
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
  onRetryJob
}) => {
  return (
    <ErrorBoundary>
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
              <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant={workerStatus.isRunning ? 'success' : 'secondary'}>
                Worker: {workerStatus.isRunning ? 'Running' : 'Stopped'}
              </Badge>
            </div>
          </div>

          {/* Queue Statistics */}
          <JobStatistics jobStats={jobStats} />
          
          {/* Current Job */}
          {workerStatus.currentJob && (
            <CurrentJobIndicator currentJob={workerStatus.currentJob} />
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <LoadingState message="Loading jobs..." count={4} />
          ) : (
            <RecentJobsList 
              jobs={jobs}
              onCancelJob={onCancelJob}
              onRetryJob={onRetryJob}
            />
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
 * Recent Jobs List Component
 */
const RecentJobsList = ({ jobs, onCancelJob, onRetryJob }) => {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No jobs found</p>
        <p className="text-sm">Create content generation or full cycle jobs to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Recent Jobs</h3>
        <span className="text-sm text-muted-foreground">{jobs.length} jobs</span>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard
            key={`job-${job.job_id}`}
            job={job}
            onCancelJob={onCancelJob}
            onRetryJob={onRetryJob}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Job Card Component
 */
const JobCard = ({ job, onCancelJob, onRetryJob }) => (
  <Card className="border">
    <CardContent className="pt-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium">#{job.job_id}</span>
            <Badge variant="outline" className="text-xs">
              {job.job_type.replace('_', ' ')}
            </Badge>
            <StatusBadge status={job.status} type="job" />
          </div>

          <JobTimestamps job={job} />

          {/* Job Progress */}
          {job.status === 'processing' && job.progress_percentage > 0 && (
            <JobProgress job={job} />
          )}

          {/* Job Payload */}
          {job.payload && <JobPayload payload={job.payload} />}

          {/* Job Results */}
          {job.results && job.status === 'completed' && (
            <JobResults results={job.results} />
          )}

          {/* Error Message */}
          {job.error_message && <JobError errorMessage={job.error_message} />}
        </div>

        {/* Job Actions */}
        <JobActions 
          job={job} 
          onCancelJob={onCancelJob} 
          onRetryJob={onRetryJob} 
        />
      </div>
    </CardContent>
  </Card>
);

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
const JobPayload = ({ payload }) => (
  <div className="mb-2">
    <span className="text-xs font-medium text-gray-700">Parameters: </span>
    <span className="text-xs text-gray-600">
      {payload.specificStoryId && `Story #${payload.specificStoryId}`}
      {payload.limit && `, Limit: ${payload.limit}`}
      {Object.keys(payload).length === 0 && 'None'}
    </span>
  </div>
);

/**
 * Job Results Component
 */
const JobResults = ({ results }) => (
  <div className="mb-2 p-2 bg-green-50 rounded border border-green-200">
    <span className="text-xs font-medium text-green-800">Results: </span>
    <span className="text-xs text-green-700">
      {results.contentGenerated && `${results.contentGenerated} content pieces generated`}
      {results.articlesAggregated && `${results.articlesAggregated} articles aggregated`}
      {results.articlesAnalyzed && `, ${results.articlesAnalyzed} analyzed`}
    </span>
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

/**
 * Job Actions Component
 */
const JobActions = ({ job, onCancelJob, onRetryJob }) => (
  <div className="flex items-center gap-2 ml-4">
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
);

export default JobsTab; 