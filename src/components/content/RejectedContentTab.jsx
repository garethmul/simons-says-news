import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import LoadingState from '../ui/loading-state';
import ErrorBoundary from '../ui/error-boundary';
import FilterControls from '../ui/filter-controls';
import Pagination from '../ui/pagination';
import ContentCard from './ContentCard';
import { X, RotateCcw } from 'lucide-react';
import { PAGINATION_CONFIG, FILTER_OPTIONS } from '../../utils/constants';
import { filterBySearch } from '../../utils/helpers';
import { useContentTypes } from '../../hooks/useContentTypes';
import HelpSection from '../common/HelpSection';

/**
 * Rejected Content Tab Component
 * Displays rejected content with options to return to review or regenerate
 */
const RejectedContentTab = ({
  rejectedContent,
  stats,
  loading,
  onReturnToReview,
  onRegenerate,
  onReview,
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
  const [sortBy, setSortBy] = useState('rejected_date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Get unique sources for filter options
  const sourceOptions = useMemo(() => {
    const sources = [...new Set(rejectedContent.map(content => content.sourceArticle?.source_name))].filter(Boolean).sort();
    return [
      { value: 'all', label: 'All Sources' },
      ...sources.map(source => ({ value: source, label: source }))
    ];
  }, [rejectedContent]);

  // Filter and sort content
  const { content, totalContent, totalPages } = useMemo(() => {
    let filtered = rejectedContent;

    // Apply search filter
    if (searchText) {
      filtered = filterBySearch(filtered, searchText, ['title', 'source_name', 'content_type']);
    }

    // Apply content type filter
    if (contentTypeFilter !== 'all') {
      filtered = filtered.filter(content => content.content_type === contentTypeFilter);
    }

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(content => content.source_name === sourceFilter);
    }

    // Apply sorting with direction support
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'rejected_date':
          comparison = new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at);
          break;
        case 'created_date':
        case 'generation_time':
          comparison = new Date(a.created_at) - new Date(b.created_at);
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'content_type':
          comparison = (a.content_type || '').localeCompare(b.content_type || '');
          break;
        case 'source':
          comparison = (a.source_name || '').localeCompare(b.source_name || '');
          break;
        default:
          comparison = new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at);
          break;
      }
      
      // Apply sort direction
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    const itemsPerPage = PAGINATION_CONFIG.ARTICLES_PER_PAGE;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    return {
      content: filtered.slice(start, end),
      totalContent: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage)
    };
  }, [rejectedContent, searchText, contentTypeFilter, sourceFilter, sortBy, sortDirection, currentPage]);

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

  const sortOptions = [
    {
    value: sortBy,
    onChange: setSortBy,
      placeholder: "Sort Field",
    options: [
      { value: 'rejected_date', label: 'Sort by Date Rejected' },
      { value: 'created_date', label: 'Sort by Date Created' },
        { value: 'generation_time', label: 'Sort by Generation Time' },
      { value: 'title', label: 'Sort by Title' },
      { value: 'content_type', label: 'Sort by Content Type' },
      { value: 'source', label: 'Sort by Source' }
    ]
    },
    {
      value: sortDirection,
      onChange: setSortDirection,
      placeholder: "Sort Direction",
      options: [
        { value: 'desc', label: 'Descending (Newest First)' },
        { value: 'asc', label: 'Ascending (Oldest First)' }
      ]
    }
  ];

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rejected Content</CardTitle>
              <CardDescription>
                Content that has been rejected and may need revision or regeneration
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {rejectedContent.length} items rejected
            </Badge>
          </div>
          
          {/* Help section */}
          <HelpSection 
            title="❌ Rejected Content Help"
            bgColor="bg-red-50"
            borderColor="border-red-200"
            textColor="text-red-800"
            headingColor="text-red-900"
          >
            <h3 className="font-semibold text-red-900 mb-2">❌ What you're viewing:</h3>
            <p className="text-sm text-red-800 mb-3">
              Content that has been rejected during the review process. These pieces may need revision, regeneration, or return to review with changes.
            </p>
            <h4 className="font-semibold text-red-900 mb-1">🔄 Available actions:</h4>
            <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
              <li>Return to review if the rejection was incorrect</li>
              <li>Regenerate content with improved AI prompts</li>
              <li>Review detailed content to understand rejection reasons</li>
              <li>Use as reference for future content improvements</li>
            </ul>
          </HelpSection>
        </CardHeader>
        <CardContent>
          {(loading && rejectedContent.length === 0) || contentTypesLoading ? (
            <LoadingState message="Loading rejected content..." count={3} />
          ) : rejectedContent.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {/* Filter Controls */}
              <FilterControls
                searchValue={searchText}
                onSearchChange={(value) => handleFilterChange(() => setSearchText(value))}
                searchPlaceholder="Search rejected content by title, source, or type..."
                filters={filters}
                sortOptions={sortOptions}
              />

              <ContentList
                content={content}
                totalContent={totalContent}
                currentPage={currentPage}
                stats={stats}
                onReturnToReview={onReturnToReview}
                onRegenerate={onRegenerate}
                onReview={onReview}
                onImageClick={onImageClick}
                onRefreshContent={onRefreshContent}
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
    <X className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <p>No rejected content</p>
    <p className="text-sm">Content rejections will appear here for review and action</p>
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
  onReturnToReview,
  onRegenerate,
  onReview,
  onImageClick,
  onRefreshContent,
  isActionLoading
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
      <span>
        Showing {((currentPage - 1) * PAGINATION_CONFIG.ARTICLES_PER_PAGE) + 1}-{Math.min(currentPage * PAGINATION_CONFIG.ARTICLES_PER_PAGE, totalContent)} of {totalContent} rejected piece{totalContent !== 1 ? 's' : ''}
      </span>
      <span>Actions available: Return to review, Regenerate</span>
    </div>
    {content.map((contentItem, index) => (
      <ContentCard
        key={`rejected-content-${contentItem.gen_article_id}`}
        content={contentItem}
        index={index}
        onReview={onReview}
        onReturnToReview={onReturnToReview}
        onRegenerate={onRegenerate}
        onImageClick={onImageClick}
        onRefreshContent={onRefreshContent}
        showApprovalActions={false}
        showPublishActions={false}
        showRejectedActions={true}
        loading={false}
        isActionLoading={isActionLoading}
      />
    ))}
  </div>
);

export default RejectedContentTab; 