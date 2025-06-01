# Add News Source Feature

## Overview

The Add News Source feature allows users to add new news sources to their Project Eden account with proper organisation and account context. This feature provides a comprehensive interface for managing news sources with validation and real-time feedback.

## Key Features

### 🎯 **Account-Aware Source Management**
- All sources are scoped to the selected account
- Prevents duplicate sources within the same account
- Maintains security isolation between accounts

### 📝 **Comprehensive Form Validation**
- **Source Name**: Required, minimum 2 characters
- **Website URL**: Required, must be a valid URL format
- **RSS Feed URL**: Optional, validated if provided
- **Description**: Optional text field for source identification

### 🔧 **Smart Source Type Detection**
- Automatically detects if source will use RSS or web scraping
- Shows real-time preview of source type based on RSS URL presence
- Provides guidance on RSS vs web scraping performance

### ✅ **Robust Error Handling**
- Duplicate name/URL detection
- URL format validation
- Network error handling
- User-friendly error messages

## Usage

### Accessing the Feature
1. Navigate to the **Sources** tab in Project Eden
2. Click the **"Add Source"** button (green button in top-right)
3. The Add Source modal will open

### Adding a Source

#### Required Fields
- **Source Name**: A descriptive name for the news source
  - Example: "Premier Christian News"
  - Must be unique within your account

- **Website URL**: The main website URL
  - Example: "https://premierchristian.news"
  - Must be a valid URL with protocol (https://)

#### Optional Fields
- **RSS Feed URL**: RSS feed endpoint for faster aggregation
  - Example: "https://premierchristian.news/rss"
  - If provided, RSS aggregation will be used (recommended)
  - If not provided, web scraping will be used as fallback

- **Description**: Brief description to help identify the source
  - Example: "UK-based Christian news and current affairs"

### Source Types

#### RSS Feed Sources (Recommended)
- **Faster**: RSS feeds provide structured data
- **More Reliable**: Less prone to website changes
- **Better Performance**: Lower server resource usage
- **Example RSS URLs**: 
  - `/rss`
  - `/feed`
  - `/rss.xml`
  - `/feeds/all.atom.xml`

#### Web Scraping Sources
- **Fallback Method**: Used when RSS is not available
- **Automatic**: No additional configuration needed
- **Adaptive**: Uses multiple CSS selectors to find articles

## API Integration

### Endpoint
```
POST /api/eden/news/sources
```

### Request Body
```json
{
  "name": "Source Name",
  "url": "https://example.com",
  "rss_feed_url": "https://example.com/rss",
  "description": "Optional description"
}
```

### Response
```json
{
  "success": true,
  "message": "Source \"Source Name\" added successfully",
  "source": {
    "source_id": 123,
    "account_id": "56a17e9b-2274-40cc-8c83-4979e8df671a",
    "name": "Source Name",
    "url": "https://example.com",
    "rss_feed_url": "https://example.com/rss",
    "description": "Optional description",
    "is_active": true,
    "articles_last_24h": 0,
    "total_articles": 0,
    "source_type": "RSS",
    "last_checked": null,
    "created_at": "2024-01-01T12:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  },
  "accountId": "56a17e9b-2274-40cc-8c83-4979e8df671a"
}
```

## Validation Rules

### Name Validation
- Required field
- Minimum 2 characters
- Must be unique within account
- Trimmed of whitespace

### URL Validation
- Required field
- Must be valid URL format
- Must include protocol (http:// or https://)
- Must be unique within account

### RSS URL Validation
- Optional field
- If provided, must be valid URL format
- Must include protocol (http:// or https://)

## Security Features

### Account Isolation
- Sources are isolated by account ID
- Users can only see/manage sources in their account
- Duplicate checking is scoped to account

### Input Sanitisation
- All inputs are trimmed and validated
- SQL injection protection through parameterised queries
- XSS protection through React's built-in escaping

## User Experience

### Real-Time Feedback
- Form validation happens as user types
- Error messages appear immediately
- Success feedback shows created source details

### Loading States
- Submit button shows loading spinner during creation
- Form fields disabled during submission
- Clear success/error messaging

### Responsive Design
- Modal adapts to screen size
- Mobile-friendly form layout
- Accessible keyboard navigation

## Database Schema

```sql
CREATE TABLE ssnews_news_sources (
    source_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    rss_feed_url VARCHAR(255) NULL,
    description TEXT NULL,
    last_scraped_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_active (is_active),
    INDEX idx_account_id (account_id),
    UNIQUE KEY unique_name_per_account (account_id, name),
    UNIQUE KEY unique_url_per_account (account_id, url)
);
```

## Integration Points

### Frontend Components
- `AddSourceForm.jsx`: Main form component
- `SourcesTab.jsx`: Integration with sources list
- `useSourceActions.js`: Hook for source management

### Backend Services
- `server.js`: API endpoint for adding sources
- `newsAggregator.js`: Source processing logic
- `database.js`: Data persistence layer

## Testing

### Manual Testing
1. Navigate to Sources tab
2. Click "Add Source" button
3. Fill in form with valid data
4. Submit and verify source appears in list
5. Test validation by submitting invalid data
6. Test duplicate detection with existing source

### API Testing
```bash
curl -X POST "http://localhost:3607/api/eden/news/sources" \
  -H "Content-Type: application/json" \
  -H "x-account-id: 56a17e9b-2274-40cc-8c83-4979e8df671a" \
  -d '{
    "name": "Test Christian News",
    "url": "https://testchristiannews.com",
    "rss_feed_url": "https://testchristiannews.com/rss",
    "description": "Test news source"
  }'
```

## Future Enhancements

### Planned Features
- **Import from OPML**: Bulk import RSS sources
- **Source Categories**: Organize sources by topic/region
- **Custom Scraping Rules**: Advanced web scraping configuration
- **Source Testing**: Built-in source validation before adding
- **Source Analytics**: Performance metrics and insights

### Integration Opportunities
- **RSS Discovery**: Automatic RSS feed detection
- **Social Media Sources**: Twitter, Facebook feed integration
- **Webhook Sources**: Real-time content push notifications
- **Source Recommendations**: AI-suggested sources based on content preferences 