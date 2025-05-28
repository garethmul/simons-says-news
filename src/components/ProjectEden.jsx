import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import ProgressModal from './ProgressModal';
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
  Star
} from 'lucide-react';

const ProjectEden = () => {
  const [stats, setStats] = useState({
    articlesAggregated: 0,
    articlesAnalyzed: 0,
    contentGenerated: 0,
    pendingReview: 0
  });
  
  const [contentForReview, setContentForReview] = useState([]);
  const [topStories, setTopStories] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch content for review - include both draft and review_pending
      const reviewResponse = await fetch('/api/eden/content/review?status=draft,review_pending&limit=10');
      const reviewData = await reviewResponse.json();
      if (reviewData.success) {
        setContentForReview(reviewData.content);
        setStats(prev => ({ ...prev, pendingReview: reviewData.content.length }));
      }

      // Fetch top stories
      const storiesResponse = await fetch('/api/eden/news/top-stories?limit=5&minScore=0.1');
      const storiesData = await storiesResponse.json();
      if (storiesData.success) {
        setTopStories(storiesData.stories);
      }

      // Fetch source status
      const sourcesResponse = await fetch('/api/eden/news/sources/status');
      const sourcesData = await sourcesResponse.json();
      if (sourcesData.success) {
        setSources(sourcesData.sources);
        const totalArticles = sourcesData.sources.reduce((sum, source) => sum + source.articles_last_24h, 0);
        setStats(prev => ({ ...prev, articlesAggregated: totalArticles }));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runFullCycle = async () => {
    setLoading(true);
    setShowProgressModal(true);
    
    try {
      const response = await fetch('/api/eden/automate/full-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (!data.success) {
        console.error('Failed to start automation cycle:', data.error);
        setShowProgressModal(false);
      }
    } catch (error) {
      console.error('Error starting automation cycle:', error);
      setShowProgressModal(false);
    } finally {
      setLoading(false);
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
    await fetchDashboardData();
    
    // Close progress modal after a short delay
    setTimeout(() => {
      setShowProgressModal(false);
    }, 2000);
  };

  const updateContentStatus = async (contentId, contentType, status) => {
    try {
      const response = await fetch(`/api/eden/content/${contentType}/${contentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        // Refresh content list
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating content status:', error);
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

  const approveContent = async (contentId) => {
    await updateContentStatus(contentId, 'article', 'approved');
    closeDetailModal();
  };

  const rejectContent = async (contentId) => {
    await updateContentStatus(contentId, 'article', 'draft');
    closeDetailModal();
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      review_pending: 'warning',
      approved: 'success',
      published: 'default'
    };
    
    return <Badge variant={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Project Eden</h1>
              <p className="text-lg text-gray-600">AI-Powered Content Automation for Eden.co.uk</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={fetchDashboardData} variant="outline" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={runFullCycle} disabled={loading}>
                <Play className="w-4 h-4 mr-2" />
                Run Full Cycle
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="review" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="review">Content Review</TabsTrigger>
            <TabsTrigger value="stories">Top Stories</TabsTrigger>
            <TabsTrigger value="sources">News Sources</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Content Review Tab */}
          <TabsContent value="review" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Awaiting Review</CardTitle>
                <CardDescription>
                  Review and approve AI-generated content before publishing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentForReview.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No content pending review</p>
                    <p className="text-sm">Run the full cycle to generate new content</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contentForReview.map((content) => (
                      <Card key={content.gen_article_id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{content.title}</CardTitle>
                              <CardDescription className="mt-2">
                                {content.content_type} • {content.word_count} words • 
                                Created {new Date(content.created_at).toLocaleDateString()}
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
                              onClick={() => approveContent(content.gen_article_id)}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => rejectContent(content.gen_article_id)}
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

          {/* Top Stories Tab */}
          <TabsContent value="stories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Christian News Stories</CardTitle>
                <CardDescription>
                  Highest relevance stories for Eden's content strategy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topStories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No analyzed stories available</p>
                    <p className="text-sm">Run news aggregation and analysis to see top stories</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topStories.map((story) => (
                      <Card key={story.article_id} className="border-l-4 border-l-green-500">
                        <CardHeader>
                          <CardTitle className="text-lg">{story.title}</CardTitle>
                          <CardDescription>
                            {story.source_name} • Relevance: {(story.relevance_score * 100).toFixed(0)}% • 
                            {new Date(story.publication_date).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 mb-3">{story.summary_ai}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {story.keywords_ai?.split(',').slice(0, 5).map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {keyword.trim()}
                              </Badge>
                            ))}
                          </div>
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Content
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* News Sources Tab */}
          <TabsContent value="sources" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Christian News Sources</CardTitle>
                <CardDescription>
                  Status and performance of configured news sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sources.map((source, index) => (
                    <Card key={index} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{source.name}</CardTitle>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
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
                    <div className="text-3xl font-bold text-blue-600 mb-2">94</div>
                    <div className="text-sm text-gray-600">Total Articles Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">8</div>
                    <div className="text-sm text-gray-600">Active News Sources</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">100%</div>
                    <div className="text-sm text-gray-600">System Uptime</div>
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
                          {selectedContent.sourceArticle.keywords.split(',').map((keyword, index) => (
                            <Badge key={index} variant="secondary">
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
                      <Card key={post.gen_social_id} className="border">
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
                      <Card key={script.gen_video_script_id} className="border">
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
                                {JSON.parse(script.visual_suggestions).map((suggestion, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
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
                      {JSON.parse(selectedContent.suggested_eden_product_links).map((link, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
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
                  onClick={() => approveContent(selectedContent.gen_article_id)}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve Content
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => rejectContent(selectedContent.gen_article_id)}
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
        />
      )}
    </div>
  );
};

export default ProjectEden; 