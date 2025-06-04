import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import StatusBadge from '../ui/status-badge';
import { 
  Eye, 
  Check, 
  X, 
  Edit, 
  ExternalLink,
  Calendar,
  Star,
  FileText,
  Share2,
  Video,
  Image,
  Clock,
  RotateCcw,
  ArrowLeft,
  Heart,
  Archive
} from 'lucide-react';
import { formatDate, getDaysAgo, parseKeywords, truncateText } from '../../utils/helpers';
import { useContentTypes } from '../../hooks/useContentTypes';

// Icon mapping for dynamic content types
const ICON_COMPONENTS = {
  FileText,
  Share2,
  Video,
  Heart,
  Image,
  Star,
  Clock,
  Eye,
  Check,
  X
};

/**
 * Dynamic Icon Component
 * Renders icons based on string names with fallback
 */
const DynamicIcon = ({ iconName, className = "w-3 h-3 mr-1", fallback = FileText }) => {
  const IconComponent = ICON_COMPONENTS[iconName] || fallback;
  return <IconComponent className={className} />;
};

/**
 * Reusable ContentCard component for displaying content pieces
 */
const ContentCard = ({
  content,
  index,
  onApprove,
  onReject,
  onReview,
  onPublish,
  onReturnToReview,
  onReturnToApproved,
  onArchive,
  onRegenerate,
  showApprovalActions = true,
  showPublishActions = false,
  showRejectedActions = false,
  showArchivedActions = false,
  loading = false,
  isActionLoading,
  className = ""
}) => {
  const { getContentTypeName, getContentTypeIcon } = useContentTypes();
  
  // Check specific loading states
  const isArchiving = isActionLoading && isActionLoading(`update-article-${content.gen_article_id}`);
  const isApproving = isActionLoading && isActionLoading(`approve-${content.content_type}-${content.gen_article_id}`);
  const isRejecting = isActionLoading && isActionLoading(`reject-${content.content_type}-${content.gen_article_id}`);
  const isUpdating = isArchiving || isApproving || isRejecting;
  
  const getBorderColor = () => {
    if (showRejectedActions) return 'border-l-red-500';
    if (showArchivedActions) return 'border-l-gray-500';
    if (content.status === 'approved') return 'border-l-green-500';
    return 'border-l-blue-500';
  };

  const contentTypeName = getContentTypeName(content.content_type);
  const contentTypeIcon = getContentTypeIcon(content.content_type);

  return (
    <Card className={`${getBorderColor()} border-l-4 transition-all duration-300 ease-in-out ${
      isUpdating ? 'opacity-60 pointer-events-none transform scale-98' : 'hover:shadow-md'
    } ${
      isArchiving ? 'animate-pulse' : ''
    } ${className}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {(() => {
                const faviconUrl = content.sourceArticle?.source_website ? 
                  `https://www.google.com/s2/favicons?domain=${new URL(content.sourceArticle.source_website).hostname}&sz=16` : 
                  content.sourceArticle?.url ? 
                  `https://www.google.com/s2/favicons?domain=${new URL(content.sourceArticle.url).hostname}&sz=16` : null;
                
                return faviconUrl ? (
                  <img 
                    src={faviconUrl} 
                    alt={`${content.sourceArticle?.source_name} favicon`} 
                    className="w-4 h-4 flex-shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : null;
              })()}
              <CardTitle className="text-lg">{content.title}</CardTitle>
              <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
              {showRejectedActions && (
                <Badge variant="destructive" className="text-xs">Rejected</Badge>
              )}
              {showArchivedActions && (
                <Badge variant="secondary" className="text-xs">Archived</Badge>
              )}
              {isArchiving && (
                <Badge variant="outline" className="text-xs animate-pulse">
                  Archiving...
                </Badge>
              )}
            </div>
            <CardDescription className="mt-2">
              <span className="flex items-center gap-1">
                <DynamicIcon iconName={contentTypeIcon} className="w-3 h-3" />
                {contentTypeName} • {content.word_count} words • 
                Created {formatDate(content.created_at)}
              </span>
            </CardDescription>
            
            {/* Date/Time Information */}
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created: {new Date(content.created_at).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {getDaysAgo(content.created_at)}
              </span>
            </div>
            
            {/* Source Article Information */}
            {content.sourceArticle && (
              <SourceArticleInfo sourceArticle={content.sourceArticle} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={showRejectedActions ? 'rejected' : showArchivedActions ? 'archived' : content.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Content Preview */}
        <div className="prose max-w-none mb-4">
          <div 
            className="text-sm text-gray-700 line-clamp-3"
            dangerouslySetInnerHTML={{ 
              __html: truncateText(content.body_draft, 300)
            }}
          />
        </div>
        
        {/* Associated Content */}
        <AssociatedContent content={content} />

        {/* Generated Images Gallery */}
        {content.images && content.images.length > 0 && (
          <ImageGallery images={content.images} contentId={content.gen_article_id} />
        )}

        {/* Action Buttons */}
        <ActionButtons
          content={content}
          onApprove={onApprove}
          onReject={onReject}
          onReview={onReview}
          onPublish={onPublish}
          onReturnToReview={onReturnToReview}
          onReturnToApproved={onReturnToApproved}
          onArchive={onArchive}
          onRegenerate={onRegenerate}
          showApprovalActions={showApprovalActions}
          showPublishActions={showPublishActions}
          showRejectedActions={showRejectedActions}
          showArchivedActions={showArchivedActions}
          loading={loading}
          isUpdating={isUpdating}
          isArchiving={isArchiving}
        />
      </CardContent>
    </Card>
  );
};

/**
 * Source Article Information Component
 */
const SourceArticleInfo = ({ sourceArticle }) => (
  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
    <div className="flex items-center gap-2 mb-2">
      <FileText className="w-4 h-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">Source Article</span>
      <Badge variant="outline" className="text-xs">
        <Star className="w-3 h-3 mr-1" />
        {(sourceArticle.relevance_score * 100).toFixed(0)}% relevance
      </Badge>
    </div>
    <h4 className="text-sm font-medium text-gray-900 mb-1">
      {sourceArticle.title}
    </h4>
    <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
      <span className="flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        {formatDate(sourceArticle.publication_date)}
      </span>
      <span>{sourceArticle.source_name}</span>
    </div>
    <div className="text-xs text-gray-700 line-clamp-2 mb-2">
      {sourceArticle.summary}
    </div>
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap gap-1">
        {parseKeywords(sourceArticle.keywords).slice(0, 3).map((keyword, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {keyword}
          </Badge>
        ))}
      </div>
      <Button 
        size="sm" 
        variant="ghost" 
        className="text-xs h-6 px-2"
        onClick={() => window.open(sourceArticle.url, '_blank')}
      >
        <ExternalLink className="w-3 h-3 mr-1" />
        View Original
      </Button>
    </div>
  </div>
);

/**
 * Associated Content Component - Dynamic content type support
 */
const AssociatedContent = ({ content }) => {
  const { contentTypes } = useContentTypes();
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* Dynamic content type badges based on available types */}
      {contentTypes.map(type => {
        const count = content[`${type.id}s`]?.length || 
                     content[type.id]?.length || 
                     (content[`${type.id}_count`] || 0);
        
        if (count > 0) {
          return (
            <Badge key={type.id} variant="outline">
              <DynamicIcon iconName={type.icon} />
              {count} {type.name}
            </Badge>
          );
        }
        return null;
      })}
      
      {/* Legacy support for existing content structure */}
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
      {content.prayerPoints?.length > 0 && (
        <Badge variant="outline">
          <Heart className="w-3 h-3 mr-1" />
          {content.prayerPoints.length} Prayer Points
        </Badge>
      )}
      {content.images?.length > 0 && (
        <Badge variant="outline">
          <Image className="w-3 h-3 mr-1" />
          {content.images.length} Images
        </Badge>
      )}
    </div>
  );
};

