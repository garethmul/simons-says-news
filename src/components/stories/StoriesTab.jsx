import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import LoadingState from '../ui/loading-state';
import ErrorBoundary from '../ui/error-boundary';
import FilterControls from '../ui/filter-controls';
import Pagination from '../ui/pagination';
import StoryCard from './StoryCard';
import { TrendingUp } from 'lucide-react';
import { PAGINATION_CONFIG, FILTER_OPTIONS } from '../../utils/constants';
import { filterBySearch } from '../../utils/helpers';
import HelpSection from '../common/HelpSection';

/**
 * Stories Tab Component
 * Displays all analyzed stories with filtering and pagination
 */
const StoriesTab = ({
  allArticles,
  stats,
  favoriteStories,
  loading,
  onGenerateContent,
  onToggleFavorite,
  onRejectStory,
  rejectedStories = new Set(),
  onTabChange,
  isContentGenerationLoading
}) => {
  // Filter and pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState(FILTER_OPTIONS.SORT.RELEVANCE);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showRejectedStories, setShowRejectedStories] = useState(false);

  // Get unique sources and tags for filter options
  const { sourceOptions, tagOptions } = useMemo(() => {
    const sources = [...new Set(allArticles.map(story => story.source_name))].filter(Boolean).sort();
    const tags = [...new Set(
      allArticles
        .flatMap(story => story.keywords_ai ? story.keywords_ai.split(',').map(k => k.trim()) : [])
        .filter(Boolean)
    )].sort().slice(0, 20);

    return {
      sourceOptions: [
        { value: 'all', label: 'All Sources' },
        ...sources.map(source => ({ value: source, label: source }))
      ],
      tagOptions: [
        { value: 'all', label: 'All Topics' },
        ...tags.map(tag => ({ value: tag, label: tag }))
      ]
    };
  }, [allArticles]);

  // Filter and sort stories
  const { stories, totalStories, totalPages } = useMemo(() => {
    let filtered = allArticles;

    // Apply rejected stories filter
    if (!showRejectedStories) {
      filtered = filtered.filter(story => !rejectedStories.has(story.article_id));
    }

    // Apply search filter
    if (searchText) {
      filtered = filterBySearch(filtered, searchText, ['title', 'source_name', 'keywords_ai']);
    }

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(story => story.source_name === sourceFilter);
    }

    // Apply tag/topic filter  
    if (tagFilter !== 'all') {
      filtered = filtered.filter(story => {
        const keywords = story.keywords_ai ? story.keywords_ai.toLowerCase() : '';
        return keywords.includes(tagFilter.toLowerCase());
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(story => story.status === statusFilter);
    }

    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(story => favoriteStories.has(story.article_id));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case FILTER_OPTIONS.SORT.RELEVANCE:
          return (b.relevance_score || 0) - (a.relevance_score || 0);
        case FILTER_OPTIONS.SORT.RELEVANCE_ASC:
          return (a.relevance_score || 0) - (b.relevance_score || 0);
        case FILTER_OPTIONS.SORT.DATE:
          return new Date(b.publication_date) - new Date(a.publication_date);
        case FILTER_OPTIONS.SORT.DATE_ASC:
          return new Date(a.publication_date) - new Date(b.publication_date);
        case FILTER_OPTIONS.SORT.SOURCE:
          return (a.source_name || '').localeCompare(b.source_name || '');
        case FILTER_OPTIONS.SORT.SOURCE_DESC:
          return (b.source_name || '').localeCompare(a.source_name || '');
        case FILTER_OPTIONS.SORT.TITLE:
          return (a.title || '').localeCompare(b.title || '');
        case FILTER_OPTIONS.SORT.TITLE_DESC:
          return (b.title || '').localeCompare(a.title || '');
        default:
          return (b.relevance_score || 0) - (a.relevance_score || 0);
      }
    });

    const itemsPerPage = PAGINATION_CONFIG.STORIES_PER_PAGE;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    return {
      stories: filtered.slice(start, end),
      totalStories: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage)
    };
  }, [allArticles, searchText, sourceFilter, tagFilter, statusFilter, sortBy, showFavoritesOnly, showRejectedStories, favoriteStories, rejectedStories, currentPage]);

  // Reset page when filters change
  const handleFilterChange = (filterFn) => {
    filterFn();
    setCurrentPage(1);
  };

  // Filter configurations
  const filters = [
    {
      value: sourceFilter,
      onChange: (value) => handleFilterChange(() => setSourceFilter(value)),
      placeholder: "Filter by Source",
      options: sourceOptions
    },
    {
      value: tagFilter,
      onChange: (value) => handleFilterChange(() => setTagFilter(value)),
      placeholder: "Filter by Topic",
      options: tagOptions
    },
    {
      value: statusFilter,
      onChange: (value) => handleFilterChange(() => setStatusFilter(value)),
      placeholder: "Filter by Status",
      options: [
        { value: FILTER_OPTIONS.ARTICLE_STATUS.ALL, label: 'All Statuses' },
        { value: FILTER_OPTIONS.ARTICLE_STATUS.ANALYZED, label: 'Analyzed Articles' },
        { value: FILTER_OPTIONS.ARTICLE_STATUS.SCRAPED, label: 'Needs Analysis' },
        { value: FILTER_OPTIONS.ARTICLE_STATUS.PROCESSED, label: 'Used for Content' }
      ]
    }
  ];

  const sortOptions = [{
    value: sortBy,
    onChange: setSortBy,
    options: [
      { value: FILTER_OPTIONS.SORT.RELEVANCE, label: 'Relevance (High to Low)' },
      { value: FILTER_OPTIONS.SORT.RELEVANCE_ASC, label: 'Relevance (Low to High)' },
      { value: FILTER_OPTIONS.SORT.DATE, label: 'Date (Newest First)' },
      { value: FILTER_OPTIONS.SORT.DATE_ASC, label: 'Date (Oldest First)' },
      { value: FILTER_OPTIONS.SORT.SOURCE, label: 'Source (A to Z)' },
      { value: FILTER_OPTIONS.SORT.SOURCE_DESC, label: 'Source (Z to A)' },
      { value: FILTER_OPTIONS.SORT.TITLE, label: 'Title (A to Z)' },
      { value: FILTER_OPTIONS.SORT.TITLE_DESC, label: 'Title (Z to A)' }
    ]
  }];

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Christian News Stories</CardTitle>
              <CardDescription>
                All analyzed stories for Eden's content strategy
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {allArticles.length} analyzed stories
            </Badge>
          </div>
          
          {/* Help section */}
          <HelpSection 
            title="📊 Story Management Help"
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
            textColor="text-purple-800"
            headingColor="text-purple-900"
          >
            <h3 className="font-semibold text-purple-900 mb-2">🏆 What you're viewing:</h3>
            <p className="text-sm text-purple-800 mb-3">
              All {allArticles.length} analyzed Christian news stories from {stats.articlesAggregated} articles discovered across {stats.activeSources} news sources. 
              Stories are ranked by AI relevance scoring based on Christian themes, values, and Eden's audience interests.
            </p>
            <h4 className="font-semibold text-purple-900 mb-1">🎯 Story breakdown:</h4>
            <ul className="text-sm text-purple-800 list-disc list-inside space-y-1 mb-3">
              <li>{allArticles.filter(a => a.relevance_score >= 0.6).length} high relevance stories (60%+ score)</li>
              <li>{allArticles.filter(a => a.relevance_score >= 0.3 && a.relevance_score < 0.6).length} moderate relevance stories (30-60% score)</li>
              <li>{allArticles.filter(a => a.relevance_score < 0.3).length} lower relevance stories (&lt;30% score)</li>
              <li>AI filters for Christian themes, values, and audience alignment</li>
            </ul>
            <h4 className="font-semibold text-purple-900 mb-1">📈 Next steps:</h4>
            <ul className="text-sm text-purple-800 list-disc list-inside space-y-1">
              <li>Generate AI content from high-scoring stories</li>
              <li>Review source articles for additional context</li>
              <li>Use "Generate Content" to create blog posts and social media</li>
              <li>Star your favourite stories for quick access</li>
            </ul>
          </HelpSection>
        </CardHeader>
        <CardContent>
          {loading && allArticles.length === 0 ? (
            <LoadingState message="Loading stories..." count={5} />
          ) : allArticles.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {/* Filter Controls */}
              <FilterControls
                searchValue={searchText}
                onSearchChange={(value) => handleFilterChange(() => setSearchText(value))}
                searchPlaceholder="Search stories, sources, or keywords..."
                filters={filters}
                sortOptions={sortOptions}
                showFavoritesToggle={true}
                showFavoritesOnly={showFavoritesOnly}
                onFavoritesToggle={() => handleFilterChange(() => setShowFavoritesOnly(!showFavoritesOnly))}
                showRejectedToggle={true}
                showRejectedStories={showRejectedStories}
                onRejectedToggle={() => handleFilterChange(() => setShowRejectedStories(!showRejectedStories))}
              />

              <StoriesList
                stories={stories}
                totalStories={totalStories}
                currentPage={currentPage}
                favoriteStories={favoriteStories}
                rejectedStories={rejectedStories}
                showFavoritesOnly={showFavoritesOnly}
                showRejectedStories={showRejectedStories}
                onGenerateContent={onGenerateContent}
                onToggleFavorite={onToggleFavorite}
                onRejectStory={onRejectStory}
                isContentGenerationLoading={isContentGenerationLoading}
              />

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="mt-6"
              />
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
    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <p>No analyzed stories available</p>
    <p className="text-sm">Run news aggregation and analysis to see stories</p>
  </div>
);

