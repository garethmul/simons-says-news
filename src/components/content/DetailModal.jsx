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
  Eye
} from 'lucide-react';
import { formatDate, getDaysAgo, parseKeywords } from '../../utils/helpers';
import { useContentTypes } from '../../hooks/useContentTypes';
import { useAccount } from '../../contexts/AccountContext';

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
  const { withAccountContext } = useAccount();
  const [activeTab, setActiveTab] = useState('content');
  const [currentImages, setCurrentImages] = useState([]);
  const [options, setOptions] = useState(null);
  const [accountSettings, setAccountSettings] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageMetadata, setImageMetadata] = useState([]);
  const [showArchivedImages, setShowArchivedImages] = useState(false);
  const [showCustomImageModal, setShowCustomImageModal] = useState(false);

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

  // Function to fetch latest images for content
  const fetchLatestImages = async (contentId, includeArchived = false) => {
    try {
      const apiUrl = `/api/eden/content/${contentId}/images${includeArchived ? '?include_archived=true' : ''}`;
      const response = await fetch(apiUrl, withAccountContext());
      if (response.ok) {
        const data = await response.json();
        return data.images || [];
      } else {
        console.warn('Failed to fetch latest images, using fallback. Status:', response.status);
        return selectedContent?.images || [];
      }
    } catch (error) {
      console.warn('Error fetching latest images, using fallback:', error.message);
      return selectedContent?.images || [];
    }
  };

  // Update current images when selectedContent changes and fetch latest from database
  useEffect(() => {
    if (selectedContent?.gen_article_id) {
      // First set the existing images immediately
      setCurrentImages(selectedContent.images || []);
      
      // Then fetch the latest images from the database, considering the filter
      fetchLatestImages(selectedContent.gen_article_id, showArchivedImages).then(latestImages => {
        setCurrentImages(latestImages);
      });
    }
  }, [selectedContent, showArchivedImages, withAccountContext]);

  // Handle image click to open viewer
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

  // Handle new image generation
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

  // Handle image status update (archive, unarchive, approve, reject)
  const handleImageStatusUpdate = async (imageId, newStatus) => {
    console.log(`🔄 Updating image ${imageId} to status: ${newStatus}`);
    try {
      const response = await fetch(`/api/eden/images/${imageId}/status`, withAccountContext({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      }));

      if (response.ok) {
        const updatedImage = await response.json();
        console.log('✅ Image status updated:', updatedImage.image);
        // Refresh images to reflect the change
        fetchLatestImages(selectedContent.gen_article_id, showArchivedImages).then(latestImages => {
          setCurrentImages(latestImages);
        });
        // Optionally, update image metadata if it's already loaded and contains this image
        setImageMetadata(prevMeta => prevMeta.map(meta => 
          meta.result?.imageUrl === updatedImage.image?.sirvUrl || meta.metadata?.ideogramId === updatedImage.image?.ideogramId
            ? { ...meta, status: newStatus } // This might need more specific mapping based on metadata structure
            : meta
        ));
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to update image status:', errorData.error);
        alert(`Failed to update image status: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Error updating image status:', error);
      alert('Error updating image status. See console for details.');
    }
  };

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
                <ImagesTab 
                  images={currentImages} 
                  contentId={selectedContent.gen_article_id} 
                  onImageGenerated={handleImageGenerated}
                  onImageClick={handleImageClick}
                  onUpdateImageStatus={handleImageStatusUpdate}
                  showArchived={showArchivedImages}
                  setShowArchived={setShowArchivedImages}
                  onOpenCustomImageModal={() => setShowCustomImageModal(true)}
                />
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
                <div className={`absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 ${image.status === 'archived' ? 'group-hover:bg-opacity-85' : ''}`}>
                  <div className="text-white text-center p-2">
                    <div className="text-xs font-medium mb-1">#{index + 1} ({image.status || 'pending_review'})</div>
                    <div className="text-xs text-gray-200 line-clamp-2 mb-2">{image.altText}</div>
                    <div className="flex gap-2 items-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageClick && onImageClick(index);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      {image.status !== 'archived' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateImageStatus(image.id, 'archived');
                          }}
                        >
                          <Archive className="w-3 h-3 mr-1" /> Archive
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs bg-green-500 hover:bg-green-600 text-white border-green-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateImageStatus(image.id, 'pending_review'); // Or 'approved' if it was previously
                          }}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> Unarchive
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Source indicator */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant="outline" className="text-xs bg-white/90 text-gray-700">
                    {image.source === 'ideogram' ? 'AI Generated' : image.query || 'Stock Photo'}
                  </Badge>
                </div>
                {/* Ideogram indicator */}
                {image.source === 'ideogram' && (
                  <div className="absolute top-2 right-2">
                    <Wand2 className="w-4 h-4 text-purple-600 bg-white rounded-full p-0.5" />
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

/**
 * Image Viewer Modal with Carousel and Metadata
 */
const ImageViewerModal = ({ images, selectedIndex, metadata, onClose, onIndexChange }) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeydown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [currentIndex]);

  // Update currentIndex when selectedIndex changes
  useEffect(() => {
    setCurrentIndex(selectedIndex);
  }, [selectedIndex]);

  const goToPrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    setCurrentIndex(newIndex);
    onIndexChange(newIndex);
  };

  const goToNext = () => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onIndexChange(newIndex);
  };

  const currentImage = images[currentIndex];
  const currentMetadata = metadata.find(m => 
    m.result?.imageUrl === currentImage?.sirvUrl ||
    m.metadata?.ideogramId === currentImage?.ideogramId
  );

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-8 z-[60]" onClick={onClose}>
      <div className="flex w-full h-full max-w-7xl max-h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Left Panel - Metadata */}
        <div className="bg-white p-6 overflow-y-auto border-r border-gray-200" style={{ width: '45%', minWidth: '400px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Image Details</h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Basic Image Info */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Image #{currentIndex + 1}</span>
                  <span>{images.length} total</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Source:</span>
                  <span className="capitalize">{currentImage.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{formatDate(currentImage.created)}</span>
                </div>
              </div>
            </div>

            {/* AI Generation Metadata */}
            {(currentMetadata || currentImage.generationMetadata) && (
              <>
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Generation Details</h4>
                  <div className="space-y-2 text-sm">
                    {/* Primary metadata source: generationMetadata from image */}
                    {currentImage.generationMetadata?.prompt && (
                      <div>
                        <span className="text-gray-600 block mb-1">AI Prompt:</span>
                        <p className="bg-gray-50 p-3 rounded text-sm mt-1 break-words leading-relaxed">
                          {currentImage.generationMetadata.prompt}
                        </p>
                      </div>
                    )}
                    
                    {/* Fallback to detailed metadata if available */}
                    {!currentImage.generationMetadata?.prompt && currentMetadata?.prompts?.userPrompt && (
                      <div>
                        <span className="text-gray-600 block mb-1">User Prompt:</span>
                        <p className="bg-gray-50 p-3 rounded text-sm mt-1 break-words leading-relaxed">
                          {currentMetadata.prompts.userPrompt}
                        </p>
                      </div>
                    )}
                    {!currentImage.generationMetadata?.prompt && currentMetadata?.prompts?.finalPrompt && (
                      <div>
                        <span className="text-gray-600 block mb-1">Final Prompt:</span>
                        <p className="bg-gray-50 p-3 rounded text-sm mt-1 break-words leading-relaxed">
                          {currentMetadata.prompts.finalPrompt}
                        </p>
                      </div>
                    )}

                    {/* Style Codes Display */}
                    {currentImage.generationMetadata?.styleCodes && (
                      <div>
                        <span className="text-gray-600 block mb-1">🎨 Style Codes (Reusable):</span>
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(currentImage.generationMetadata.styleCodes) 
                              ? currentImage.generationMetadata.styleCodes.map((code, index) => (
                                  <code key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">
                                    {code}
                                  </code>
                                ))
                              : (
                                <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">
                                  {currentImage.generationMetadata.styleCodes}
                                </code>
                              )
                            }
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            💡 Copy these codes to reuse this exact style in future generations
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">AI Parameters</h4>
                  <div className="space-y-2 text-sm">
                    {/* Model Version from generationMetadata */}
                    {currentImage.generationMetadata?.modelVersion && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Model Version:</span>
                        <span className="font-semibold">Ideogram {currentImage.generationMetadata.modelVersion}</span>
                      </div>
                    )}
                    
                    {/* Style Type from generationMetadata or fallback */}
                    {(currentImage.generationMetadata?.styleType || currentMetadata?.parameters?.styleType) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Style:</span>
                        <span className="capitalize">
                          {(currentImage.generationMetadata?.styleType || currentMetadata.parameters.styleType).toLowerCase()}
                        </span>
                      </div>
                    )}
                    
                    {/* Resolution from generationMetadata or fallback */}
                    {(currentImage.generationMetadata?.resolution || currentMetadata?.result?.resolution) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Resolution:</span>
                        <span>{currentImage.generationMetadata?.resolution || currentMetadata.result.resolution}</span>
                      </div>
                    )}
                    
                    {/* Seed from generationMetadata or fallback */}
                    {(currentImage.generationMetadata?.seed || currentMetadata?.result?.seed) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Seed (Reusable):</span>
                        <span className="font-mono text-xs bg-green-50 px-2 py-1 rounded">
                          {currentImage.generationMetadata?.seed || currentMetadata.result.seed}
                        </span>
                      </div>
                    )}
                    
                    {/* Fallback parameters if generationMetadata doesn't have them */}
                    {!currentImage.generationMetadata && currentMetadata?.parameters?.aspectRatio && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Aspect Ratio:</span>
                        <span>{currentMetadata.parameters.aspectRatio}</span>
                      </div>
                    )}
                    {!currentImage.generationMetadata && currentMetadata?.parameters?.renderingSpeed && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Speed:</span>
                        <span className="capitalize">{currentMetadata.parameters.renderingSpeed.toLowerCase()}</span>
                      </div>
                    )}
                    {!currentImage.generationMetadata && currentMetadata?.parameters?.magicPrompt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Magic Prompt:</span>
                        <span>{currentMetadata.parameters.magicPrompt}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Generation Stats</h4>
                  <div className="space-y-2 text-sm">
                    {currentMetadata.metadata?.generationTimeSeconds && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Generation Time:</span>
                        <span>{currentMetadata.metadata.generationTimeSeconds.toFixed(1)}s</span>
                      </div>
                    )}
                    {currentMetadata.metadata?.estimatedCostUSD && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimated Cost:</span>
                        <span>${currentMetadata.metadata.estimatedCostUSD.toFixed(3)}</span>
                      </div>
                    )}
                    {currentMetadata.result?.resolution && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Resolution:</span>
                        <span>{currentMetadata.result.resolution}</span>
                      </div>
                    )}
                    {currentMetadata.result?.isImageSafe !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Safe Content:</span>
                        <span className={currentMetadata.result.isImageSafe ? 'text-green-600' : 'text-red-600'}>
                          {currentMetadata.result.isImageSafe ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Settings Used */}
                {currentMetadata.metadata?.accountSettings && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Account Settings Applied</h4>
                    <div className="space-y-2 text-sm">
                      {currentMetadata.metadata.accountSettings.prefixUsed && (
                        <div className="text-green-600">✓ Prompt prefix applied</div>
                      )}
                      {currentMetadata.metadata.accountSettings.suffixUsed && (
                        <div className="text-green-600">✓ Prompt suffix applied</div>
                      )}
                      {currentMetadata.metadata.accountSettings.brandColorsUsed && (
                        <div className="text-green-600">✓ Brand colors applied</div>
                      )}
                      {currentMetadata.metadata.accountSettings.selectedColorTemplate && (
                        <div className="text-blue-600">
                          Color template: {currentMetadata.metadata.accountSettings.selectedColorTemplate}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Alternative text */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Alt Text</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                {currentImage.altText}
              </p>
            </div>

            {/* Actions */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(currentImage.sirvUrl, '_blank')}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Original
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(currentImage.sirvUrl);
                    // You could add a toast notification here
                  }}
                  className="flex items-center gap-1"
                >
                  📋 Copy URL
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Image Display */}
        <div className="flex flex-col bg-gray-900" style={{ width: '55%' }}>
          {/* Navigation Header */}
          <div className="bg-black bg-opacity-50 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm">
                {currentIndex + 1} of {images.length}
              </span>
              {currentImage.source === 'ideogram' && (
                <Badge variant="secondary" className="bg-purple-600 text-white">
                  <Wand2 className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                disabled={images.length <= 1}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                ← Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                disabled={images.length <= 1}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                Next →
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Main Image Display */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-900">
            <div className="relative max-w-full max-h-full">
              <img
                src={currentImage.sirvUrl}
                alt={currentImage.altText}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNHB4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgZXJyb3I8L3RleHQ+PC9zdmc+';
                }}
              />

              {/* Navigation arrows overlay */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={goToPrevious}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

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
    </div>
  );
};

/**
 * Custom Image Generation Modal - Dedicated modal for AI image creation
 */
const CustomImageGenerationModal = ({ 
  isOpen, 
  onClose, 
  contentId, 
  contentData,
  onImageGenerated 
}) => {
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

    if (isOpen && (!options || options.modelVersion !== formData.modelVersion)) {
      loadData();
    }
  }, [isOpen, formData.modelVersion, options, withAccountContext]);

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
      // Reset formData to defaults when modal closes
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
        modelVersion: 'v2' // Default to v2
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

                {/* Reference Style - v3 Feature */}
                {formData.modelVersion === 'v3' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Style Images (v3 Feature)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Upload up to 3 images that Ideogram will use as visual style inspiration. Only available in v3.
                    </p>
                    
                    {/* Selected Reference Images */}
                    {formData.referenceImages.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {formData.referenceImages.map((image, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                            <img 
                              src={image.url} 
                              alt={`Reference ${index + 1}`}
                              className="w-16 h-16 object-cover rounded border"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-700">Reference Image {index + 1}</div>
                              <div className="text-xs text-gray-500">
                                {image.type === 'existing' ? 'From image bank' : (image.file?.name || 'Uploaded image')}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                // Clean up blob URL if it's an uploaded file
                                if (image.url && image.url.startsWith('blob:')) {
                                  URL.revokeObjectURL(image.url);
                                }
                                const newImages = formData.referenceImages.filter((_, i) => i !== index);
                                handleInputChange('referenceImages', newImages);
                              }}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Reference Images */}
                    {formData.referenceImages.length < 3 && (
                      <div className="space-y-3">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setReferenceImageMode('upload')}
                            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                              referenceImageMode === 'upload'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            📤 Upload New
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReferenceImageMode('existing');
                              loadExistingImages();
                            }}
                            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                              referenceImageMode === 'existing'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            🖼️ Choose Existing
                          </button>
                        </div>
                        
                        {/* Upload Mode */}
                        {referenceImageMode === 'upload' && (
                          <div className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors rounded-lg p-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  const newImages = [...formData.referenceImages, { file, url, type: 'upload' }];
                                  handleInputChange('referenceImages', newImages);
                                  e.target.value = '';
                                }
                              }}
                              className="hidden"
                              id={`reference-upload-${formData.referenceImages.length}`}
                            />
                            <label
                              htmlFor={`reference-upload-${formData.referenceImages.length}`}
                              className="cursor-pointer flex flex-col items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-lg">+</span>
                              </div>
                              <span className="text-sm font-medium">
                                Upload Reference Image ({formData.referenceImages.length}/3)
                              </span>
                              <span className="text-xs text-center">
                                Choose an image from your device
                              </span>
                            </label>
                          </div>
                        )}
                        
                        {/* Existing Images Mode */}
                        {referenceImageMode === 'existing' && (
                          <div className="border border-gray-300 rounded-lg p-4">
                            {loadingExistingImages ? (
                              <div className="text-center py-8 text-gray-500">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                <p>Loading your images...</p>
                              </div>
                            ) : existingImages.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No images found in your account</p>
                                <p className="text-sm mt-2">Generate some images first to use as references</p>
                              </div>
                            ) : (
                              <div>
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-sm font-medium text-gray-700">
                                    Choose from {existingImages.length} images
                                  </h4>
                                  <span className="text-xs text-gray-500">
                                    {formData.referenceImages.length}/3 selected
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                                  {existingImages.map((image) => {
                                    const isSelected = formData.referenceImages.some(ref => ref.id === image.id);
                                    const canSelect = formData.referenceImages.length < 3;
                                    
                                    return (
                                      <div
                                        key={image.id}
                                        className={`relative group cursor-pointer rounded border-2 transition-all ${
                                          isSelected
                                            ? 'border-blue-500 ring-2 ring-blue-200'
                                            : canSelect
                                            ? 'border-gray-200 hover:border-gray-300'
                                            : 'border-gray-200 opacity-50 cursor-not-allowed'
                                        }`}
                                        onClick={() => {
                                          if (!isSelected && canSelect) {
                                            selectExistingImage(image);
                                          }
                                        }}
                                      >
                                        <div className="aspect-square">
                                          <img
                                            src={image.url}
                                            alt={image.altText}
                                            className="w-full h-full object-cover rounded"
                                          />
                                        </div>
                                        {isSelected && (
                                          <div className="absolute top-1 right-1">
                                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                              <span className="text-white text-xs">✓</span>
                                            </div>
                                          </div>
                                        )}
                                        {!canSelect && !isSelected && (
                                          <div className="absolute inset-0 bg-black bg-opacity-20 rounded flex items-center justify-center">
                                            <span className="text-white text-xs">3 max</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Preferred Style Codes */}
                {accountSettings?.preferredStyleCodes?.length > 0 && (
            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Preferred Styles</label>
              <div className="flex flex-wrap gap-2">
                      {accountSettings.preferredStyleCodes.map((styleCode, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            if (styleCode.type === 'seed') {
                              handleInputChange('seed', styleCode.value);
                            } else {
                              const currentCodes = formData.styleCodes ? formData.styleCodes.split(',').map(s => s.trim()) : [];
                              if (!currentCodes.includes(styleCode.value)) {
                                const newCodes = [...currentCodes, styleCode.value].filter(Boolean).join(', ');
                                handleInputChange('styleCodes', newCodes);
                              }
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md transition-colors"
                        >
                          <span className="font-mono">
                            {styleCode.type === 'seed' ? `Seed: ${styleCode.value}` : styleCode.value}
                          </span>
                          {styleCode.prompt && (
                            <span className="text-purple-600" title={styleCode.prompt}>💡</span>
                          )}
                        </button>
                ))}
              </div>
            </div>
          )}
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

export default DetailModal; 