import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import LoadingState from '../ui/loading-state';
import ErrorBoundary from '../ui/error-boundary';
import FilterControls from '../ui/filter-controls';
import Pagination from '../ui/pagination';
import ContentCard from './ContentCard';
import { Check } from 'lucide-react';
import { PAGINATION_CONFIG, FILTER_OPTIONS } from '../../utils/constants';
import { filterBySearch } from '../../utils/helpers';
import { useContentTypes } from '../../hooks/useContentTypes';
import HelpSection from '../common/HelpSection';

/**
 * Approved Content Tab Component
 * Displays approved content ready for publishing
 */
const ApprovedContentTab = ({
  approvedContent,
  stats,
  loading,
  onPublish,
  onReturnToReview,
  onArchive,
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
  const [sortBy, setSortBy] = useState('approved_date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Get unique sources for filter options
  const sourceOptions = useMemo(() => {
    const sources = [...new Set(approvedContent.map(content => content.sourceArticle?.source_name))].filter(Boolean).sort();
    return [
      { value: 'all', label: 'All Sources' },
      ...sources.map(source => ({ value: source, label: source }))
    ];
  }, [approvedContent]);

  // Filter and sort content
  const { content, totalContent, totalPages } = useMemo(() => {
    let filtered = approvedContent;

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
        case 'approved_date':
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
  }, [approvedContent, searchText, contentTypeFilter, sourceFilter, sortBy, sortDirection, currentPage]);

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
      { value: 'approved_date', label: 'Sort by Date Approved' },
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
              <CardTitle>Approved Content</CardTitle>
              <CardDescription>
                Content approved and ready for publishing to Eden.co.uk
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {approvedContent.length} items ready
            </Badge>
          </div>
          
          {/* Help section */}
          <HelpSection 
            title="✅ Approved Content Help"
            bgColor="bg-green-50"
            borderColor="border-green-200"
            textColor="text-green-800"
            headingColor="text-green-900"
          >
            <h3 className="font-semibold text-green-900 mb-2">✅ What you're viewing:</h3>
            <p className="text-sm text-green-800 mb-3">
              Human-approved content that has passed quality review. These pieces are ready for publication and include all associated social media posts and video scripts.
            </p>
            <h4 className="font-semibold text-green-900 mb-1">🚀 Next steps:</h4>
            <ul className="text-sm text-green-800 list-disc list-inside space-y-1">
              <li>Publish content directly to Eden.co.uk</li>
              <li>Schedule social media posts across platforms</li>
              <li>Use video scripts for content creation</li>
              <li>Return to review if changes are needed</li>
            </ul>
          </HelpSection>
        </CardHeader>
        <CardContent>
          {(loading && approvedContent.length === 0) || contentTypesLoading ? (
            <LoadingState message="Loading approved content..." count={3} />
          ) : approvedContent.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {/* Filter Controls */}
              <FilterControls
                searchValue={searchText}
                onSearchChange={(value) => handleFilterChange(() => setSearchText(value))}
                searchPlaceholder="Search approved content by title, source, or type..."
                filters={filters}
                sortOptions={sortOptions}
              />

              <ContentList
                content={content}
                totalContent={totalContent}
                currentPage={currentPage}
                stats={stats}
                onPublish={onPublish}
                onReturnToReview={onReturnToReview}
                onArchive={onArchive}
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
    <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <p>No approved content</p>
    <p className="text-sm">Approve content from the review tab to see it here</p>
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
  onPublish,
  onReturnToReview,
  onArchive,
  onReview,
  onImageClick,
  onRefreshContent,
  isActionLoading
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
      <span>
        Showing {((currentPage - 1) * PAGINATION_CONFIG.ARTICLES_PER_PAGE) + 1}-{Math.min(currentPage * PAGINATION_CONFIG.ARTICLES_PER_PAGE, totalContent)} of {totalContent} approved piece{totalContent !== 1 ? 's' : ''}
      </span>
      <span>Total approved: {stats.approvedContent}</span>
    </div>
    {content.map((contentItem, index) => (
      <ContentCard
        key={`approved-content-${contentItem.gen_article_id}`}
        content={contentItem}
        index={index}
        onReview={onReview}
        onPublish={onPublish}
        onReturnToReview={onReturnToReview}
        onArchive={onArchive}
        onImageClick={onImageClick}
        onRefreshContent={onRefreshContent}
        showApprovalActions={false}
        showPublishActions={true}
        loading={false}
        isActionLoading={isActionLoading}
      />
    ))}
  </div>
);

export default ApprovedContentTab; 