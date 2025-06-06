import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import LoadingState from '../ui/loading-state';
import ErrorBoundary from '../ui/error-boundary';
import FilterControls from '../ui/filter-controls';
import Pagination from '../ui/pagination';
import ContentCard from './ContentCard';
import { FileText } from 'lucide-react';
import { PAGINATION_CONFIG, FILTER_OPTIONS } from '../../utils/constants';
import { filterBySearch } from '../../utils/helpers';
import { useContentTypes } from '../../hooks/useContentTypes';
import HelpSection from '../common/HelpSection';

/**
 * Content Review Tab Component
 * Displays content awaiting human review with approval/rejection actions
 */
const ContentReviewTab = ({
  contentForReview,
  stats,
  loading,
  onApprove,
  onReject,
  onReview,
  onRegenerate,
  onImageClick,
  onRefreshContent,
  isActionLoading
}) => {
  // Dynamic content types
  const { getContentTypeOptions, loading: contentTypesLoading } = useContentTypes();

  // Filter and pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');

  // Get unique sources for filter options
  const sourceOptions = useMemo(() => {
    const sources = [...new Set(contentForReview.map(content => content.sourceArticle?.source_name))].filter(Boolean).sort();
    return [
      { value: 'all', label: 'All Sources' },
      ...sources.map(source => ({ value: source, label: source }))
    ];
  }, [contentForReview]);

  // Filter and sort content
  const { content, totalContent, totalPages } = useMemo(() => {
    let filtered = contentForReview;

    // Apply search filter
    if (searchText) {
      filtered = filterBySearch(filtered, searchText, ['title', 'sourceArticle.source_name', 'content_type']);
    }

    // Apply content type filter
    if (contentTypeFilter !== 'all') {
      filtered = filtered.filter(content => content.content_type === contentTypeFilter);
    }

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(content => content.sourceArticle?.source_name === sourceFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_date':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'content_type':
          return (a.content_type || '').localeCompare(b.content_type || '');
        case 'source':
          return (a.sourceArticle?.source_name || '').localeCompare(b.sourceArticle?.source_name || '');
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    const itemsPerPage = PAGINATION_CONFIG.ARTICLES_PER_PAGE;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    return {
      content: filtered.slice(start, end),
      totalContent: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage)
    };
  }, [contentForReview, searchText, contentTypeFilter, sourceFilter, sortBy, currentPage]);

  // Reset page when filters change
  const handleFilterChange = (filterFn) => {
    filterFn();
    setCurrentPage(1);
  };

  // Filter configurations
  const filters = [
    {
      value: contentTypeFilter,
      onChange: (value) => handleFilterChange(() => setContentTypeFilter(value)),
      placeholder: "Filter by Content Type",
      options: getContentTypeOptions()
    },
    {
      value: sourceFilter,
      onChange: (value) => handleFilterChange(() => setSourceFilter(value)),
      placeholder: "Filter by Source",
      options: sourceOptions
    }
  ];

  const sortOptions = [{
    value: sortBy,
    onChange: setSortBy,
    options: [
      { value: 'created_date', label: 'Sort by Date Created' },
      { value: 'title', label: 'Sort by Title' },
      { value: 'content_type', label: 'Sort by Content Type' },
      { value: 'source', label: 'Sort by Source' }
    ]
  }];

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Content Awaiting Review</CardTitle>
              <CardDescription>
                Review and approve AI-generated content before publishing
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {contentForReview.length} items pending
            </Badge>
          </div>
          
          {/* Help section */}
          <HelpSection 
            title="📋 Content Review Help"
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
            textColor="text-blue-800"
            headingColor="text-blue-900"
          >
            <h3 className="font-semibold text-blue-900 mb-2">📋 What you're viewing:</h3>
            <p className="text-sm text-blue-800 mb-3">
              AI-generated content based on top Christian news stories. Each piece includes content from all active prompt templates including blog posts, social media content, video scripts, and prayer points.
            </p>
            <h4 className="font-semibold text-blue-900 mb-1">🎯 Next steps:</h4>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>Review each content piece for accuracy and tone</li>
              <li>Check source article information for context</li>
              <li>Approve quality content or reject for revision</li>
              <li>Use "Regenerate" to create fresh content from the same source</li>
              <li>Approved content moves to the "Approved Content" tab</li>
            </ul>
          </HelpSection>
        </CardHeader>
        <CardContent>
          {(loading && contentForReview.length === 0) || contentTypesLoading ? (
            <LoadingState message="Loading content for review..." count={3} />
          ) : contentForReview.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {/* Filter Controls */}
              <FilterControls
                searchValue={searchText}
                onSearchChange={(value) => handleFilterChange(() => setSearchText(value))}
                searchPlaceholder="Search content by title, source, or type..."
                filters={filters}
                sortOptions={sortOptions}
              />

              <ContentList
                content={content}
                totalContent={totalContent}
                currentPage={currentPage}
                stats={stats}
                onApprove={onApprove}
                onReject={onReject}
                onReview={onReview}
                onRegenerate={onRegenerate}
                onImageClick={onImageClick}
                onRefreshContent={onRefreshContent}
                loading={loading}
                isActionLoading={isActionLoading}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  className="mt-6"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

/**
 * Empty State Component
 */
const EmptyState = () => (
  <div className="text-center py-8 text-gray-500">
    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <p>No content pending review</p>
    <p className="text-sm">Run the full cycle to generate new content</p>
  </div>
);

/**
 * Content List Component
 */
const ContentList = ({
  content,
  totalContent,
  currentPage,
  stats,
  onApprove,
  onReject,
  onReview,
  onRegenerate,
  onImageClick,
  onRefreshContent,
  loading,
  isActionLoading
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
      <span>
        Showing {((currentPage - 1) * PAGINATION_CONFIG.ARTICLES_PER_PAGE) + 1}-{Math.min(currentPage * PAGINATION_CONFIG.ARTICLES_PER_PAGE, totalContent)} of {totalContent} content piece{totalContent !== 1 ? 's' : ''}
      </span>
      <span>Total pending review: {stats.pendingReview}</span>
    </div>
    {content.map((contentItem, index) => (
      <ContentCard
        key={`review-content-${contentItem.gen_article_id}`}
        content={contentItem}
        index={index}
        onApprove={onApprove}
        onReject={onReject}
        onReview={onReview}
        onRegenerate={onRegenerate}
        onImageClick={onImageClick}
        onRefreshContent={onRefreshContent}
        showApprovalActions={true}
        showPublishActions={false}
        loading={loading}
        isActionLoading={isActionLoading}
      />
    ))}
  </div>
);

export default ContentReviewTab; 