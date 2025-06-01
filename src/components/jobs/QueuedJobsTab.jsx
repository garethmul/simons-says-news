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
  Play,
  Loader2
} from 'lucide-react';
import { formatDateTime, getEstimatedWaitTime } from '../../utils/helpers';
import HelpSection from '../common/HelpSection';

/**
 * Queued Jobs Tab Component
 * Displays jobs waiting to be processed by the worker
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
  // Debug: Log all jobs and their statuses
  console.log('All jobs in QueuedJobsTab:', jobs);
  console.log('Job statuses:', jobs.map(job => ({ id: job.job_id, status: job.status })));
  
  // Filter for queued jobs - check for both 'queued' and 'pending' status
  const queuedJobs = jobs.filter(job => 
    job.status === 'queued' || 
    job.status === 'pending' || 
    job.status === 'created'
  );
  
  console.log('Filtered queued jobs:', queuedJobs);

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Queued Content Generation Jobs</CardTitle>
              <CardDescription>
                Content generation jobs waiting to be processed
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant="outline" className="text-sm">
                {queuedJobs.length} queued
              </Badge>
            </div>
          </div>
          
          {/* Help section */}
          <HelpSection 
            title="⏳ Queued Jobs Help"
            bgColor="bg-yellow-50"
            borderColor="border-yellow-200"
            textColor="text-yellow-800"
            headingColor="text-yellow-900"
          >
            <h3 className="font-semibold text-yellow-900 mb-2">⏳ What you're viewing:</h3>
            <p className="text-sm text-yellow-800 mb-3">
              Content generation jobs that have been created but are waiting to be processed by the job worker. 
              These are typically created when you click "Generate Content" on stories.
            </p>
            <h4 className="font-semibold text-yellow-900 mb-1">🔄 How jobs are processed:</h4>
            <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
              <li>Jobs are processed in first-in-first-out (FIFO) order</li>
              <li>Each job generates blog posts, social media content, and video scripts</li>
              <li>Completed content moves to the Review tab for human approval</li>
              <li>Job worker must be running to process queued jobs</li>
            </ul>
          </HelpSection>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Loading queued jobs..." count={3} />
          ) : (
            <>
              {/* Worker Status Alert */}
              {!workerStatus.isRunning && queuedJobs.length > 0 && (
                <WorkerStatusAlert onStartWorker={onStartWorker} />
              )}

              {queuedJobs.length === 0 ? (
                <EmptyState />
              ) : (
                <JobsList 
                  queuedJobs={queuedJobs} 
                  workerStatus={workerStatus}
                  onCancelJob={onCancelJob}
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
    <p>No jobs currently queued</p>
    <p className="text-sm">Generate content from stories to see jobs here</p>
  </div>
);

/**
 * Jobs List Component
 */
const JobsList = ({ queuedJobs, workerStatus, onCancelJob }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
      <span>Showing {queuedJobs.length} queued job{queuedJobs.length !== 1 ? 's' : ''}</span>
      <span>Worker status: {workerStatus.isRunning ? 'Running' : 'Stopped'}</span>
    </div>
    
    {queuedJobs.map((job, index) => (
      <JobCard 
        key={`queued-job-${job.job_id}`}
        job={job}
        queuePosition={index}
        onCancelJob={onCancelJob}
      />
    ))}
  </div>
);

/**
 * Job Card Component
 */
const JobCard = ({ job, queuePosition, onCancelJob }) => (
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
);

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