import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Custom hook for dynamic content type management
 * Automatically discovers new prompt templates from the backend
 */
export const useContentTypes = () => {
  const [contentTypes, setContentTypes] = useState([]);
  const [contentTypeMap, setContentTypeMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch content types from API
  const fetchContentTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}${API_ENDPOINTS.CONTENT_TYPES}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Expected API response format:
        // {
        //   contentTypes: [
        //     {
        //       id: 'article',
        //       name: 'Blog Article',
        //       icon: 'FileText',
        //       category: 'blog',
        //       description: 'Generates engaging blog posts',
        //       template: 'Blog Post Generator'
        //     },
        //     {
        //       id: 'prayer_points',
        //       name: 'Prayer Points',
        //       icon: 'Heart',
        //       category: 'prayer',
        //       description: 'Creates prayer points from news',
        //       template: 'Prayer Points'
        //     }
        //   ]
        // }
        
        const types = data.contentTypes || [];
        setContentTypes(types);
        
        // Create a map for quick lookups
        const typeMap = types.reduce((acc, type) => {
          acc[type.id] = type;
          return acc;
        }, {});
        setContentTypeMap(typeMap);
        
        console.log('✅ Loaded content types:', types);
      } else {
        // Fallback to hardcoded types if API isn't available
        console.warn('Content types API not available, using fallback');
        const fallbackTypes = [
          { id: 'article', name: 'Blog Article', icon: 'FileText', category: 'blog' },
          { id: 'social_post', name: 'Social Media', icon: 'Share2', category: 'social' },
          { id: 'video_script', name: 'Video Script', icon: 'Video', category: 'video' },
          { id: 'prayer_points', name: 'Prayer Points', icon: 'Heart', category: 'prayer' }
        ];
        setContentTypes(fallbackTypes);
        setContentTypeMap(fallbackTypes.reduce((acc, type) => ({ ...acc, [type.id]: type }), {}));
      }
    } catch (err) {
      console.error('Error fetching content types:', err);
      setError(err.message);
      
      // Use fallback on error
      const fallbackTypes = [
        { id: 'article', name: 'Blog Article', icon: 'FileText', category: 'blog' },
        { id: 'social_post', name: 'Social Media', icon: 'Share2', category: 'social' },
        { id: 'video_script', name: 'Video Script', icon: 'Video', category: 'video' },
        { id: 'prayer_points', name: 'Prayer Points', icon: 'Heart', category: 'prayer' }
      ];
      setContentTypes(fallbackTypes);
      setContentTypeMap(fallbackTypes.reduce((acc, type) => ({ ...acc, [type.id]: type }), {}));
    } finally {
      setLoading(false);
    }
  }, []);

  // Get display name for a content type
  const getContentTypeName = useCallback((typeId) => {
    return contentTypeMap[typeId]?.name || typeId;
  }, [contentTypeMap]);

  // Get icon for a content type
  const getContentTypeIcon = useCallback((typeId) => {
    return contentTypeMap[typeId]?.icon || 'FileText';
  }, [contentTypeMap]);

  // Get category for a content type
  const getContentTypeCategory = useCallback((typeId) => {
    return contentTypeMap[typeId]?.category || 'general';
  }, [contentTypeMap]);

  // Get filter options for dropdowns
  const getContentTypeOptions = useCallback(() => {
    return [
      { value: 'all', label: 'All Content Types' },
      ...contentTypes.map(type => ({
        value: type.id,
        label: type.name
      }))
    ];
  }, [contentTypes]);

  // Check if a content type exists
  const hasContentType = useCallback((typeId) => {
    return !!contentTypeMap[typeId];
  }, [contentTypeMap]);

  // Load content types on mount
  useEffect(() => {
    fetchContentTypes();
  }, [fetchContentTypes]);

  return {
    // Data
    contentTypes,
    contentTypeMap,
    
    // State
    loading,
    error,
    
    // Actions
    fetchContentTypes,
    
    // Helpers
    getContentTypeName,
    getContentTypeIcon,
    getContentTypeCategory,
    getContentTypeOptions,
    hasContentType
  };
};

export default useContentTypes; 