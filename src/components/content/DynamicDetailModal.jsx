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
  Archive,
  Wand2,
  Plus,
  Loader2,
  Eye,
  MessageSquare,
  Film,
  Zap,
  Mail,
  Mic,
  BookOpen,
  Users
} from 'lucide-react';
import { formatDate, getDaysAgo, parseKeywords } from '../../utils/helpers';
import { useAccount } from '../../contexts/AccountContext';

/**
 * Dynamic Detail Modal Component
 * Auto-discovers content types and renders them intelligently
 */
const DynamicDetailModal = ({ 
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
  const { withAccountContext } = useAccount();
  const [activeTab, setActiveTab] = useState('content');
  const [dynamicContent, setDynamicContent] = useState({});
  const [contentTypes, setContentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Image-related state
  const [currentImages, setCurrentImages] = useState([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageMetadata, setImageMetadata] = useState([]);
  const [showArchivedImages, setShowArchivedImages] = useState(false);
  const [showCustomImageModal, setShowCustomImageModal] = useState(false);

  // Icon mapping for different content types
  const getContentTypeIcon = (category) => {
    const iconMap = {
      social_media: MessageSquare,
      social_posts: Share2,
      video_script: Video,
      video_scripts: Film,
      prayer_points: Heart,
      prayer: Heart,
      blog_post: FileText,
      article: BookOpen,
      email: Mail,
      podcast: Mic,
      newsletter: Mail,
      image_generation: Image,
      analysis: Zap,
      sermon: Users,
      devotional: BookOpen
    };
    
    return iconMap[category] || FileText;
  };

  // Image-related functions
  const fetchLatestImages = async (contentId, showArchived = false) => {
    try {
      const response = await fetch(`/api/eden/content/${contentId}/images?archived=${showArchived}`, withAccountContext());
      if (response.ok) {
        const data = await response.json();
        return data.images || [];
      }
    } catch (error) {
      console.warn('Could not load images:', error);
    }
    return [];
  };

  const handleImageClick = async (imageIndex) => {
    setSelectedImageIndex(imageIndex);
    setShowImageViewer(true);
    
    // Fetch detailed metadata for all images if not already loaded
    if (imageMetadata.length === 0 && selectedContent?.gen_article_id) {
      try {
        const response = await fetch(`/api/eden/images/generation-history`, withAccountContext());
        if (response.ok) {
          const data = await response.json();
          // Filter metadata for this specific content
          const contentMetadata = data.history.filter(item => 
            item.contentId === selectedContent.gen_article_id
          );
          setImageMetadata(contentMetadata);
        }
      } catch (error) {
        console.warn('Could not load image metadata:', error);
        setImageMetadata([]);
      }
    }
  };

  const handleImageGenerated = (newImage) => {
    console.log('📸 Handling image generation result:', newImage);
    
    // Check if this is a signal to refresh all images
    if (newImage === 'REFRESH_ALL_IMAGES') {
      console.log('🔄 Refreshing all images from database...');
      if (selectedContent?.gen_article_id) {
        fetchLatestImages(selectedContent.gen_article_id, showArchivedImages).then(latestImages => {
          setCurrentImages(latestImages);
          console.log(`✅ Refreshed images: ${latestImages.length} total images loaded`);
        });
      }
      return;
    }
    
    // Handle single image addition (original logic)
    console.log('📸 Adding new generated image:', newImage);
    
    setCurrentImages(prevImages => [
      ...prevImages,
      {
        // Map the API response structure to the expected UI structure
        sirvUrl: newImage.url || newImage.sirvUrl || '', // API returns 'url', UI expects 'sirvUrl'
        altText: newImage.altText || newImage.alt_text || 'AI Generated Image',
        source: 'ideogram', // Mark as AI-generated
        query: 'AI Generated', // For the badge display
        // Include metadata for future reference
        id: newImage.id || `temp_${Date.now()}`,
        metadata: newImage.metadata || {},
        created: new Date().toISOString()
      }
    ]);
  };

  const handleImageStatusUpdate = async (imageId, newStatus) => {
    try {
      const response = await fetch(`/api/eden/images/${imageId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        ...withAccountContext()
      });

      if (response.ok) {
        // Refresh images to reflect status change
        if (selectedContent?.gen_article_id) {
          const latestImages = await fetchLatestImages(selectedContent.gen_article_id, showArchivedImages);
          setCurrentImages(latestImages);
        }
      }
    } catch (error) {
      console.error('Failed to update image status:', error);
    }
  };

  // Load images when modal opens or archived filter changes
  useEffect(() => {
    if (showModal && selectedContent?.gen_article_id) {
      fetchLatestImages(selectedContent.gen_article_id, showArchivedImages).then(setCurrentImages);
    }
  }, [showModal, selectedContent, showArchivedImages]);

  // Refresh images when switching to Images tab
  useEffect(() => {
    if (activeTab === 'image_generation' && selectedContent?.gen_article_id && currentImages.length === 0) {
      fetchLatestImages(selectedContent.gen_article_id, showArchivedImages).then(setCurrentImages);
    }
  }, [activeTab]);

  // Fetch dynamic content from the generic content system
  const fetchDynamicContent = async (storyId) => {
    try {
      setLoading(true);
      
      // Fetch all content types for this story
      const response = await fetch(`/api/eden/content/story/${storyId}/all`, withAccountContext());
      
      if (response.ok) {
        const data = await response.json();
        
        // Create tabs for ALL configured categories, not just ones with content
        const grouped = {};
        const types = [];
        
        // First, create tabs for all configured categories
        if (data.categories && data.categories.length > 0) {
          data.categories.forEach(category => {
            // Skip blog_post as it's handled separately as "Main Content"
            if (category !== 'blog_post') {
              grouped[category] = [];
              types.push({
                key: category,
                name: formatCategoryName(category),
                icon: getContentTypeIcon(category),
                count: 0
              });
            }
          });
        }
        
        // Then populate content for categories that have items
        data.content.forEach(item => {
          const category = item.prompt_category;
          if (grouped[category]) {
            grouped[category].push(item);
          } else {
            // Handle legacy categories that might not be in the configured list
            grouped[category] = [item];
            if (!types.find(t => t.key === category)) {
              types.push({
                key: category,
                name: formatCategoryName(category),
                icon: getContentTypeIcon(category),
                count: 0
              });
            }
          }
        });
        
        // Update counts
        types.forEach(type => {
          type.count = grouped[type.key]?.length || 0;
        });
        
        // Sort types by a logical order
        const sortOrder = {
          'analysis': 1,
          'social_media': 2,
          'video_script': 3,
          'prayer': 4,
          'email': 5,
          'image_generation': 6
        };
        
        types.sort((a, b) => {
          const orderA = sortOrder[a.key] || 999;
          const orderB = sortOrder[b.key] || 999;
          return orderA - orderB;
        });
        
        setDynamicContent(grouped);
        setContentTypes(types);
        
        // Set first available tab as active (or the first one with content)
        const firstWithContent = types.find(t => t.count > 0);
        if (firstWithContent) {
          setActiveTab(firstWithContent.key);
        } else if (types.length > 0) {
          setActiveTab(types[0].key);
        }
        
      } else {
        console.error('Failed to fetch dynamic content');
        // Fallback to legacy structure
        setDynamicContent({});
        setContentTypes([]);
      }
    } catch (error) {
      console.error('Error fetching dynamic content:', error);
      setDynamicContent({});
      setContentTypes([]);
    } finally {
      setLoading(false);
    }
  };

  // Load dynamic content when modal opens
  useEffect(() => {
    if (showModal && selectedContent?.gen_article_id) {
      fetchDynamicContent(selectedContent.gen_article_id);
    }
  }, [showModal, selectedContent]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!showModal || !selectedContent) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = originalOverflow || 'unset';
    };
  }, [showModal, selectedContent, onClose]);

  if (!showModal || !selectedContent) return null;

  const isArchiving = isActionLoading && isActionLoading(`update-article-${selectedContent.gen_article_id}`);
  const isUpdating = isArchiving;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-[95vw] w-full h-[90vh] overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 flex-shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Dynamic Content</span>
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

        {/* Main Content Area with Sidebar Navigation */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-gray-600">Loading content...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Left Sidebar Navigation */}
              <div className="w-64 bg-gray-50 border-r overflow-y-auto flex-shrink-0">
                <div className="p-4 space-y-2">
                  {/* Main Content Tab */}
                  <button
                    onClick={() => setActiveTab('content')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      activeTab === 'content' 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Main Content</span>
                  </button>
                  
                  {/* Dynamic Content Type Tabs */}
                  {contentTypes.map(type => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.key}
                        onClick={() => setActiveTab(type.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                          activeTab === type.key 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <IconComponent className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{type.name}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {type.count}
                        </Badge>
                      </button>
                    );
                  })}
                  
                  {/* Source Article Tab */}
                  <button
                    onClick={() => setActiveTab('source')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      activeTab === 'source' 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Source Article</span>
                  </button>
                </div>
              </div>

              {/* Right Content Area */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {/* Main Content Tab */}
                {activeTab === 'content' && (
                  <MainContentTab content={selectedContent} />
                )}

                {/* Dynamic Content Tabs */}
                {contentTypes.map(type => 
                  activeTab === type.key && (
                    type.key === 'image_generation' ? (
                      <ImagesTab 
                        key={type.key}
                        images={currentImages} 
                        contentId={selectedContent.gen_article_id} 
                        onImageGenerated={handleImageGenerated}
                        onImageClick={handleImageClick}
                        onUpdateImageStatus={handleImageStatusUpdate}
                        showArchived={showArchivedImages}
                        setShowArchived={setShowArchivedImages}
                        onOpenCustomImageModal={() => setShowCustomImageModal(true)}
                      />
                    ) : (
                      <DynamicContentTab 
                        key={type.key}
                        contentType={type}
                        content={dynamicContent[type.key] || []}
                      />
                    )
                  )
                )}



                {/* Source Article Tab */}
                {activeTab === 'source' && (
                  <SourceArticleTab sourceArticle={selectedContent.sourceArticle} />
                )}
              </div>
            </>
          )}
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
                  onRegenerate(selectedContent);
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
                  onRegenerate(selectedContent);
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

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <ImageViewerModal
          images={currentImages}
          selectedIndex={selectedImageIndex}
          metadata={imageMetadata}
          onClose={() => setShowImageViewer(false)}
          onIndexChange={setSelectedImageIndex}
        />
      )}

      {/* Custom Image Generation Modal */}
      {showCustomImageModal && (
        <CustomImageGenerationModal
          isOpen={showCustomImageModal}
          onClose={() => setShowCustomImageModal(false)}
          contentId={selectedContent.gen_article_id}
          contentData={selectedContent}
          onImageGenerated={handleImageGenerated}
        />
      )}
    </div>
  );
};

/**
 * Main Content Tab
 */
const MainContentTab = ({ content }) => (
  <div className="space-y-6 pb-4">
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
  </div>
);

/**
 * Dynamic Content Tab - Intelligently renders any content type
 */
const DynamicContentTab = ({ contentType, content }) => {
  const IconComponent = contentType.icon;

  if (content.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <IconComponent className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No {contentType.name.toLowerCase()} generated</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {content.map((item, index) => (
        <DynamicContentRenderer 
          key={item.content_id || index}
          contentItem={item}
          contentType={contentType}
          index={index}
        />
      ))}
    </div>
  );
};

/**
 * Dynamic Content Renderer - Handles different content structures
 */
const DynamicContentRenderer = ({ contentItem, contentType, index }) => {
  const IconComponent = contentType.icon;
  
  try {
    // Parse content_data (it should already be parsed as JSON)
    const contentData = typeof contentItem.content_data === 'string' 
      ? JSON.parse(contentItem.content_data) 
      : contentItem.content_data;

    // Render based on content type
    switch (contentType.key) {
      case 'social_media':
      case 'social_posts':
        return <SocialMediaRenderer data={contentData} icon={IconComponent} />;
      
      case 'video_script':
      case 'video_scripts':
        return <VideoScriptRenderer data={contentData} icon={IconComponent} index={index} />;
      
      case 'prayer_points':
      case 'prayer':
        return <PrayerPointsRenderer data={contentData} icon={IconComponent} />;
      
      default:
        return <GenericContentRenderer data={contentData} contentType={contentType} index={index} />;
    }
  } catch (error) {
    console.error('Error rendering content:', error);
    return <ErrorContentRenderer contentItem={contentItem} contentType={contentType} />;
  }
};

/**
 * Social Media Content Renderer
 */
const SocialMediaRenderer = ({ data, icon: IconComponent }) => {
  // Handle both single posts and platform-specific posts
  if (Array.isArray(data)) {
    // Array of individual posts
    return (
      <div className="space-y-4">
        {data.map((post, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconComponent className="w-5 h-5" />
                {post.platform ? `${post.platform.charAt(0).toUpperCase() + post.platform.slice(1)} Post` : `Social Post ${index + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-800 mb-3">{post.text || post.content}</p>
                {post.hashtags && (
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } else if (data.facebook || data.instagram || data.linkedin) {
    // Platform-specific structure
    const platforms = ['facebook', 'instagram', 'linkedin'];
    return (
      <div className="space-y-4">
        {platforms.filter(platform => data[platform]).map(platform => (
          <Card key={platform}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconComponent className="w-5 h-5" />
                {platform.charAt(0).toUpperCase() + platform.slice(1)} Post
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-800 mb-3">{data[platform].text}</p>
                {data[platform].hashtags && (
                  <div className="flex flex-wrap gap-2">
                    {data[platform].hashtags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } else {
    // Fallback for unknown structure
    return <GenericContentRenderer data={data} contentType={{ icon: IconComponent, name: 'Social Media' }} />;
  }
};

/**
 * Video Script Content Renderer
 */
const VideoScriptRenderer = ({ data, icon: IconComponent, index }) => {
  if (Array.isArray(data)) {
    return (
      <div className="space-y-4">
        {data.map((script, scriptIndex) => (
          <Card key={scriptIndex}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconComponent className="w-5 h-5" />
                {script.title || `Video Script ${scriptIndex + 1}`}
              </CardTitle>
              {script.duration_target_seconds && (
                <CardDescription>Target Duration: {script.duration_target_seconds}s</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                {script.script || script.content || script.text}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } else {
    // Single script object
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconComponent className="w-5 h-5" />
            {data.title || `Video Script ${index + 1}`}
          </CardTitle>
          {data.duration_target_seconds && (
            <CardDescription>Target Duration: {data.duration_target_seconds}s</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
            {data.script || data.content || data.text}
          </pre>
        </CardContent>
      </Card>
    );
  }
};

/**
 * Prayer Points Content Renderer
 */
const PrayerPointsRenderer = ({ data, icon: IconComponent }) => {
  const prayerPoints = Array.isArray(data) ? data : [data];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconComponent className="w-5 h-5" />
          Prayer Points
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {prayerPoints.map((point, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                {point.order_number || point.order || index + 1}
              </span>
              <div className="flex-1">
                <p className="text-gray-700">
                  {point.prayer_text || point.content || point.text || (typeof point === 'string' ? point : '')}
                </p>
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
  );
};

/**
 * Generic Content Renderer - Handles unknown content types
 */
const GenericContentRenderer = ({ data, contentType, index = 0 }) => {
  const IconComponent = contentType.icon;
  
  // Handle different data structures
  if (Array.isArray(data)) {
    return (
      <div className="space-y-4">
        {data.map((item, itemIndex) => (
          <Card key={itemIndex}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconComponent className="w-5 h-5" />
                {contentType.name} {itemIndex + 1}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {typeof item === 'string' ? (
                  <p>{item}</p>
                ) : (
                  <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } else if (typeof data === 'object' && data !== null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconComponent className="w-5 h-5" />
            {contentType.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            {data.text || data.content ? (
              <p>{data.text || data.content}</p>
            ) : (
              <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>
    );
  } else {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconComponent className="w-5 h-5" />
            {contentType.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{String(data)}</p>
        </CardContent>
      </Card>
    );
  }
};

/**
 * Error Content Renderer - Fallback for rendering errors
 */
const ErrorContentRenderer = ({ contentItem, contentType }) => {
  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <XCircle className="w-5 h-5" />
          Error Rendering {contentType.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600">
          <p className="mb-2">Could not render content. Raw data:</p>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
            {JSON.stringify(contentItem, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Images Tab Component - Full AI image generation and management
 */
const ImagesTab = ({ images, contentId, onImageGenerated, onImageClick, onUpdateImageStatus, showArchived, setShowArchived, onOpenCustomImageModal }) => (
  <div className="space-y-4 pb-4">
    {/* Custom Image Generation Button */}
    <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg text-center bg-purple-50">
      <div className="flex flex-col items-center gap-3">
        <Wand2 className="w-8 h-8 text-purple-600" />
        <h3 className="text-sm font-medium text-purple-900">Generate Custom AI Image</h3>
        <p className="text-xs text-purple-700 mb-2">
          Use Ideogram.ai to create custom images with advanced controls
        </p>
        <Button 
          onClick={onOpenCustomImageModal}
          variant="default"
          size="sm"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          Create Custom Image
        </Button>
      </div>
    </div>

    {/* Filter for Archived Images */}
    <div className="flex justify-end items-center mb-4">
      <label htmlFor="showArchivedToggle" className="mr-2 text-sm text-gray-600">Show Archived Images:</label>
      <input 
        type="checkbox" 
        id="showArchivedToggle"
        checked={showArchived}
        onChange={(e) => setShowArchived(e.target.checked)}
        className="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out rounded"
      />
    </div>

    {/* Existing Images */}
    {images.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No images generated yet</p>
        <p className="text-sm mt-2">Use the custom image generator above to create your first image</p>
      </div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Generated Images ({images.length})
            <Badge variant="outline" className="text-xs font-mono">
              Sirv CDN + Ideogram.ai
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={image.id || index} className="relative group cursor-pointer" onClick={() => onImageClick && onImageClick(index)}>
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 border hover:border-blue-300 transition-colors">
                  <img
                    src={image.sirvUrl}
                    alt={image.altText}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNHB4IiBmaWxsPSIjNjU3Mzg5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgZXJyb3I8L3RleHQ+PC9zdmc+';
                    }}
                  />
                  {image.status === 'archived' && (
                    <div className="absolute inset-0 bg-gray-700 bg-opacity-60 flex items-center justify-center">
                      <Badge variant="destructive" className="text-xs bg-gray-800 text-white opacity-90">
                        <Archive className="w-3 h-3 mr-1" /> Archived
                      </Badge>
                    </div>
                  )}
                </div>
                
                {/* Image Actions Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 rounded-lg flex items-end justify-end p-2">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                    {image.status !== 'archived' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateImageStatus(image.id, 'archived');
                        }}
                        className="h-8 px-2 text-xs bg-white/90 hover:bg-white"
                      >
                        <Archive className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateImageStatus(image.id, 'active');
                        }}
                        className="h-8 px-2 text-xs bg-white/90 hover:bg-white"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Image metadata */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {image.source || 'AI Generated'}
                    </Badge>
                    {image.query && (
                      <Badge variant="secondary" className="text-xs max-w-24 truncate">
                        {image.query}
                      </Badge>
                    )}
                  </div>
                  {image.created && (
                    <div className="text-xs text-gray-500">
                      {formatDate(image.created)}
                    </div>
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
 * Image Viewer Modal Component
 */
const ImageViewerModal = ({ images, selectedIndex, metadata, onClose, onIndexChange }) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  
  useEffect(() => {
    setCurrentIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
        const newIndex = currentIndex - 1;
        setCurrentIndex(newIndex);
        onIndexChange(newIndex);
      } else if (event.key === 'ArrowRight' && currentIndex < images.length - 1) {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        onIndexChange(newIndex);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose, onIndexChange]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const currentMetadata = metadata.find(m => m.id === currentImage?.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black bg-opacity-50">
          <div className="text-white">
            <h3 className="text-lg font-semibold">{currentImage?.altText || 'AI Generated Image'}</h3>
            <p className="text-sm text-gray-300">
              Image {currentIndex + 1} of {images.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Image */}
        <div className="flex-1 flex items-center justify-center p-4">
          <img
            src={currentImage?.sirvUrl}
            alt={currentImage?.altText}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => {
                if (currentIndex > 0) {
                  const newIndex = currentIndex - 1;
                  setCurrentIndex(newIndex);
                  onIndexChange(newIndex);
                }
              }}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full disabled:opacity-30 hover:bg-opacity-70 transition-all"
            >
              ←
            </button>
            <button
              onClick={() => {
                if (currentIndex < images.length - 1) {
                  const newIndex = currentIndex + 1;
                  setCurrentIndex(newIndex);
                  onIndexChange(newIndex);
                }
              }}
              disabled={currentIndex === images.length - 1}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full disabled:opacity-30 hover:bg-opacity-70 transition-all"
            >
              →
            </button>
          </>
        )}

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="bg-black bg-opacity-50 p-4">
            <div className="flex gap-2 justify-center overflow-x-auto max-w-full">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    onIndexChange(index);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-blue-400 opacity-100' 
                      : 'border-transparent opacity-60 hover:opacity-80'
                  }`}
                >
                  <img
                    src={image.sirvUrl}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Advanced Custom Image Generation Modal - Full-featured Ideogram.ai integration
 */
const CustomImageGenerationModal = ({ isOpen, onClose, contentId, contentData, onImageGenerated }) => {
  const { withAccountContext } = useAccount();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    prompt: '',
    seed: '',
    resolution: '',
    aspectRatio: '16:9',
    renderingSpeed: 'DEFAULT',
    magicPrompt: 'AUTO',
    negativePrompt: '',
    numImages: 1,
    styleType: 'GENERAL',
    styleCodes: '',
    referenceImages: [], // v3 Reference Style feature - up to 3 images
    selectedColorTemplate: '',
    modelVersion: 'v2' // Default to v2 to get ANIME and 3D styles
  });
  const [options, setOptions] = useState(null);
  const [accountSettings, setAccountSettings] = useState(null);
  
  // Reference images management
  const [existingImages, setExistingImages] = useState([]);
  const [loadingExistingImages, setLoadingExistingImages] = useState(false);
  const [referenceImageMode, setReferenceImageMode] = useState('upload'); // 'upload' or 'existing'

  // Load Ideogram options and account settings when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (!isOpen) return;
      
      try {
        let optionsData;
        // Load Ideogram options with current model version
        const optionsResponse = await fetch(`/api/eden/images/ideogram/options?modelVersion=${formData.modelVersion}`);
        if (optionsResponse.ok) {
          optionsData = await optionsResponse.json(); 
          setOptions(optionsData.options);
        }

        // Load account image generation settings (only on initial load, not when model version changes)
        if (!accountSettings) {
          const settingsResponse = await fetch('/api/eden/settings/image-generation', withAccountContext());
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json();
            setAccountSettings(settingsData.settings);
            
            // Apply account defaults to form (only on initial load)
            if (settingsData.settings?.defaults) {
              const defaults = settingsData.settings.defaults;
              
              // Validate style type against allowed Ideogram styles for current model
              const validStyleTypes = optionsData?.options?.styles?.map(s => s.value) || ['AUTO', 'GENERAL', 'REALISTIC', 'DESIGN'];
              const validatedStyleType = validStyleTypes.includes(defaults.styleType) 
                ? defaults.styleType 
                : 'GENERAL';
              
              setFormData(prev => ({
                ...prev,
                modelVersion: defaults.modelVersion || prev.modelVersion,
                aspectRatio: defaults.aspectRatio || prev.aspectRatio,
                resolution: defaults.resolution || prev.resolution,
                renderingSpeed: defaults.renderingSpeed || prev.renderingSpeed,
                magicPrompt: defaults.magicPrompt || prev.magicPrompt,
                styleType: validatedStyleType,
                negativePrompt: defaults.negativePrompt || prev.negativePrompt,
                numImages: defaults.numImages || prev.numImages
              }));
            }
            
            // Load last selected color template from localStorage
            const lastSelectedTemplate = localStorage.getItem('ideogram-last-color-template') || '';
            if (lastSelectedTemplate && settingsData.settings?.brandColors?.some(color => color.name === lastSelectedTemplate)) {
              setFormData(prev => ({
                ...prev,
                selectedColorTemplate: lastSelectedTemplate
              }));
            }
          }
        }
      } catch (error) {
        console.error('Failed to load generation data:', error);
      }
    };

    // Only load data when modal opens and we don't have options yet
    if (isOpen && !options) {
      loadData();
    }
  }, [isOpen]); // Remove dependencies to prevent infinite loop

  // Separate effect to reload options when model version changes (without applying defaults again)
  useEffect(() => {
    const reloadOptions = async () => {
      if (!isOpen || !accountSettings) return;
      
      try {
        const optionsResponse = await fetch(`/api/eden/images/ideogram/options?modelVersion=${formData.modelVersion}`);
        if (optionsResponse.ok) {
          const optionsData = await optionsResponse.json(); 
          setOptions(optionsData.options);
        }
      } catch (error) {
        console.error('Failed to reload options:', error);
      }
    };

    if (isOpen && accountSettings && options && options.modelVersion !== formData.modelVersion) {
      reloadOptions();
    }
  }, [isOpen, formData.modelVersion, accountSettings, options]);

  // Handle escape key
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setOptions(null);
      setAccountSettings(null);
      setExistingImages([]);
      setLoadingExistingImages(false);
      setReferenceImageMode('upload');
      setFormData({
        prompt: '',
        seed: '',
        resolution: '',
        aspectRatio: '16:9',
        renderingSpeed: 'DEFAULT',
        magicPrompt: 'AUTO',
        negativePrompt: '',
        numImages: 1,
        styleType: 'GENERAL',
        styleCodes: '',
        referenceImages: [],
        selectedColorTemplate: '',
        modelVersion: 'v2'
      });
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Prepare generation payload
      const payload = {
        prompt: formData.prompt.trim(),
        aspectRatio: formData.aspectRatio,
        renderingSpeed: formData.renderingSpeed,
        magicPrompt: formData.magicPrompt,
        styleType: formData.styleType,
        numImages: parseInt(formData.numImages),
        modelVersion: formData.modelVersion
      };

      // Add optional parameters if provided
      if (formData.seed) payload.seed = parseInt(formData.seed);
      if (formData.resolution) payload.resolution = formData.resolution;
      if (formData.negativePrompt.trim()) payload.negativePrompt = formData.negativePrompt.trim();
      if (formData.styleCodes.trim()) payload.styleCodes = formData.styleCodes.trim().split(',').map(s => s.trim());
      
      // v3 Reference Style feature
      if (formData.modelVersion === 'v3' && formData.referenceImages.length > 0) {
        payload.referenceImages = formData.referenceImages;
      }
      
      // Handle selected color template
      if (formData.selectedColorTemplate && accountSettings?.brandColors?.length > 0) {
        const selectedTemplate = accountSettings.brandColors.find(template => template.name === formData.selectedColorTemplate);
        if (selectedTemplate) {
          payload.useAccountColors = true;
          payload.selectedColorTemplate = selectedTemplate;
          localStorage.setItem('ideogram-last-color-template', formData.selectedColorTemplate);
        }
      }

      // Apply account prompt prefix/suffix if available
      if (accountSettings?.promptPrefix || accountSettings?.promptSuffix) {
        const prefix = accountSettings.promptPrefix || '';
        const suffix = accountSettings.promptSuffix || '';
        payload.prompt = `${prefix} ${payload.prompt} ${suffix}`.trim();
      }

      // Handle v3 reference images with multipart form data
      let requestConfig;
      if (formData.modelVersion === 'v3' && formData.referenceImages.length > 0) {
        // Use FormData for v3 with reference images
        const formDataPayload = new FormData();
        
        // Add all payload fields as form data
        Object.keys(payload).forEach(key => {
          if (key === 'referenceImages') {
            // Add reference image files
            payload.referenceImages.forEach((image, index) => {
              if (image.file) {
                formDataPayload.append(`referenceImage_${index}`, image.file);
              }
            });
          } else if (Array.isArray(payload[key])) {
            // Handle arrays (like styleCodes)
            formDataPayload.append(key, JSON.stringify(payload[key]));
          } else if (typeof payload[key] === 'object') {
            // Handle objects (like selectedColorTemplate)
            formDataPayload.append(key, JSON.stringify(payload[key]));
          } else {
            formDataPayload.append(key, payload[key]);
          }
        });
        
        requestConfig = withAccountContext({
          method: 'POST',
          body: formDataPayload
          // Don't set Content-Type header - let browser set it with boundary
        });
      } else {
        // Use JSON for all other cases
        requestConfig = withAccountContext({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
      }

      const response = await fetch(`/api/eden/images/generate-for-content/${contentId}`, requestConfig);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Ideogram image generated:', result);
        
        // Show detailed generation information to user
        const generationInfo = result.generation;
        let alertMessage = `✅ Image generated successfully!\n\n`;
        
        alertMessage += `📝 Final Prompt:\n"${generationInfo.finalPrompt?.substring(0, 150)}..."\n\n`;
        
        alertMessage += `📊 Generation Details:\n`;
        alertMessage += `• Style: ${generationInfo.parameters.styleType}\n`;
        alertMessage += `• Aspect Ratio: ${generationInfo.parameters.aspectRatio}\n`;
        alertMessage += `• Rendering Speed: ${generationInfo.parameters.renderingSpeed}\n`;
        alertMessage += `• Magic Prompt: ${generationInfo.parameters.magicPrompt}\n`;
        alertMessage += `• Resolution: ${generationInfo.metadata.resolution}\n`;
        alertMessage += `• Generation Time: ${generationInfo.metadata.generationTimeSeconds?.toFixed(1)}s\n`;
        alertMessage += `• Estimated Cost: $${generationInfo.metadata.estimatedCostUSD?.toFixed(3)} USD\n`;
        alertMessage += `• Safe Content: ${generationInfo.metadata.isImageSafe ? 'Yes' : 'No'}`;
        
        if (generationInfo.metadata.seed) {
          alertMessage += `\n• Seed: ${generationInfo.metadata.seed}`;
        }
        
        alert(alertMessage);
        
        // For multiple images, trigger a full refresh instead of using the callback
        if (result.images && result.images.length > 1) {
          console.log(`🖼️ Multiple images generated (${result.images.length}), triggering refresh...`);
          if (onImageGenerated) {
            onImageGenerated('REFRESH_ALL_IMAGES');
          }
        } else {
          // Single image - use the callback
          if (onImageGenerated) {
            onImageGenerated(result.image);
          }
        }

        // Reset form and close modal
        setFormData({
          prompt: '',
          seed: '',
          resolution: accountSettings?.defaults?.resolution || '',
          aspectRatio: accountSettings?.defaults?.aspectRatio || '16:9',
          renderingSpeed: accountSettings?.defaults?.renderingSpeed || 'DEFAULT',
          magicPrompt: accountSettings?.defaults?.magicPrompt || 'AUTO',
          negativePrompt: accountSettings?.defaults?.negativePrompt || '',
          numImages: accountSettings?.defaults?.numImages || 1,
          styleType: (() => {
            const validStyleTypes = ['AUTO', 'GENERAL', 'REALISTIC', 'DESIGN', 'CUSTOM'];
            const defaultStyle = accountSettings?.defaults?.styleType || 'GENERAL';
            return validStyleTypes.includes(defaultStyle) ? defaultStyle : 'GENERAL';
          })(),
          styleCodes: '',
          referenceImages: [], // Reset reference images
          selectedColorTemplate: '',
          modelVersion: accountSettings?.defaults?.modelVersion || 'v2'
        });
        
        onClose();
      } else {
        const error = await response.json();
        console.error('❌ Ideogram generation failed:', error);
        alert(`Image generation failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Ideogram generation error:', error);
      alert('Image generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      // Clean up old reference image URLs to prevent memory leaks
      if (field === 'referenceImages' && prev.referenceImages) {
        prev.referenceImages.forEach(image => {
          if (image.url && image.url.startsWith('blob:')) {
            URL.revokeObjectURL(image.url);
          }
        });
      }
      
      return {
        ...prev,
        [field]: value
      };
    });
    
    // Save color template selection to localStorage
    if (field === 'selectedColorTemplate') {
      if (value) {
        localStorage.setItem('ideogram-last-color-template', value);
      } else {
        localStorage.removeItem('ideogram-last-color-template');
      }
    }
  };

  const copyToPrompt = (text) => {
    setFormData(prev => ({
      ...prev,
      prompt: prev.prompt ? `${prev.prompt} ${text}` : text
    }));
  };

  // Load existing images from account
  const loadExistingImages = async () => {
    if (loadingExistingImages || existingImages.length > 0) return;
    
    setLoadingExistingImages(true);
    try {
      const response = await fetch('/api/eden/images/generation-history', withAccountContext());
      if (response.ok) {
        const data = await response.json();
        // Filter and format images for reference selection
        const validImages = data.history
          .filter(item => item.result?.imageUrl && item.result?.status !== 'archived')
          .slice(0, 50) // Limit to recent 50 images for performance
          .map(item => ({
            id: item.id,
            url: item.result.imageUrl,
            altText: item.result.imageAltText || 'Generated Image',
            prompt: item.parameters?.prompt || '',
            created: item.createdAt,
            type: 'existing'
          }));
        setExistingImages(validImages);
      }
    } catch (error) {
      console.error('Failed to load existing images:', error);
    } finally {
      setLoadingExistingImages(false);
    }
  };

  // Handle selecting an existing image as reference
  const selectExistingImage = (image) => {
    if (formData.referenceImages.length >= 3) return;
    
    const newReferenceImage = {
      id: image.id,
      url: image.url,
      altText: image.altText,
      type: 'existing'
    };
    
    const newImages = [...formData.referenceImages, newReferenceImage];
    handleInputChange('referenceImages', newImages);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-6xl w-full h-[90vh] overflow-hidden flex">
        {/* Left Panel - Article Reference */}
        <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Article Reference</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Article Summary */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">{contentData?.title}</h4>
              <p className="text-sm text-gray-600 mb-3">
                {getDaysAgo(contentData?.created_at)} • {contentData?.word_count} words
              </p>
            </div>
            
            {/* Article excerpt for prompt inspiration */}
            {contentData?.body_draft && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Content Preview</h5>
                <div className="bg-white p-3 rounded border text-xs leading-relaxed max-h-32 overflow-y-auto">
                  {contentData.body_draft.replace(/<[^>]*>/g, '').substring(0, 300)}...
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs"
                  onClick={() => copyToPrompt(contentData.title)}
                >
                  📝 Copy Title to Prompt
                </Button>
              </div>
            )}
            
            {/* Keywords for prompt ideas */}
            {contentData?.tags && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Keywords</h5>
                <div className="flex flex-wrap gap-1">
                  {parseKeywords(contentData.tags).slice(0, 6).map((tag, index) => (
                    <button
                      key={index}
                      onClick={() => copyToPrompt(tag)}
                      className="inline-block px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors cursor-pointer"
                      title="Click to add to prompt"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Source article info */}
            {contentData?.sourceArticle && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Source Context</h5>
                <div className="bg-white p-3 rounded border text-xs">
                  <p className="font-medium">{contentData.sourceArticle.source_name}</p>
                  <p className="text-gray-600 mt-1">
                    {contentData.sourceArticle.summary?.substring(0, 150)}...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Image Generation Form */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b bg-white">
            <div className="flex items-center gap-3">
              <Wand2 className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Create Custom AI Image</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Generate custom images with Ideogram.ai using advanced controls
            </p>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Model Version Selection */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  🎨 Ideogram Model Version
                </label>
                <select
                  value={formData.modelVersion}
                  onChange={(e) => {
                    handleInputChange('modelVersion', e.target.value);
                    setOptions(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="v3">Version 3.0 (Latest, Best Quality) - 4 styles</option>
                  <option value="v2">Version 2.0/2a (ANIME + 3D) - 6 styles</option>
                  <option value="v1">Version 1.0 (Most Styles) - 20+ styles</option>
                </select>
                <p className="text-xs text-purple-700 mt-1">
                  {formData.modelVersion === 'v3' && 'Latest model with highest quality. Limited to 4 core styles.'}
                  {formData.modelVersion === 'v2' && 'Includes ANIME and 3D styles you remember! Good balance of quality and options.'}
                  {formData.modelVersion === 'v1' && 'Widest style selection including Cinematic, Dark Fantasy, Graffiti, and more.'}
                </p>
              </div>

              {/* Main Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Prompt *
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => handleInputChange('prompt', e.target.value)}
                  placeholder="Describe the image you want to generate..."
                  className="w-full px-3 py-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {accountSettings?.promptPrefix && (
                    <span className="text-green-600">Prefix: "{accountSettings.promptPrefix}" will be added. </span>
                  )}
                  {accountSettings?.promptSuffix && (
                    <span className="text-green-600">Suffix: "{accountSettings.promptSuffix}" will be added.</span>
                  )}
                </p>
              </div>

              {/* Account Brand Colors */}
              {accountSettings?.brandColors?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Color Template
                  </label>
                  <select
                    value={formData.selectedColorTemplate}
                    onChange={(e) => handleInputChange('selectedColorTemplate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">None - Use default colors</option>
                    {accountSettings.brandColors.map((colorSet, index) => (
                      <option key={index} value={colorSet.name}>
                        {colorSet.name} ({colorSet.colors.length} color{colorSet.colors.length !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                  {formData.selectedColorTemplate && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-600 mb-1">Selected template colors:</div>
                      <div className="flex flex-wrap gap-2">
                        {accountSettings.brandColors
                          .filter(colorSet => colorSet.name === formData.selectedColorTemplate)
                          .map((colorSet, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 px-2 py-1 bg-white rounded border">
                              <span className="text-xs font-medium">{colorSet.name}:</span>
                              {colorSet.colors.map((color, colorIndex) => (
                                <div
                                  key={colorIndex}
                                  className="w-4 h-4 rounded border border-gray-300"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Options Grid */}
              {options && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio</label>
                    <select
                      value={formData.aspectRatio}
                      onChange={(e) => handleInputChange('aspectRatio', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={!!formData.resolution}
                    >
                      {options.aspectRatios.map(ratio => (
                        <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Resolution */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specific Resolution</label>
                    <select
                      value={formData.resolution}
                      onChange={(e) => handleInputChange('resolution', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Use Aspect Ratio</option>
                      {options.resolutions && options.resolutions.map(res => (
                        <option key={res.value} value={res.value}>{res.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Style Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Style Type</label>
                    <select
                      value={formData.styleType}
                      onChange={(e) => handleInputChange('styleType', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {options.styles.map(style => (
                        <option key={style.value} value={style.value}>{style.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Number of Images */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Images</label>
                    <select
                      value={formData.numImages}
                      onChange={(e) => handleInputChange('numImages', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {[1,2,3,4].map(num => (
                        <option key={num} value={num}>{num} image{num > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  {/* Rendering Speed */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rendering Speed</label>
                    <select
                      value={formData.renderingSpeed}
                      onChange={(e) => handleInputChange('renderingSpeed', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="TURBO">Turbo (Fastest)</option>
                      <option value="DEFAULT">Default</option>
                      <option value="QUALITY">Quality (Slowest, Best)</option>
                    </select>
                  </div>

                  {/* Magic Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Magic Prompt</label>
                    <select
                      value={formData.magicPrompt}
                      onChange={(e) => handleInputChange('magicPrompt', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="AUTO">Auto</option>
                      <option value="ON">On</option>
                      <option value="OFF">Off</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Advanced Text Inputs */}
              <div className="space-y-4">
                {/* Negative Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Negative Prompt (Optional)</label>
                  <input
                    type="text"
                    value={formData.negativePrompt}
                    onChange={(e) => handleInputChange('negativePrompt', e.target.value)}
                    placeholder="Describe what to exclude from the image..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Seed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seed (Optional)</label>
                  <input
                    type="number"
                    value={formData.seed}
                    onChange={(e) => handleInputChange('seed', e.target.value)}
                    placeholder="Leave empty for random"
                    min="0"
                    max="2147483647"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Style Codes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Style Codes (Optional)</label>
                  <input
                    type="text"
                    value={formData.styleCodes}
                    onChange={(e) => handleInputChange('styleCodes', e.target.value)}
                    placeholder="8-character hex codes, comma separated"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer with Generate Button */}
          <div className="border-t bg-white p-6">
            <div className="flex justify-between items-center">
              <Button 
                onClick={onClose}
                variant="outline" 
                disabled={isGenerating}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !formData.prompt.trim()}
                size="lg"
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate {formData.numImages > 1 ? `${formData.numImages} Images` : 'Image'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

/**
 * Helper function to format category names
 */
const formatCategoryName = (category) => {
  const nameMap = {
    social_media: 'Social Media',
    social_posts: 'Social Posts',
    video_script: 'Video Script',
    video_scripts: 'Video Scripts',
    prayer_points: 'Prayer Points',
    prayer: 'Prayer Points',
    blog_post: 'Blog Post',
    article: 'Article',
    email: 'Email',
    newsletter: 'Newsletter',
    podcast: 'Podcast Script',
    sermon: 'Sermon',
    devotional: 'Devotional',
    image_generation: 'Images',
    analysis: 'Analysis'
  };
  
  return nameMap[category] || category.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export default DynamicDetailModal; 