/**
 * Stories List Component
 */
const StoriesList = ({
  stories,
  totalStories,
  currentPage,
  favoriteStories,
  rejectedStories,
  showFavoritesOnly,
  showRejectedStories,
  onGenerateContent,
  onToggleFavorite,
  onRejectStory,
  isContentGenerationLoading
}) => (
  <>
    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
      <span>
        Showing {((currentPage - 1) * PAGINATION_CONFIG.STORIES_PER_PAGE) + 1}-{Math.min(currentPage * PAGINATION_CONFIG.STORIES_PER_PAGE, totalStories)} of {totalStories} stories
        {showFavoritesOnly && ` (${favoriteStories.size} favorites)`}
      </span>
    </div>

    {stories.map((story, index) => (
      <StoryCard
        key={`story-${story.article_id}`}
        story={story}
        index={index}
        currentPage={currentPage}
        itemsPerPage={PAGINATION_CONFIG.STORIES_PER_PAGE}
        onGenerateContent={onGenerateContent}
        onToggleFavorite={onToggleFavorite}
        onRejectStory={onRejectStory}
        isFavorite={favoriteStories.has(story.article_id)}
        isRejected={rejectedStories.has(story.article_id)}
        isGenerating={isContentGenerationLoading(story.article_id)}
      />
    ))}
  </>
);

export default StoriesTab; 