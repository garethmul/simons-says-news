import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Terminal, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Search,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Database
} from 'lucide-react';

const LogViewer = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [logStats, setLogStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const logContainerRef = useRef(null);

  // Scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Connect to log stream and fetch initial data
  useEffect(() => {
    if (!isOpen) return;

    fetchLogHistory();
    fetchLogStats();
    connectToLogStream();

    return () => {
      disconnectFromLogStream();
    };
  }, [isOpen]);

  // Fetch log history from database
  const fetchLogHistory = async () => {
    try {
      const params = new URLSearchParams({
        limit: '100'
      });
      
      if (levelFilter !== 'all') {
        params.append('level', levelFilter);
      }
      
      if (sourceFilter !== 'all') {
        params.append('source', sourceFilter);
      }

      const response = await fetch(`/api/eden/logs/history?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch log history:', error);
    }
  };

  // Fetch log statistics
  const fetchLogStats = async () => {
    try {
      const response = await fetch('/api/eden/logs/stats');
      const data = await response.json();
      
      if (data.success) {
        setLogStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch log stats:', error);
    }
  };

  // Refresh logs when filters change
  useEffect(() => {
    if (isOpen) {
      fetchLogHistory();
    }
  }, [levelFilter, sourceFilter]);

  const connectToLogStream = () => {
    try {
      setConnectionStatus('connecting');
      eventSourceRef.current = new EventSource('/api/eden/logs/stream');
      
      eventSourceRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        console.log('Connected to log stream');
      };

      eventSourceRef.current.onmessage = (event) => {
        if (isPaused) return;
        
        try {
          const logEntry = JSON.parse(event.data);
          
          // Skip heartbeat messages
          if (logEntry.type === 'heartbeat') return;
          
          setLogs(prevLogs => {
            // Check if this log already exists (avoid duplicates)
            const exists = prevLogs.some(log => 
              log.id === logEntry.id || 
              (log.timestamp === logEntry.timestamp && log.message === logEntry.message)
            );
            
            if (exists) return prevLogs;
            
            // Append new logs to the end for chronological order (oldest first, newest last)
            const newLogs = [...prevLogs, logEntry];
            // Keep only last 200 logs in memory for performance
            return newLogs.slice(-200);
          });
        } catch (error) {
          console.error('Error parsing log entry:', error);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error('Log stream error:', error);
        setIsConnected(false);
        setConnectionStatus('error');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (isOpen) {
            connectToLogStream();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to connect to log stream:', error);
      setConnectionStatus('error');
    }
  };

  const disconnectFromLogStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  const clearLogs = async () => {
    try {
      const response = await fetch('/api/eden/logs', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setLogs([]);
        await fetchLogStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const clearOldLogs = async () => {
    try {
      const response = await fetch('/api/eden/logs?olderThanDays=7', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchLogHistory(); // Refresh logs
        await fetchLogStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to clear old logs:', error);
    }
  };

  const downloadLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eden-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'debug':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'debug':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === '' || 
      log.message.toLowerCase().includes(filter.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSource = sourceFilter === 'all' || log.source === sourceFilter;
    return matchesFilter && matchesLevel && matchesSource;
  });

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800">Connecting...</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Connection Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Disconnected</Badge>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[80vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6" />
              <div>
                <CardTitle>Database Log Viewer</CardTitle>
                <CardDescription>Real-time system logs stored in database</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getConnectionStatusBadge()}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowStats(!showStats)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Stats
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
          
          {/* Statistics Panel */}
          {showStats && logStats && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3">Log Statistics (Last 7 Days)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['info', 'warn', 'error', 'debug'].map(level => {
                  const count = logStats.reduce((sum, stat) => 
                    stat.level === level ? sum + stat.count : sum, 0
                  );
                  return (
                    <div key={level} className="text-center">
                      <div className={`text-2xl font-bold ${
                        level === 'error' ? 'text-red-600' :
                        level === 'warn' ? 'text-yellow-600' :
                        level === 'info' ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {count}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">{level}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                variant={isPaused ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              
              <Button variant="outline" size="sm" onClick={clearOldLogs}>
                <Trash2 className="w-4 h-4" />
                Clear Old
              </Button>
              
              <Button variant="outline" size="sm" onClick={clearLogs}>
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
              
              <Button variant="outline" size="sm" onClick={downloadLogs}>
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Filter logs..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
              
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="ai">AI Service</SelectItem>
                </SelectContent>
              </Select>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded"
                />
                Auto-scroll
              </label>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0">
          <div 
            ref={logContainerRef}
            className="h-full overflow-y-auto bg-gray-50 font-mono text-sm"
            style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
          >
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No logs to display</p>
                  <p className="text-xs mt-1">
                    {isPaused ? 'Logs are paused' : 'Waiting for log entries...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-1">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id || `${log.timestamp}-${log.message.substring(0, 20)}`}
                    className="flex items-start gap-3 p-2 rounded hover:bg-white transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getLogIcon(log.level)}
                    </div>
                    
                    <div className="flex-shrink-0 text-xs text-gray-500 mt-0.5 w-20">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    
                    <Badge 
                      className={`flex-shrink-0 text-xs ${getLogLevelColor(log.level)}`}
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    
                    {log.source && (
                      <Badge variant="outline" className="flex-shrink-0 text-xs">
                        {log.source}
                      </Badge>
                    )}
                    
                    <div className="flex-1 break-words">
                      <span className="text-gray-800">{log.message}</span>
                      {log.metadata && (
                        <div className="mt-1 text-xs text-gray-600 bg-gray-100 p-2 rounded">
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </CardContent>
        
        {/* Status bar */}
        <div className="flex-shrink-0 px-4 py-2 bg-gray-100 border-t text-xs text-gray-600 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Total logs: {logs.length}</span>
            <span>Filtered: {filteredLogs.length}</span>
            {isPaused && (
              <Badge className="bg-yellow-100 text-yellow-800">
                <Pause className="w-3 h-3 mr-1" />
                Paused
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Last update: {logs.length > 0 ? new Date(logs[logs.length - 1]?.timestamp).toLocaleTimeString() : 'Never'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LogViewer; 