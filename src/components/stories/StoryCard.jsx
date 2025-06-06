import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ExternalLink,
  FileText,
  Star,
  Loader2,
  X,
  Clock,
  CheckCircle,
  Zap
} from 'lucide-react';
import { formatDate, parseKeywords, getRelevanceBadgeVariant, getRelevanceDisplay } from '../../utils/helpers';

/**
 * Get status badge variant based on article status
 */
const getStatusBadgeVariant = (status) => {
  switch (status) {
    case 'analyzed':
      return 'default'; // Green
    case 'scraped':
      return 'secondary'; // Gray
    case 'processed':
      return 'outline'; // Blue outline
    default:
      return 'secondary';
  }
};

/**
 * Get status display text and icon
 */
const getStatusDisplay = (status) => {
  switch (status) {
    case 'analyzed':
      return { text: 'Analyzed', icon: CheckCircle };
    case 'scraped':
      return { text: 'Needs Analysis', icon: Clock };
    case 'processed':
      return { text: 'Used for Content', icon: Zap };
    default:
      return { text: status, icon: Clock };
  }
};

/**
 * Story Card Component
 * Displays individual news stories with actions
 */
const StoryCard = ({
  story,
  index,
  currentPage,
  itemsPerPage,
  onGenerateContent,
  onToggleFavorite,
  onRejectStory,
  isFavorite,
  isGenerating,
  isRejected = false
}) => {
  const displayIndex = ((currentPage - 1) * itemsPerPage) + index + 1;
  const statusDisplay = getStatusDisplay(story.status);
  const StatusIcon = statusDisplay.icon;

  return (
    <Card className={`border-l-4 ${isRejected ? 'border-l-red-500 opacity-60' : 'border-l-green-500'}`}>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          {(() => {
            const faviconUrl = story.url ? 
              `https://www.google.com/s2/favicons?domain=${new URL(story.url).hostname}&sz=16` : null;
            
            return faviconUrl ? (
              <img 
                src={faviconUrl} 
                alt={`${story.source_name} favicon`} 
                className="w-4 h-4 flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : null;
          })()}
          <CardTitle className="text-lg flex-1">#{story.article_id} {story.title}</CardTitle>
          <Badge variant="outline" className="text-xs">
            #{displayIndex}
          </Badge>
          {isRejected && (
            <Badge variant="destructive" className="text-xs">
              Rejected
            </Badge>
          )}
          <Badge variant={getStatusBadgeVariant(story.status)} className="text-xs">
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusDisplay.text}
          </Badge>
          {story.relevance_score && (
            <Badge variant={getRelevanceBadgeVariant(story.relevance_score)} className="text-xs">
              {getRelevanceDisplay(story.relevance_score)} relevance
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFavorite(story.article_id)}
            className="p-1 h-8 w-8"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current text-yellow-500' : 'text-gray-400'}`} />
          </Button>
        </div>
        <CardDescription>
          {story.source_name} • {formatDate(story.publication_date)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 mb-3">{story.summary_ai}</p>
        
        {/* Keywords */}
        <div className="flex flex-wrap gap-1 mb-3">
          {parseKeywords(story.keywords_ai).slice(0, 5).map((keyword, keywordIndex) => (
            <Badge key={keywordIndex} variant="secondary" className="text-xs">
              {keyword}
            </Badge>
          ))}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.open(story.url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Original
          </Button>
          <Button 
            size="sm" 
            variant="default"
            onClick={() => onGenerateContent(story.article_id)}
            disabled={isGenerating || isRejected}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Content'}
          </Button>
          {!isRejected && onRejectStory && (
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onRejectStory(story.article_id)}
            >
              <X className="w-4 h-4 mr-2" />
              Reject Story
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StoryCard; 