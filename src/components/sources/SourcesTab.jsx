import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import LoadingState from '../ui/loading-state';
import ErrorBoundary from '../ui/error-boundary';
import FilterControls from '../ui/filter-controls';
import { 
  RefreshCw, 
  Check, 
  X, 
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { FILTER_OPTIONS } from '../../utils/constants';
import { formatDateTime, getSourceType, getSuccessRateColor, filterBySearch } from '../../utils/helpers';

/**
 * Sources Tab Component
 * Manages news sources with filtering, sorting, and status controls
 */
const SourcesTab = ({
  sources,
  loading,
  onRefresh,
  onToggleSourceStatus,
  toggleLoadingMap
}) => {
  // Filter and sort state
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('enabled');
  const [sortBy, setSortBy] = useState('name');

  // Filter and sort sources
  const filteredAndSortedSources = useMemo(() => {
    let filtered = sources;

    // Apply search filter
    if (searchText) {
      filtered = filterBySearch(filtered, searchText, ['name']);
    }

    // Apply status filter
    if (statusFilter === 'enabled') {
      filtered = filtered.filter(source => source.is_active);
    } else if (statusFilter === 'disabled') {
      filtered = filtered.filter(source => !source.is_active);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'status':
          return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
        case 'status_desc':
          return (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
        case 'type':
          const aType = getSourceType(a);
          const bType = getSourceType(b);
          return aType.localeCompare(bType);
        case 'type_desc':
          const aTypeDesc = getSourceType(a);
          const bTypeDesc = getSourceType(b);
          return bTypeDesc.localeCompare(aTypeDesc);
        case 'articles':
          return (b.articles_last_24h || 0) - (a.articles_last_24h || 0);
        case 'articles_desc':
          return (a.articles_last_24h || 0) - (b.articles_last_24h || 0);
        case 'success_rate':
          return (b.success_rate || 0) - (a.success_rate || 0);
        case 'success_rate_desc':
          return (a.success_rate || 0) - (b.success_rate || 0);
        case 'total_articles':
          return (b.total_articles || 0) - (a.total_articles || 0);
        case 'total_articles_desc':
          return (a.total_articles || 0) - (b.total_articles || 0);
        case 'last_check':
          const aTime = a.last_checked ? new Date(a.last_checked) : new Date(0);
          const bTime = b.last_checked ? new Date(b.last_checked) : new Date(0);
          return bTime - aTime;
        case 'last_check_desc':
          const aTimeDesc = a.last_checked ? new Date(a.last_checked) : new Date(0);
          const bTimeDesc = b.last_checked ? new Date(b.last_checked) : new Date(0);
          return aTimeDesc - bTimeDesc;
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    return filtered;
  }, [sources, searchText, statusFilter, sortBy]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortBy(column + '_desc');
    } else if (sortBy === column + '_desc') {
      setSortBy(column);
    } else {
      setSortBy(column);
    }
  };

  // Filter configurations
  const filters = [
    {
      value: statusFilter,
      onChange: setStatusFilter,
      placeholder: "Filter by Status",
      options: [
        { value: 'enabled', label: 'Enabled Sources' },
        { value: 'disabled', label: 'Disabled Sources' },
        { value: 'all', label: 'All Sources' }
      ]
    }
  ];

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>News Source Management</CardTitle>
              <CardDescription>
                Monitor and manage Christian news sources for content aggregation
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant="outline" className="text-sm">
                {sources.length} total sources
              </Badge>
            </div>
          </div>
          
          {/* Explanatory section */}
          <ExplanatorySection sources={sources} />
        </CardHeader>
        <CardContent>
          {loading && sources.length === 0 ? (
            <LoadingState message="Loading news sources..." count={4} />
          ) : (
            <div className="space-y-4">
              {/* Filter Controls */}
              <FilterControls
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search sources by name..."
                filters={filters}
              />

              <SourcesTable
                sources={filteredAndSortedSources}
                totalSources={sources.length}
                statusFilter={statusFilter}
                sortBy={sortBy}
                onSort={handleSort}
                onToggleSourceStatus={onToggleSourceStatus}
                toggleLoadingMap={toggleLoadingMap}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

/**
 * Explanatory Section Component
 */
const ExplanatorySection = ({ sources }) => (
  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
    <h3 className="font-semibold text-blue-900 mb-2">📡 News Source Management</h3>
    <p className="text-sm text-blue-800 mb-3">
      Monitor and manage {sources.length} configured Christian news sources. Track performance, enable/disable sources, 
      and view detailed statistics for content aggregation optimization.
    </p>
    <h4 className="font-semibold text-blue-900 mb-1">📊 Current Status:</h4>
    <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
      <li>{sources.filter(s => s.is_active).length} sources are currently enabled and being monitored</li>
      <li>{sources.filter(s => s.articles_last_24h > 0).length} sources provided articles in the last 24 hours</li>
      <li>{sources.reduce((sum, s) => sum + s.articles_last_24h, 0)} total articles discovered in last 24h</li>
      <li>RSS feeds and web scraping targets are monitored automatically</li>
    </ul>
  </div>
);

/**
 * Sources Table Component
 */
const SourcesTable = ({
  sources,
  totalSources,
  statusFilter,
  sortBy,
  onSort,
  onToggleSourceStatus,
  toggleLoadingMap
}) => (
  <>
    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
      <span>
        Showing {sources.length} of {totalSources} sources
        {statusFilter === 'enabled' && ` (${sources.filter(s => s.is_active).length} enabled)`}
        {statusFilter === 'disabled' && ` (${sources.filter(s => !s.is_active).length} disabled)`}
      </span>
      <span>{sources.reduce((sum, s) => sum + s.articles_last_24h, 0)} articles discovered (24h)</span>
    </div>

    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton
                column="name"
                sortBy={sortBy}
                onSort={onSort}
                text="Source Name"
              />
            </TableHead>
            <TableHead>
              <SortButton
                column="status"
                sortBy={sortBy}
                onSort={onSort}
                text="Status"
              />
            </TableHead>
            <TableHead>
              <SortButton
                column="type"
                sortBy={sortBy}
                onSort={onSort}
                text="Type"
              />
            </TableHead>
            <TableHead>
              <SortButton
                column="articles"
                sortBy={sortBy}
                onSort={onSort}
                text="Articles (24h)"
              />
            </TableHead>
            <TableHead>
              <SortButton
                column="success_rate"
                sortBy={sortBy}
                onSort={onSort}
                text="Success Rate"
              />
            </TableHead>
            <TableHead>
              <SortButton
                column="total_articles"
                sortBy={sortBy}
                onSort={onSort}
                text="Total Articles"
              />
            </TableHead>
            <TableHead>
              <SortButton
                column="last_check"
                sortBy={sortBy}
                onSort={onSort}
                text="Last Check"
              />
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source, index) => (
            <SourceRow
              key={`source-${source.source_id || index}`}
              source={source}
              onToggleSourceStatus={onToggleSourceStatus}
              toggleLoadingMap={toggleLoadingMap}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  </>
);

/**
 * Sort Button Component
 */
const SortButton = ({ column, sortBy, onSort, text }) => (
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={() => onSort(column)}
    className="h-auto p-0 font-semibold"
  >
    {text}
    {sortBy.startsWith(column) && (
      sortBy === column ? <ArrowUp className="ml-1 w-3 h-3" /> : <ArrowDown className="ml-1 w-3 h-3" />
    )}
  </Button>
);

/**
 * Source Row Component
 */
const SourceRow = ({ source, onToggleSourceStatus, toggleLoadingMap }) => (
  <TableRow>
    <TableCell className="font-medium">
      <div>
        <div className="font-medium text-gray-900">{source.name}</div>
        {source.url && (
          <div className="text-xs text-gray-500 truncate max-w-48">
            {source.url}
          </div>
        )}
      </div>
    </TableCell>
    <TableCell>
      <Badge variant={source.is_active ? 'default' : 'secondary'}>
        {source.is_active ? 'Enabled' : 'Disabled'}
      </Badge>
    </TableCell>
    <TableCell>
      <Badge variant="outline">
        {getSourceType(source)}
      </Badge>
    </TableCell>
    <TableCell>
      <span className={`font-medium ${source.articles_last_24h > 0 ? 'text-green-600' : 'text-gray-500'}`}>
        {source.articles_last_24h || 0}
      </span>
    </TableCell>
    <TableCell>
      <span className={`font-medium ${getSuccessRateColor(source.success_rate)}`}>
        {source.success_rate ? `${(source.success_rate * 100).toFixed(0)}%` : 'N/A'}
      </span>
    </TableCell>
    <TableCell>
      <span className="font-medium text-gray-700">
        {source.total_articles || 0}
      </span>
    </TableCell>
    <TableCell>
      <span className="text-sm text-gray-600">
        {source.last_checked ? formatDateTime(source.last_checked) : 'Never'}
      </span>
    </TableCell>
    <TableCell>
      <Button
        size="sm"
        variant={source.is_active ? "outline" : "default"}
        onClick={() => onToggleSourceStatus(source.source_id)}
        disabled={toggleLoadingMap.has(source.source_id)}
        className="text-xs"
      >
        {toggleLoadingMap.has(source.source_id) ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : source.is_active ? (
          <X className="w-3 h-3 mr-1" />
        ) : (
          <Check className="w-3 h-3 mr-1" />
        )}
        {toggleLoadingMap.has(source.source_id) 
          ? 'Updating...' 
          : source.is_active 
            ? 'Disable' 
            : 'Enable'
        }
      </Button>
    </TableCell>
  </TableRow>
);

export default SourcesTab; 