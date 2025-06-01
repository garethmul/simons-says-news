import React, { useState } from 'react';
import { Plus, Globe, Rss, Save, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useAccount } from '../../contexts/AccountContext';
import { API_ENDPOINTS } from '../../utils/constants';

/**
 * AddSourceForm Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the form is visible
 * @param {Function} props.onClose - Callback when form is closed
 * @param {Function} props.onSourceAdded - Callback when source is successfully added
 */
export const AddSourceForm = ({ isOpen, onClose, onSourceAdded }) => {
  const { selectedAccount, withAccountContext } = useAccount();
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    rss_feed_url: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when opened
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        url: '',
        rss_feed_url: '',
        description: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Source name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Source name must be at least 2 characters';
    }

    // URL validation
    if (!formData.url.trim()) {
      newErrors.url = 'Source URL is required';
    } else {
      try {
        new URL(formData.url.trim());
      } catch {
        newErrors.url = 'Please enter a valid URL (including https://)';
      }
    }

    // RSS URL validation (optional)
    if (formData.rss_feed_url.trim()) {
      try {
        new URL(formData.rss_feed_url.trim());
      } catch {
        newErrors.rss_feed_url = 'Please enter a valid RSS feed URL (including https://)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!selectedAccount) {
      setErrors({ general: 'No account selected' });
      return;
    }

    setIsSubmitting(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}${API_ENDPOINTS.ADD_SOURCE}`, {
        ...withAccountContext({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Source added successfully: ${formData.name}`);
        
        // Call the callback to refresh the sources list
        if (onSourceAdded) {
          await onSourceAdded(result.source);
        }
        
        // Close the form
        onClose();
        
        // Reset form
        setFormData({
          name: '',
          url: '',
          rss_feed_url: '',
          description: ''
        });
        setErrors({});
      } else {
        console.error('❌ Failed to add source:', result.error);
        setErrors({ general: result.error });
      }
    } catch (error) {
      console.error('❌ Error adding source:', error);
      setErrors({ general: 'Failed to add source. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      url: '',
      rss_feed_url: '',
      description: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Add New News Source</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Account Context</span>
                </div>
                <div className="text-sm text-blue-800">
                  Adding source to: <Badge variant="outline" className="ml-1">{selectedAccount?.name}</Badge>
                </div>
              </div>

              {/* General Error */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{errors.general}</p>
                </div>
              )}

              {/* Source Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Source Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Premier Christian News"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={errors.name ? 'border-red-300 focus:border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Website URL */}
              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm font-medium">
                  Website URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={(e) => handleInputChange('url', e.target.value)}
                  className={errors.url ? 'border-red-300 focus:border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.url && (
                  <p className="text-sm text-red-600">{errors.url}</p>
                )}
                <p className="text-xs text-gray-600">
                  The main website URL for this news source
                </p>
              </div>

              {/* RSS Feed URL */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="rss_feed_url" className="text-sm font-medium">
                    RSS Feed URL
                  </Label>
                  <Rss className="h-4 w-4 text-orange-500" />
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                </div>
                <Input
                  id="rss_feed_url"
                  type="url"
                  placeholder="https://example.com/rss or https://example.com/feed"
                  value={formData.rss_feed_url}
                  onChange={(e) => handleInputChange('rss_feed_url', e.target.value)}
                  className={errors.rss_feed_url ? 'border-red-300 focus:border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.rss_feed_url && (
                  <p className="text-sm text-red-600">{errors.rss_feed_url}</p>
                )}
                <p className="text-xs text-gray-600">
                  If provided, RSS feeds will be used for faster and more reliable article collection. 
                  If not provided, web scraping will be used as a fallback.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this news source (optional)"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                  className="resize-none"
                />
                <p className="text-xs text-gray-600">
                  Optional description to help identify this source
                </p>
              </div>

              {/* Source Type Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={formData.rss_feed_url.trim() ? "default" : "secondary"}>
                    {formData.rss_feed_url.trim() ? "RSS Feed" : "Web Scraping"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700">
                  {formData.rss_feed_url.trim() 
                    ? "This source will use RSS feed aggregation for fast and reliable article collection."
                    : "This source will use web scraping. Consider providing an RSS feed URL for better performance."
                  }
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding Source...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Add Source
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddSourceForm; 