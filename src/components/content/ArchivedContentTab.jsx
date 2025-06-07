import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import LoadingState from '../ui/loading-state';
import ErrorBoundary from '../ui/error-boundary';
import FilterControls from '../ui/filter-controls';
import Pagination from '../ui/pagination';
import ContentCard from './ContentCard';
import { Archive } from 'lucide-react';
import { PAGINATION_CONFIG, FILTER_OPTIONS } from '../../utils/constants';
import { filterBySearch } from '../../utils/helpers';
import { useContentTypes } from '../../hooks/useContentTypes';
import HelpSection from '../common/HelpSection';

/**
 * Archived Content Tab Component
 * Displays archived content that has been used and completed
 */
const ArchivedContentTab = ({
  archivedContent,
  stats,
  loading,
  onReturnToApproved,
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
  const [sortBy, setSortBy] = useState('archived_date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Get unique sources for filter options
  const sourceOptions = useMemo(() => {
    const sources = [...new Set(archivedContent.map(content => content.sourceArticle?.source_name))].filter(Boolean).sort();
    return [
      { value: 'all', label: 'All Sources' },
      ...sources.map(source => ({ value: source, label: source }))
    ];
  }, [archivedContent]);

  // Filter and sort content
  const { content, totalContent, totalPages } = useMemo(() => {
    let filtered = archivedContent;

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
        case 'archived_date':
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
  }, [archivedContent, searchText, contentTypeFilter, sourceFilter, sortBy, sortDirection, currentPage]);

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
      { value: 'archived_date', label: 'Sort by Date Archived' },
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
              <CardTitle>Archived Content</CardTitle>
              <CardDescription>
                Content that has been used and archived for reference
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {archivedContent.length} items archived
            </Badge>
          </div>
          
          {/* Help section */}
          <HelpSection 
            title="📦 Archived Content Help"
            bgColor="bg-gray-50"
            borderColor="border-gray-200"
            textColor="text-gray-800"
            headingColor="text-gray-900"
          >
            <h3 className="font-semibold text-gray-900 mb-2">📦 What you're viewing:</h3>
            <p className="text-sm text-gray-800 mb-3">
              Content that has been successfully used and archived. These pieces have completed their lifecycle and are stored for reference and historical tracking.
            </p>
            <h4 className="font-semibold text-gray-900 mb-1">🔍 Available actions:</h4>
            <ul className="text-sm text-gray-800 list-disc list-inside space-y-1">
              <li>View archived content details and performance</li>
              <li>Return to approved status if content needs to be reused</li>
              <li>Search and filter historical content</li>
              <li>Track content creation and usage patterns</li>
            </ul>
          </HelpSection>
        </CardHeader>
        <CardContent>
          {(loading && archivedContent.length === 0) || contentTypesLoading ? (
            <LoadingState message="Loading archived content..." count={3} />
          ) : archivedContent.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {/* Filter Controls */}
              <FilterControls
                searchValue={searchText}
                onSearchChange={(value) => handleFilterChange(() => setSearchText(value))}
                searchPlaceholder="Search archived content by title, source, or type..."
                filters={filters}
                sortOptions={sortOptions}
              />

              <ContentList
                content={content}
                totalContent={totalContent}
                currentPage={currentPage}
                stats={stats}
                onReturnToApproved={onReturnToApproved}
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
    <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <p>No archived content</p>
    <p className="text-sm">Archive approved content after use to see it here</p>
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
  onReturnToApproved,
  onReview,
  onImageClick,
  onRefreshContent,
  isActionLoading
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
      <span>
        Showing {((currentPage - 1) * PAGINATION_CONFIG.ARTICLES_PER_PAGE) + 1}-{Math.min(currentPage * PAGINATION_CONFIG.ARTICLES_PER_PAGE, totalContent)} of {totalContent} archived piece{totalContent !== 1 ? 's' : ''}
      </span>
      <span>Total archived: {stats.archivedContent || totalContent}</span>
    </div>
    {content.map((contentItem, index) => (
      <ContentCard
        key={`archived-content-${contentItem.gen_article_id}`}
        content={contentItem}
        index={index}
        onReview={onReview}
        onReturnToApproved={onReturnToApproved}
        onImageClick={onImageClick}
        onRefreshContent={onRefreshContent}
        showApprovalActions={false}
        showPublishActions={false}
        showArchivedActions={true}
        loading={false}
        isActionLoading={isActionLoading}
      />
    ))}
  </div>
);

export default ArchivedContentTab; 