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
  Heart
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
  onRegenerate,
  showApprovalActions = true,
  showPublishActions = false,
  showRejectedActions = false,
  loading = false,
  className = ""
}) => {
  const { getContentTypeName, getContentTypeIcon } = useContentTypes();
  
  const getBorderColor = () => {
    if (showRejectedActions) return 'border-l-red-500';
    if (content.status === 'approved') return 'border-l-green-500';
    return 'border-l-blue-500';
  };

  const contentTypeName = getContentTypeName(content.content_type);
  const contentTypeIcon = getContentTypeIcon(content.content_type);

  return (
    <Card className={`${getBorderColor()} border-l-4 ${className}`}>
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
            </div>
            <CardDescription className="mt-2">
              <div className="flex items-center gap-1">
                <DynamicIcon iconName={contentTypeIcon} className="w-3 h-3" />
                {contentTypeName} • {content.word_count} words • 
                Created {formatDate(content.created_at)}
              </div>
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
            <StatusBadge status={showRejectedActions ? 'rejected' : content.status} />
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
          onRegenerate={onRegenerate}
          showApprovalActions={showApprovalActions}
          showPublishActions={showPublishActions}
          showRejectedActions={showRejectedActions}
          loading={loading}
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
const ImageGallery = ({ images, contentId }) => (
  <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
    <div className="flex items-center gap-2 mb-3">
      <Image className="w-4 h-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">Generated Images ({images.length})</span>
      <Badge variant="secondary" className="text-xs">Sirv CDN + Pexels</Badge>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {images.map((image, imageIndex) => (
        <ImageThumbnail 
          key={`content-${contentId}-image-${image.id || imageIndex}`}
          image={image} 
          index={imageIndex} 
        />
      ))}
    </div>
    <div className="mt-2 text-xs text-gray-500">
      Images sourced from Pexels and optimised via Sirv CDN • AI-generated alt text and search queries
    </div>
  </div>
);

/**
 * Image Thumbnail Component
 */
const ImageThumbnail = ({ image, index }) => (
  <div className="relative group">
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
    {/* Image overlay with details */}
    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
      <div className="text-white text-center p-2">
        <div className="text-xs font-medium mb-1">#{index + 1}</div>
        <div className="text-xs text-gray-200 line-clamp-2 mb-2">{image.altText}</div>
        <div className="flex gap-1">
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
    </div>
    {/* Search query badge */}
    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Badge variant="outline" className="text-xs bg-white/90 text-gray-700">
        {image.query}
      </Badge>
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
  onRegenerate,
  showApprovalActions,
  showPublishActions,
  showRejectedActions,
  loading
}) => (
  <div className="flex gap-2">
    <Button 
      size="sm" 
      variant="outline"
      onClick={() => onReview(content)}
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
          disabled={loading}
        >
          <Check className="w-4 h-4 mr-2" />
          Approve
        </Button>
        <Button 
          size="sm" 
          variant="destructive"
          onClick={() => onReject(content.gen_article_id, content.content_type)}
          disabled={loading}
        >
          <X className="w-4 h-4 mr-2" />
          Reject
        </Button>
      </>
    )}
    
    {showPublishActions && (
      <>
        <Button 
          size="sm" 
          variant="default"
          onClick={() => onPublish('article', content.gen_article_id, 'published')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Publish
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onReturnToReview('article', content.gen_article_id, 'review_pending')}
        >
          <Edit className="w-4 h-4 mr-2" />
          Return to Review
        </Button>
      </>
    )}

    {showRejectedActions && (
      <>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onReturnToReview(content.gen_article_id, content.content_type)}
          disabled={loading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Review
        </Button>
        <Button 
          size="sm" 
          variant="default"
          onClick={() => onRegenerate(content.sourceArticle?.article_id || content.gen_article_id)}
          disabled={loading}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
      </>
    )}
  </div>
);

export default ContentCard; 