import React from 'react';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Button } from './button';
import { Search, Star, X } from 'lucide-react';

/**
 * Reusable filter controls component
 */
export const FilterControls = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  sortOptions = [],
  showFavoritesToggle = false,
  showFavoritesOnly = false,
  onFavoritesToggle,
  showRejectedToggle = false,
  showRejectedStories = false,
  onRejectedToggle,
  onFilterReset,
  className = ""
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg ${className}`}>
      {/* Search Input */}
      <div className="flex-1 min-w-64">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {/* Filter Selects */}
      {filters.map((filter, index) => (
        <Select key={index} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      
      {/* Sort Options */}
      {sortOptions.length > 0 && (
        <Select value={sortOptions[0].value} onValueChange={sortOptions[0].onChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions[0].options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {/* Favorites Toggle */}
      {showFavoritesToggle && (
        <Button
          variant={showFavoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={onFavoritesToggle}
        >
          <Star className={`w-4 h-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          {showFavoritesOnly ? 'Show All' : 'Favorites Only'}
        </Button>
      )}

      {/* Rejected Stories Toggle */}
      {showRejectedToggle && (
        <Button
          variant={showRejectedStories ? "destructive" : "outline"}
          size="sm"
          onClick={onRejectedToggle}
        >
          <X className={`w-4 h-4 mr-2`} />
          {showRejectedStories ? 'Hide Rejected' : 'Show Rejected'}
        </Button>
      )}
      
      {/* Reset Button */}
      {onFilterReset && (
        <Button
          variant="outline"
          size="sm"
          onClick={onFilterReset}
        >
          Reset Filters
        </Button>
      )}
    </div>
  );
};

export default FilterControls; 