/**
 * Image Gallery Component
 */
const ImageGallery = ({ images, contentId }) => {
  // Sort images by creation date (most recent first)
  const sortedImages = [...images].sort((a, b) => {
    const dateA = new Date(a.created || a.created_at || 0);
    const dateB = new Date(b.created || b.created_at || 0);
    return dateB - dateA;
  });

  return (
  <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
    <div className="flex items-center gap-2 mb-3">
      <Image className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Generated Images ({sortedImages.length})</span>
        <Badge variant="secondary" className="text-xs">Sirv CDN + Ideogram.ai</Badge>
    </div>
      
      {/* Horizontal scrolling carousel */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sortedImages.map((image, imageIndex) => (
        <ImageThumbnail 
          key={`content-${contentId}-image-${image.id || imageIndex}`}
          image={image} 
          index={imageIndex} 
        />
      ))}
    </div>
      
    <div className="mt-2 text-xs text-gray-500">
        AI-generated images via Ideogram.ai • Optimised and served via Sirv CDN
    </div>
  </div>
);
};

/**
 * Image Thumbnail Component
 */
const ImageThumbnail = ({ image, index }) => (
  <div className="flex-shrink-0">
    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 border hover:border-blue-300 transition-colors cursor-pointer">
      <img
        src={image.sirvUrl}
        alt={image.altText}
        className="w-full h-full object-cover hover:scale-105 transition-transform"
        loading="lazy"
        onClick={() => window.open(image.sirvUrl, '_blank')}
        onError={(e) => {
          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTBweCIgZmlsbD0iIzY1NzM4OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjwhLS0gZXJyb3IgLS0+PC90ZXh0Pjwvc3ZnPg==';
        }}
      />
    </div>
  </div>
);

