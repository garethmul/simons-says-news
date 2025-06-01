import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  Send, 
  Loader2, 
  Check, 
  X, 
  AlertTriangle,
  Plus,
  ExternalLink,
  Globe
} from 'lucide-react';
import { useAccount } from '../../contexts/AccountContext';

/**
 * URL Submission Form Component
 * Allows users to submit URLs for news article analysis
 */
const URLSubmissionForm = ({ onUrlsSubmitted, isOpen, onClose }) => {
  const { selectedAccount, withAccountContext } = useAccount();
  const [urlText, setUrlText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validatedUrls, setValidatedUrls] = useState([]);
  const [invalidUrls, setInvalidUrls] = useState([]);
  const [submitResult, setSubmitResult] = useState(null);

  // Validate and normalize URLs
  const processUrls = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const valid = [];
    const invalid = [];

    lines.forEach(line => {
      try {
        // Add protocol if missing
        let url = line;
        if (!url.match(/^https?:\/\//)) {
          url = `https://${url}`;
        }

        // Validate URL format
        const urlObj = new URL(url);
        
        // Basic validation - must have valid domain
        if (urlObj.hostname && urlObj.hostname.includes('.')) {
          valid.push({
            original: line,
            normalized: url,
            domain: urlObj.hostname
          });
        } else {
          invalid.push(line);
        }
      } catch (error) {
        invalid.push(line);
      }
    });

    setValidatedUrls(valid);
    setInvalidUrls(invalid);
  };

  // Handle text input change
  const handleTextChange = (value) => {
    setUrlText(value);
    if (value.trim()) {
      processUrls(value);
    } else {
      setValidatedUrls([]);
      setInvalidUrls([]);
    }
    setSubmitResult(null);
  };

  // Submit URLs for analysis
  const handleSubmit = async () => {
    if (validatedUrls.length === 0) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/eden/sources/submit-urls`, withAccountContext({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: validatedUrls.map(url => url.normalized)
        })
      }));

      const data = await response.json();

      if (data.success) {
        setSubmitResult({
          type: 'success',
          message: `Successfully submitted ${validatedUrls.length} URLs for analysis`,
          details: data
        });
        
        // Clear form after successful submission
        setTimeout(() => {
          setUrlText('');
          setValidatedUrls([]);
          setInvalidUrls([]);
          setSubmitResult(null);
          if (onUrlsSubmitted) {
            onUrlsSubmitted(data);
          }
        }, 3000);
      } else {
        setSubmitResult({
          type: 'error',
          message: data.error || 'Failed to submit URLs',
          details: data
        });
      }
    } catch (error) {
      console.error('Error submitting URLs:', error);
      setSubmitResult({
        type: 'error',
        message: 'Network error - please try again',
        details: error
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear all inputs
  const handleClear = () => {
    setUrlText('');
    setValidatedUrls([]);
    setInvalidUrls([]);
    setSubmitResult(null);
  };

  if (!isOpen) return null;

  return (
    <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Plus className="w-5 h-5" />
              Submit URLs for Analysis
            </CardTitle>
            <CardDescription className="text-blue-800">
              Paste news article URLs (one per line) to add them for analysis and content generation
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Context */}
        {selectedAccount && (
          <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
            Submitting for: <strong>{selectedAccount.name}</strong>
          </div>
        )}

        {/* URL Input */}
        <div>
          <label className="text-sm font-medium text-blue-900 mb-2 block">
            Paste URLs (one per line):
          </label>
          <Textarea
            value={urlText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={`Examples:
https://www.christianpost.com/news/example-article
bbc.co.uk/news/uk-example
premier.org.uk/news/example-story
theguardian.com/world/example-article`}
            className="min-h-32 font-mono text-sm"
            disabled={isSubmitting}
          />
        </div>

        {/* URL Validation Results */}
        {(validatedUrls.length > 0 || invalidUrls.length > 0) && (
          <div className="space-y-3">
            {/* Valid URLs */}
            {validatedUrls.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Valid URLs ({validatedUrls.length})
                  </span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {validatedUrls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs bg-green-50 p-2 rounded">
                      <Globe className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="text-gray-600">{url.domain}</span>
                      <code className="flex-1 bg-white px-2 py-1 rounded font-mono text-xs">
                        {url.normalized}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(url.normalized, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invalid URLs */}
            {invalidUrls.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    Invalid URLs ({invalidUrls.length})
                  </span>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {invalidUrls.map((url, index) => (
                    <div key={index} className="text-xs bg-red-50 p-2 rounded text-red-700">
                      <code>{url}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submission Result */}
        {submitResult && (
          <div className={`p-3 rounded-lg border ${
            submitResult.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {submitResult.type === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
              <span className="font-medium">{submitResult.message}</span>
            </div>
            {submitResult.details && submitResult.type === 'success' && (
              <div className="text-xs mt-2">
                URLs will be analyzed and added to your stories within the next few minutes.
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={validatedUrls.length === 0 || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? 'Submitting...' : `Submit ${validatedUrls.length} URLs`}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isSubmitting}
          >
            Clear All
          </Button>
          
          <div className="flex-1" />
          
          <Badge variant="outline" className="self-center">
            {urlText.split('\n').filter(line => line.trim()).length} lines entered
          </Badge>
        </div>

        {/* Help Text */}
        <div className="text-xs text-blue-700 bg-blue-100 p-3 rounded">
          <strong>Tips:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>URLs will be automatically prefixed with https:// if missing</li>
            <li>Duplicate URLs will be automatically filtered out</li>
            <li>URLs will be analyzed for Christian news relevance</li>
            <li>Results will appear in your Stories tab once processed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default URLSubmissionForm; 