import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  X, 
  Check, 
  XCircle, 
  FileText, 
  Share2, 
  Video, 
  Heart,
  ExternalLink,
  Calendar,
  Star,
  Image,
  Clock,
  User,
  Tag,
  Archive
} from 'lucide-react';
import { formatDate, getDaysAgo, parseKeywords } from '../../utils/helpers';
import { useContentTypes } from '../../hooks/useContentTypes';

/**
 * Comprehensive Detail Modal Component
 * Displays content with full details, associated content, and rich formatting
 */
const DetailModal = ({ 
  showModal, 
  selectedContent, 
  onClose, 
  onApprove, 
  onReject,
  onPublish,
  onReturnToReview,
  onReturnToApproved,
  onRegenerate,
  onArchive,
  showApprovalActions = true,
  showPublishActions = false,
  showRejectedActions = false,
  showArchivedActions = false,
  isActionLoading
}) => {
  // ALL hooks must be called before any conditional logic
  const { getContentTypeName, getContentTypeIcon } = useContentTypes();
  const [activeTab, setActiveTab] = useState('content');

  // Handle Escape key to close modal and body scroll management
  useEffect(() => {
    if (!showModal || !selectedContent) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Store original overflow value to restore later
    const originalOverflow = document.body.style.overflow;
    
    // Set up modal behavior
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = originalOverflow || 'unset';
    };
  }, [showModal, selectedContent, onClose]);

  // Early return AFTER all hooks have been called
  if (!showModal || !selectedContent) return null;

  const contentTypeName = getContentTypeName(selectedContent.content_type);
  const isArchiving = isActionLoading && isActionLoading(`update-article-${selectedContent.gen_article_id}`);
  const isUpdating = isArchiving;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        // Close modal when clicking backdrop (outside the modal content)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 flex-shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">{contentTypeName}</span>
              <Badge variant="outline" className="text-xs">
                {selectedContent.word_count} words
              </Badge>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {selectedContent.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {formatDate(selectedContent.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {getDaysAgo(selectedContent.created_at)}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Tabs - Fixed height with scrollable content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Fixed Tab Header */}
            <div className="flex-shrink-0 border-b bg-white">
              <TabsList className="grid w-full grid-cols-6 m-4 mb-0">
                <TabsTrigger value="content">Main Content</TabsTrigger>
                <TabsTrigger value="social">
                  Social Posts ({selectedContent.socialPosts?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="video">
                  Video Scripts ({selectedContent.videoScripts?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="prayer">
                  Prayer Points ({selectedContent.prayerPoints?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="images">
                  Images ({selectedContent.images?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="source">Source Article</TabsTrigger>
              </TabsList>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <TabsContent value="content" className="mt-0 h-full">
                <ContentTab content={selectedContent} />
              </TabsContent>

              <TabsContent value="social" className="mt-0 h-full">
                <SocialPostsTab socialPosts={selectedContent.socialPosts || []} />
              </TabsContent>

              <TabsContent value="video" className="mt-0 h-full">
                <VideoScriptsTab videoScripts={selectedContent.videoScripts || []} />
              </TabsContent>

              <TabsContent value="prayer" className="mt-0 h-full">
                <PrayerPointsTab prayerPoints={selectedContent.prayerPoints || []} />
              </TabsContent>

              <TabsContent value="images" className="mt-0 h-full">
                <ImagesTab images={selectedContent.images || []} />
              </TabsContent>

              <TabsContent value="source" className="mt-0 h-full">
                <SourceArticleTab sourceArticle={selectedContent.sourceArticle} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Fixed Footer - Action Buttons */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          {showApprovalActions && (
            <>
              <Button 
                onClick={() => {
                  onApprove(selectedContent.gen_article_id, selectedContent.content_type);
                  onClose();
                }}
                className="flex items-center gap-2"
                disabled={isUpdating}
              >
                <Check className="w-4 h-4" />
                Approve Content
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  onReject(selectedContent.gen_article_id, selectedContent.content_type);
                  onClose();
                }}
                className="flex items-center gap-2"
                disabled={isUpdating}
              >
                <XCircle className="w-4 h-4" />
                Reject Content
              </Button>
            </>
          )}
          
          {showPublishActions && (
            <>
              <Button 
                onClick={() => {
                  onPublish('article', selectedContent.gen_article_id, 'published');
                  onClose();
                }}
                className="flex items-center gap-2"
                disabled={isUpdating}
              >
                <ExternalLink className="w-4 h-4" />
                Publish Content
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  onReturnToReview('article', selectedContent.gen_article_id, 'review_pending');
                  onClose();
                }}
                className="flex items-center gap-2"
                disabled={isUpdating}
              >
                <FileText className="w-4 h-4" />
                Return to Review
              </Button>
              <Button 
                variant="secondary"
                onClick={() => {
                  onArchive('article', selectedContent.gen_article_id, 'archived');
                  onClose();
                }}
                className="flex items-center gap-2"
                disabled={isUpdating}
              >
                {isArchiving ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                {isArchiving ? 'Archiving...' : 'Archive'}
              </Button>
            </>
          )}

          {showRejectedActions && (
            <>
              <Button 
                onClick={() => {
                  onReturnToReview(selectedContent.gen_article_id, selectedContent.content_type);
                  onClose();
                }}
                className="flex items-center gap-2"
                disabled={isUpdating}
              >
                <FileText className="w-4 h-4" />
                Return to Review
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  onRegenerate(selectedContent.sourceArticle?.article_id || selectedContent.gen_article_id);
                  onClose();
                }}
                className="flex items-center gap-2"
                disabled={isUpdating}
              >
                <FileText className="w-4 h-4" />
                Regenerate Content
              </Button>
            </>
          )}

          {showArchivedActions && (
            <>
              <Button 
                onClick={() => {
                  onReturnToApproved('article', selectedContent.gen_article_id, 'approved');
                  onClose();
                }}
                className="flex items-center gap-2"
                disabled={isUpdating}
              >
                <FileText className="w-4 h-4" />
                Return to Approved
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  onRegenerate(selectedContent.sourceArticle?.article_id || selectedContent.gen_article_id);
                  onClose();
                }}
                className="flex items-center gap-2"
                disabled={isUpdating}
              >
                <FileText className="w-4 h-4" />
                Regenerate Content
              </Button>
            </>
          )}

          <Button variant="secondary" onClick={onClose} disabled={isUpdating}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Content Tab
 */
const ContentTab = ({ content }) => (
  <div className="space-y-6 pb-4">
    {/* Main Content */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Main Content
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: content.body_draft }}
        />
      </CardContent>
    </Card>

    {/* Meta Information */}
    {(content.meta_description || content.tags) && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Meta Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.meta_description && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Meta Description</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {content.meta_description}
              </p>
            </div>
          )}
          {content.tags && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {parseKeywords(content.tags).map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )}
  </div>
);

/**
 * Social Posts Tab
 */
const SocialPostsTab = ({ socialPosts }) => (
  <div className="space-y-4 pb-4">
    {socialPosts.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Share2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No social media posts generated</p>
      </div>
    ) : (
      socialPosts.map((post, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                {post.platform ? post.platform.charAt(0).toUpperCase() + post.platform.slice(1) : `Social Post ${index + 1}`}
              </CardTitle>
              {post.emotional_hook_present_ai_check && (
                <Badge variant="secondary" className="text-xs">
                  Has Emotional Hook
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{post.text_draft || post.content || post.text}</p>
            {post.hashtags && (
              <div className="mt-3 flex flex-wrap gap-1">
                {post.hashtags.split(' ').map((hashtag, hashIndex) => (
                  <span key={hashIndex} className="text-blue-600 text-sm">
                    {hashtag}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))
    )}
  </div>
);

/**
 * Video Scripts Tab
 */
const VideoScriptsTab = ({ videoScripts }) => (
  <div className="space-y-4 pb-4">
    {videoScripts.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No video scripts generated</p>
      </div>
    ) : (
      videoScripts.map((script, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              {script.title || `Video Script ${index + 1}`}
            </CardTitle>
            {script.duration_target_seconds && (
              <CardDescription>Target Duration: {script.duration_target_seconds}s</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
              {script.script_draft || script.content || script.script}
            </pre>
          </CardContent>
        </Card>
      ))
    )}
  </div>
);

/**
 * Prayer Points Tab
 */
const PrayerPointsTab = ({ prayerPoints }) => (
  <div className="space-y-4 pb-4">
    {prayerPoints.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No prayer points generated</p>
      </div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Prayer Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {prayerPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                  {point.order || point.order_number || index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-gray-700">{point.content || point.prayer_text || point.text || (typeof point === 'string' ? point : '')}</p>
                  {point.theme && (
                    <Badge variant="outline" className="text-xs mt-2">
                      {point.theme}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

/**
 * Images Tab
 */
const ImagesTab = ({ images }) => (
  <div className="space-y-4 pb-4">
    {images.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No images generated</p>
      </div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Generated Images ({images.length})
            <Badge variant="secondary" className="text-xs ml-2">
              Sirv CDN + Pexels
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 border">
                  <img
                    src={image.sirvUrl}
                    alt={image.altText}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNHB4IiBmaWxsPSIjNjU3Mzg5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgZXJyb3I8L3RleHQ+PC9zdmc+';
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="text-white text-center p-2">
                    <div className="text-xs font-medium mb-1">#{index + 1}</div>
                    <div className="text-xs text-gray-200 line-clamp-2 mb-2">{image.altText}</div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 px-2 text-xs"
                      onClick={() => window.open(image.sirvUrl, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {image.query && (
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge variant="outline" className="text-xs bg-white/90 text-gray-700">
                      {image.query}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

/**
 * Source Article Tab
 */
const SourceArticleTab = ({ sourceArticle }) => {
  if (!sourceArticle) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No source article information available</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{sourceArticle.title}</CardTitle>
              <CardDescription className="mt-2">
                {sourceArticle.source_name} • {formatDate(sourceArticle.publication_date)}
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {(sourceArticle.relevance_score * 100).toFixed(0)}% relevance
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
            <p className="text-gray-700">{sourceArticle.summary || sourceArticle.summary_ai}</p>
          </div>

          {/* Keywords */}
          {sourceArticle.keywords && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {parseKeywords(sourceArticle.keywords).map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Original Article Link */}
          {sourceArticle.url && (
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(sourceArticle.url, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Original Article
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailModal; 