/**
 * Action Buttons Component
 */
const ActionButtons = ({
  content,
  onApprove,
  onReject,
  onReview,
  onPublish,
  onReturnToReview,
  onReturnToApproved,
  onArchive,
  onRegenerate,
  showApprovalActions,
  showPublishActions,
  showRejectedActions,
  showArchivedActions,
  loading,
  isUpdating,
  isArchiving
}) => (
  <div className="flex gap-2">
    <Button 
      size="sm" 
      variant="outline"
      onClick={() => onReview(content)}
      disabled={isUpdating}
    >
      <Eye className="w-4 h-4 mr-2" />
      {showPublishActions ? 'View Details' : showRejectedActions ? 'Review Content' : 'Review'}
    </Button>
    
    {showApprovalActions && (
      <>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onApprove(content.gen_article_id, content.content_type)}
          disabled={loading || isUpdating}
        >
          <Check className="w-4 h-4 mr-2" />
          Approve
        </Button>
        <Button 
          size="sm" 
          variant="destructive"
          onClick={() => onReject(content.gen_article_id, content.content_type)}
          disabled={loading || isUpdating}
          className="text-white hover:text-white"
        >
          <X className="w-4 h-4 mr-2" />
          Reject
        </Button>
        {onRegenerate && (
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => onRegenerate(content)}
            disabled={loading || isUpdating}
            className="text-gray-700 hover:text-gray-900"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
        )}
      </>
    )}
    
    {showPublishActions && (
      <>
        <Button 
          size="sm" 
          variant="default"
          onClick={() => onPublish('article', content.gen_article_id, 'published')}
          disabled={isUpdating}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Publish
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onReturnToReview('article', content.gen_article_id, 'review_pending')}
          disabled={isUpdating}
        >
          <Edit className="w-4 h-4 mr-2" />
          Return to Review
        </Button>
        <Button 
          size="sm" 
          variant="secondary"
          onClick={() => onArchive('article', content.gen_article_id, 'archived')}
          disabled={isUpdating}
        >
          {isArchiving ? (
            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Archive className="w-4 h-4 mr-2" />
          )}
          {isArchiving ? 'Archiving...' : 'Archive'}
        </Button>
      </>
    )}

    {showRejectedActions && (
      <>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onReturnToReview(content.gen_article_id, content.content_type)}
          disabled={loading || isUpdating}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Review
        </Button>
        <Button 
          size="sm" 
          variant="default"
          onClick={() => onRegenerate(content)}
          disabled={loading || isUpdating}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
      </>
    )}

    {showArchivedActions && (
      <>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onReturnToApproved('article', content.gen_article_id, 'approved')}
          disabled={loading || isUpdating}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Approved
        </Button>
        <Button 
          size="sm" 
          variant="default"
          onClick={() => onRegenerate(content)}
          disabled={loading || isUpdating}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
      </>
    )}
  </div>
);

export default ContentCard; 