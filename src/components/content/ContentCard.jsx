import React, { useState, useEffect } from 'react';
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
  Archive,
  BarChart3,
  Mail
} from 'lucide-react';
import { formatDate, getDaysAgo, parseKeywords, truncateText } from '../../utils/helpers';
import { useContentTypes } from '../../hooks/useContentTypes';
import RegenerateButton from './RegenerateButton';
import ContentQualityWarning from './ContentQualityWarning';
import { useAccountSettings } from '../../hooks/useAccountSettings';

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
  X,
  BarChart3,
  Mail
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
  onImageClick,
  onRefreshContent,
  showApprovalActions = true,
  showPublishActions = false,
  showRejectedActions = false,
  showArchivedActions = false,
  loading = false,
  isActionLoading,
  className = "",
  accountId
}) => {
  const { getContentTypeName, getContentTypeIcon } = useContentTypes();
  const { settings: accountSettings, loading: settingsLoading } = useAccountSettings(accountId);
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get UI display settings for this account
  const uiDisplaySettings = accountSettings?.contentQuality?.uiDisplay || {
    show_quality_warnings: true,
    show_content_length: true,
    show_quality_score: true,
    disable_regenerate_on_poor_quality: true
  };

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

  const getQualityColor = (score) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.3) return 'text-orange-600';
    return 'text-red-600';
  };

  const getQualityTier = (score, contentLength) => {
    const thresholds = accountSettings?.contentQuality?.thresholds || {
      excellent_content_length: 2000,
      good_content_length: 1000,
      min_content_length: 500
    };

    if (score >= 0.8 && contentLength >= thresholds.excellent_content_length) return 'Excellent';
    if (score >= 0.6 && contentLength >= thresholds.good_content_length) return 'Good';
    if (score >= 0.3 && contentLength >= thresholds.min_content_length) return 'Fair';
    return 'Poor';
  };

  const shouldShowQualityWarning = () => {
    if (!uiDisplaySettings.show_quality_warnings) return false;
    
    return content.content_quality_score < 0.5 || 
           !content.content_generation_eligible ||
           (content.content_issues && content.content_issues.includes('title_only'));
  };

  const shouldDisableRegenerate = () => {
    if (!uiDisplaySettings.disable_regenerate_on_poor_quality) return false;
    
    return !content.content_generation_eligible ||
           (content.content_issues && (
             content.content_issues.includes('title_only') ||
             content.content_issues.includes('no_content')
           ));
  };

  const contentLength = content.body_final?.length || content.body_draft?.length || 0;
  const qualityTier = content.content_quality_score ? 
    getQualityTier(content.content_quality_score, contentLength) : 'Unknown';

  return (
    <Card className={`${getBorderColor()} border-l-4 transition-all duration-500 ease-in-out ${
      isUpdating ? 'opacity-30 pointer-events-none transform scale-95 translate-x-4' : 'hover:shadow-md opacity-100 scale-100'
    } ${
      isArchiving ? 'bg-yellow-50 border-yellow-300' : ''
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
              <CardTitle className="text-lg">
                <span className="text-blue-600 font-mono mr-2">Gen#{content.gen_article_id}</span>
                <span className="text-gray-500 mr-2">from #{content.based_on_scraped_article_id || 'N/A'}</span>
                {content.title}
              </CardTitle>
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
                Generated {formatDate(content.created_at)}
              </span>
            </CardDescription>
            
            {/* Enhanced Date/Time Information */}
            <div className="mt-2 text-sm text-gray-600 flex items-center gap-4">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-4 h-4 text-blue-500" />
                Generated: {new Date(content.created_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Calendar className="w-3 h-3" />
                {getDaysAgo(content.created_at)}
              </span>
            </div>
            
            {/* Source Article Information */}
            {content.sourceArticle && (
              <SourceArticleInfo sourceArticle={content.sourceArticle} />
            )}
            
            {/* Content Quality Indicators - only show if enabled in account settings */}
            {!settingsLoading && (
              <div className="flex items-center gap-4 text-sm">
                {uiDisplaySettings.show_content_length && (
                  <span className="text-gray-600">
                    📝 {contentLength.toLocaleString()} chars
                  </span>
                )}
                
                {uiDisplaySettings.show_quality_score && content.content_quality_score !== null && (
                  <span className={`font-medium ${getQualityColor(content.content_quality_score)}`}>
                    ⭐ {(content.content_quality_score * 100).toFixed(0)}% ({qualityTier})
                  </span>
                )}
                
                {content.content_generation_eligible && (
                  <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                    ✅ Generation Ready
                  </span>
                )}
              </div>
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
            className={`text-gray-700 ${isExpanded ? '' : 'line-clamp-3'}`}
            dangerouslySetInnerHTML={{ 
              __html: truncateText(content.body_draft, 300)
            }}
          />
          
          {(content.body_final?.length > 200 || content.body_draft?.length > 200) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
        
        {/* Associated Content */}
        <AssociatedContent content={content} />

        {/* Generated Images Gallery */}
        {content.images && content.images.length > 0 && (
          <ImageGallery 
            images={content.images} 
            contentId={content.gen_article_id} 
            onImageClick={onImageClick}
            onRefreshContent={onRefreshContent}
          />
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
          accountSettings={accountSettings}
        />

        {/* Quality Warning - only show if enabled in account settings */}
        {shouldShowQualityWarning() && (
          <ContentQualityWarning 
            article={content}
            accountSettings={accountSettings}
            className="mt-4"
          />
        )}
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
      #{sourceArticle.article_id || 'N/A'} {sourceArticle.title}
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
 * Associated Content Component - Fully unified and scalable
 */
const AssociatedContent = ({ content }) => {
  // EXTENSIBLE: Use content types from API instead of hardcoded mappings
  const { contentTypes, getContentTypeIcon, getContentTypeName } = useContentTypes();
  
  // Fallback icon mapping for when content types aren't loaded yet
  const getFallbackIcon = (category) => {
    const iconMap = {
      'analysis': BarChart3,
      'blog_post': FileText,
      'social_media': Share2,
      'video_script': Video,
      'email': Mail,
      'letter': FileText,
      'prayer': Heart,
      'prayer_points': Heart,
      'image_generation': Image,
      'audio_script': Video,
      'podcast': Video,
      'devotional': Heart,
      'newsletter': Mail,
      'sermon': FileText
    };
    return iconMap[category] || FileText;
  };

  // Fallback display name for when content types aren't loaded yet
  const getFallbackName = (category) => {
    const nameMap = {
      'analysis': 'Analysis',
      'blog_post': 'Blog Post',
      'social_media': 'Social Media',
      'video_script': 'Video Script',
      'email': 'Email',
      'letter': 'Letter',
      'prayer': 'Prayer',
      'prayer_points': 'Prayer Points',
      'image_generation': 'AI Images',
      'audio_script': 'Audio Script',
      'podcast': 'Podcast',
      'devotional': 'Devotional',
      'newsletter': 'Newsletter',
      'sermon': 'Sermon'
    };
    return nameMap[category] || category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* Display all generated content from unified system - EXTENSIBLE */}
      {content.allGeneratedContent && Object.entries(content.allGeneratedContent).map(([category, items]) => {
        if (items && items.length > 0) {
          // Use extensible system first, fallback to hardcoded for backwards compatibility
          const iconName = getContentTypeIcon ? getContentTypeIcon(category) : null;
          const IconComponent = iconName ? ICON_COMPONENTS[iconName] : getFallbackIcon(category);
          const displayName = getContentTypeName ? getContentTypeName(category) : getFallbackName(category);
          
          return (
            <Badge key={category} variant="outline">
              <IconComponent className="w-3 h-3 mr-1" />
              {items.length} {displayName}
            </Badge>
          );
        }
        return null;
      })}
      
      {/* Legacy image support (from image generation system) */}
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
const ImageGallery = ({ images, contentId, onImageClick, onRefreshContent }) => {
  // Sort images by creation date (most recent first)
  const sortedImages = [...images].sort((a, b) => {
    const dateA = new Date(a.created || a.created_at || 0);
    const dateB = new Date(b.created || b.created_at || 0);
    return dateB - dateA;
  });

  const handleImageClick = (imageIndex) => {
    if (onImageClick) {
      onImageClick(sortedImages, imageIndex, contentId);
    }
  };

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
          onClick={() => handleImageClick(imageIndex)}
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
const ImageThumbnail = ({ image, index, onClick }) => (
  <div className="flex-shrink-0">
    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 border hover:border-blue-300 transition-colors cursor-pointer">
      <img
        src={image.sirvUrl}
        alt={image.altText}
        className="w-full h-full object-cover hover:scale-105 transition-transform"
        loading="lazy"
        onClick={onClick || (() => window.open(image.sirvUrl, '_blank'))}
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
  isArchiving,
  accountSettings
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
          <RegenerateButton 
            content={content}
            onRegenerate={onRegenerate}
            loading={loading}
            isUpdating={isUpdating}
            accountSettings={accountSettings}
          />
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