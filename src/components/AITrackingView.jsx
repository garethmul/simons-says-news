import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Brain, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  Copy,
  Database,
  Gauge,
  Activity,
  FileText,
  Settings
} from 'lucide-react';
import { useAccount } from '../contexts/AccountContext';

/**
 * AI Tracking View Component
 * Displays comprehensive AI prompt, response, and metadata tracking
 */
const AITrackingView = ({ contentId, contentCategory = null }) => {
  const { withAccountContext } = useAccount();
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    if (contentId) {
      fetchTrackingData();
    }
  }, [contentId, contentCategory]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        contentId: contentId.toString()
      });
      
      if (contentCategory) {
        params.append('category', contentCategory);
      }

      const response = await fetch(`/api/eden/ai-tracking?${params}`, withAccountContext());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tracking data: ${response.status}`);
      }
      
      const data = await response.json();
      setTrackingData(data.entries || []);
    } catch (err) {
      console.error('Error fetching AI tracking data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  const formatTokens = (tokens) => {
    if (!tokens) return '0';
    return tokens.toLocaleString();
  };

  const formatDuration = (ms) => {
    if (!ms) return '0ms';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStopReasonBadge = (stopReason, isComplete, isTruncated) => {
    if (isTruncated) {
      return <Badge variant="destructive" className="text-xs">Truncated</Badge>;
    }
    if (stopReason === 'STOP' || isComplete) {
      return <Badge variant="default" className="text-xs">Complete</Badge>;
    }
    if (stopReason === 'MAX_TOKENS') {
      return <Badge variant="outline" className="text-xs">Token Limit</Badge>;
    }
    if (stopReason === 'SAFETY') {
      return <Badge variant="secondary" className="text-xs">Safety Filter</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{stopReason}</Badge>;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'blog_post': return <FileText className="w-4 h-4" />;
      case 'social_media': return <Activity className="w-4 h-4" />;
      case 'video_script': return <Eye className="w-4 h-4" />;
      case 'prayer': case 'prayer_points': return <Brain className="w-4 h-4" />;
      case 'image_generation': return <Settings className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            Loading AI tracking data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 mb-2">Failed to load tracking data</p>
            <p className="text-sm text-gray-600">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchTrackingData} className="mt-3">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trackingData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-gray-500">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No AI tracking data available</p>
            <p className="text-sm mt-1">Content may have been generated before tracking was implemented</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-sm font-medium">Total Generations</div>
              <div className="text-2xl font-bold">{trackingData.length}</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-sm font-medium">Total Tokens</div>
              <div className="text-2xl font-bold">
                {formatTokens(trackingData.reduce((sum, entry) => sum + (entry.tokens_used_total || 0), 0))}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <div>
              <div className="text-sm font-medium">Avg Generation Time</div>
              <div className="text-2xl font-bold">
                {formatDuration(trackingData.reduce((sum, entry) => sum + (entry.generation_time_ms || 0), 0) / trackingData.length)}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-orange-600" />
            <div>
              <div className="text-sm font-medium">Success Rate</div>
              <div className="text-2xl font-bold">
                {Math.round((trackingData.filter(entry => entry.success).length / trackingData.length) * 100)}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Tracking Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Generation Tracking
          </CardTitle>
          <CardDescription>
            Comprehensive prompt, response, and metadata tracking for content generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trackingData.map((entry, index) => (
              <div key={entry.response_log_id || index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(entry.content_category)}
                    <div>
                      <div className="font-medium capitalize">
                        {entry.content_category.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {entry.ai_service} • {entry.model_used}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStopReasonBadge(entry.stop_reason, entry.is_complete, entry.is_truncated)}
                    <Badge variant="outline" className="text-xs">
                      {formatTokens(entry.tokens_used_total)} tokens
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {formatDuration(entry.generation_time_ms)}
                    </Badge>
                  </div>
                </div>

                <Tabs defaultValue="prompt" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="prompt">Prompt</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                    <TabsTrigger value="metadata">Metadata</TabsTrigger>
                    <TabsTrigger value="system">System</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="prompt" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">User Prompt</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(entry.prompt_text)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-48 leading-relaxed">
                        {entry.prompt_text}
                      </pre>
                      
                      {entry.system_message && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">System Message</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => copyToClipboard(entry.system_message)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <pre className="bg-blue-50 p-3 rounded text-xs overflow-auto max-h-32 leading-relaxed">
                            {entry.system_message}
                          </pre>
                        </>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="response" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">AI Response</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(entry.response_text)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <pre className="bg-green-50 p-3 rounded text-xs overflow-auto max-h-64 leading-relaxed">
                        {entry.response_text}
                      </pre>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="metadata" className="mt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Input Tokens:</span>
                        <div>{formatTokens(entry.tokens_used_input)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Output Tokens:</span>
                        <div>{formatTokens(entry.tokens_used_output)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Total Tokens:</span>
                        <div>{formatTokens(entry.tokens_used_total)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Generation Time:</span>
                        <div>{formatDuration(entry.generation_time_ms)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Temperature:</span>
                        <div>{entry.temperature}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Max Output Tokens:</span>
                        <div>{formatTokens(entry.max_output_tokens)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Stop Reason:</span>
                        <div>{entry.stop_reason}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Content Filter:</span>
                        <div>{entry.content_filter_applied ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                    
                    {entry.safety_ratings && (
                      <div className="mt-4">
                        <span className="text-sm font-medium text-gray-600 block mb-2">Safety Ratings:</span>
                        <pre className="bg-gray-50 p-3 rounded text-xs">
                          {(() => {
                            try {
                              const ratings = typeof entry.safety_ratings === 'string' 
                                ? JSON.parse(entry.safety_ratings || '[]')
                                : entry.safety_ratings || [];
                              return JSON.stringify(ratings, null, 2);
                            } catch (error) {
                              return `Invalid JSON: ${entry.safety_ratings}`;
                            }
                          })()}
                        </pre>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="system" className="mt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Template ID:</span>
                        <div>{entry.template_id}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Version ID:</span>
                        <div>{entry.version_id}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Generated At:</span>
                        <div>{new Date(entry.created_at).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Success:</span>
                        <div className="flex items-center gap-1">
                          {entry.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          {entry.success ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>
                    
                    {entry.warning_message && (
                      <div className="mt-4">
                        <span className="text-sm font-medium text-amber-600 block mb-2">Warning:</span>
                        <div className="bg-amber-50 p-3 rounded text-sm text-amber-800">
                          {entry.warning_message}
                        </div>
                      </div>
                    )}
                    
                    {entry.error_message && (
                      <div className="mt-4">
                        <span className="text-sm font-medium text-red-600 block mb-2">Error:</span>
                        <div className="bg-red-50 p-3 rounded text-sm text-red-800">
                          {entry.error_message}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AITrackingView; 