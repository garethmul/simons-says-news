import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useAccount } from '../../contexts/AccountContext';
import { API_ENDPOINTS, REFRESH_INTERVALS } from '../../utils/constants';
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  RefreshCw,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  Clock
} from 'lucide-react';

/**
 * Get log level icon and color
 */
const getLogLevelDisplay = (level) => {
  switch (level) {
    case 'error':
      return { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-50' };
    case 'warn':
      return { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-50' };
    case 'debug':
      return { icon: Bug, color: 'text-gray-500', bgColor: 'bg-gray-50' };
    case 'info':
    default:
      return { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-50' };
  }
};

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-GB', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
};

/**
 * Job Log Viewer Component
 * Shows detailed logs for a specific job with real-time updates
 */
const JobLogViewer = ({ job, isExpanded, onToggleExpanded, className = '' }) => {
  const { withAccountContext } = useAccount();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(job?.status === 'processing');
  const autoRefreshRef = useRef(null);
  const logsEndRef = useRef(null);

  // Fetch logs for this job
  const fetchJobLogs = async () => {
    if (!job?.job_id) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = API_ENDPOINTS.JOB_LOGS.replace('{id}', job.job_id);
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}${endpoint}`, 
        withAccountContext()
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        throw new Error('Failed to fetch job logs');
      }
    } catch (err) {
      console.error('Error fetching job logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom when new logs arrive
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Set up auto-refresh for processing jobs
  useEffect(() => {
    if (autoRefresh && job?.status === 'processing') {
      autoRefreshRef.current = setInterval(fetchJobLogs, REFRESH_INTERVALS.LOGS); // Use LOGS interval instead of 2000
    } else {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, job?.status]);

  // Update auto-refresh when job status changes
  useEffect(() => {
    if (job?.status !== 'processing') {
      setAutoRefresh(false);
    }
  }, [job?.status]);

  // Fetch logs when expanded or job changes
  useEffect(() => {
    if (isExpanded && job?.job_id) {
      fetchJobLogs();
    }
  }, [isExpanded, job?.job_id]);

  // Scroll to bottom when logs change
  useEffect(() => {
    if (logs.length > 0) {
      scrollToBottom();
    }
  }, [logs]);

  // Download logs as text file
  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${formatTimestamp(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${job.job_id}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!job) {
    return null;
  }

  return (
    <Card className={`border-l-4 border-l-blue-500 ${className}`}>
      <CardHeader className="cursor-pointer" onClick={() => onToggleExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
              <CardTitle className="text-lg">
                Job #{job.job_id} Logs
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {job.job_type}
            </Badge>
            <Badge variant={
              job.status === 'completed' ? 'success' :
              job.status === 'failed' ? 'destructive' :
              job.status === 'processing' ? 'default' : 'secondary'
            }>
              {job.status}
            </Badge>
          </div>
          
          {isExpanded && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {job.status === 'processing' && (
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Auto-refresh
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchJobLogs}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {logs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadLogs}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              )}
            </div>
          )}
        </div>
        
        <CardDescription>
          {job.progress_details || `${job.job_type} job`} • {logs.length} log entries
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Error loading logs: {error}</span>
              </div>
            </div>
          )}

          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No logs found for this job</p>
              <p className="text-sm">Logs may not be available for older jobs</p>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
                <span>{logs.length} log entries</span>
                {autoRefresh && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Live updates</span>
                  </div>
                )}
              </div>
              
              <ScrollArea className="h-96 w-full border rounded-md">
                <div className="p-4 space-y-2">
                  {logs.map((log, index) => {
                    const { icon: LogIcon, color, bgColor } = getLogLevelDisplay(log.level);
                    
                    return (
                      <div
                        key={`${log.id || index}`}
                        className={`flex items-start gap-3 p-2 rounded-md ${bgColor} border border-gray-100`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <LogIcon className={`w-4 h-4 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-500">
                              {formatTimestamp(log.timestamp)}
                            </span>
                            <Badge variant="outline" className="text-xs py-0">
                              {log.level}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-800 break-words">
                            {log.message}
                          </p>
                          {log.metadata && (
                            <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default JobLogViewer; 