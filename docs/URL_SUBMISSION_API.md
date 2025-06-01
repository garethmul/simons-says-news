# URL Submission API Documentation

## Overview
The URL submission feature allows users to submit specific news article URLs for immediate analysis and content generation, contextualised to their organisation/account.

## API Endpoint

### POST `/api/eden/sources/submit-urls`

Accepts a list of news article URLs for analysis and adds them to the user's stories.

#### Request Headers
```
Content-Type: application/json
```

#### Request Body
```json
{
  "urls": [
    "https://www.christianpost.com/news/example-article",
    "https://bbc.co.uk/news/uk-example",
    "https://premier.org.uk/news/example-story"
  ],
  "accountId": "uuid-account-id",
  "organizationId": "uuid-organization-id"
}
```

#### Request Parameters
- `urls` (array, required): Array of validated and normalized URLs
- `accountId` (string, required): Current user's account ID for context
- `organizationId` (string, required): Organization ID for multi-tenant support

#### Success Response
```json
{
  "success": true,
  "message": "Successfully submitted 3 URLs for analysis",
  "data": {
    "submittedUrls": 3,
    "duplicatesSkipped": 0,
    "invalidUrls": 0,
    "queuedJobs": [
      {
        "jobId": "job-uuid-1",
        "url": "https://www.christianpost.com/news/example-article",
        "status": "queued"
      }
    ],
    "estimatedProcessingTime": "2-5 minutes"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Invalid URLs provided",
  "details": {
    "invalidUrls": ["invalid-url-example"],
    "duplicateUrls": ["https://already-processed.com"]
  }
}
```

## Implementation Requirements

### 1. URL Processing
- **Validation**: Ensure URLs are valid and accessible
- **Deduplication**: Check against existing articles in the database
- **Normalization**: Clean and standardize URL format
- **Domain filtering**: Optional - filter allowed/blocked domains

### 2. Account Context
- **Multi-tenant support**: Ensure URLs are associated with correct account/organization
- **Permission checking**: Verify user has permission to submit URLs for their account
- **Rate limiting**: Consider implementing rate limits per account

### 3. Processing Pipeline
- **Job queue**: Add URLs to processing queue for analysis
- **Source creation**: Create "User Submitted" source if it doesn't exist
- **Article creation**: Create article records with status 'queued' or 'processing'
- **Analysis integration**: Trigger existing article analysis workflow

### 4. Database Schema Considerations

#### New Source Record (if needed)
```sql
INSERT INTO sources (name, type, url, is_active, account_id, organization_id)
VALUES ('User Submitted', 'manual', NULL, true, $accountId, $organizationId)
ON CONFLICT (name, account_id) DO NOTHING;
```

#### Article Records
```sql
INSERT INTO articles (url, title, source_id, status, account_id, organization_id, submission_type)
VALUES ($url, 'Processing...', $userSubmittedSourceId, 'queued', $accountId, $organizationId, 'manual');
```

### 5. Integration Points
- **Existing analysis pipeline**: Ensure submitted URLs go through same analysis as automated sources
- **Job system**: Integrate with existing job queue system
- **Story generation**: URLs should appear in Stories tab once analyzed
- **Content generation**: Analyzed stories should be available for content generation

## Example Backend Implementation (Node.js/Express)

```javascript
app.post('/api/eden/sources/submit-urls', async (req, res) => {
  try {
    const { urls, accountId, organizationId } = req.body;
    
    // Validate input
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }
    
    // Get or create "User Submitted" source
    const userSource = await getOrCreateUserSubmittedSource(accountId, organizationId);
    
    // Process URLs
    const results = await processSubmittedUrls({
      urls,
      sourceId: userSource.id,
      accountId,
      organizationId
    });
    
    res.json({
      success: true,
      message: `Successfully submitted ${results.processed} URLs for analysis`,
      data: results
    });
    
  } catch (error) {
    console.error('URL submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process URL submission'
    });
  }
});
```

## Testing
- Test with various URL formats (with/without protocols)
- Test duplicate URL detection
- Test invalid URLs handling
- Test account/organization isolation
- Test rate limiting (if implemented)
- Test integration with existing analysis pipeline

## Security Considerations
- **URL validation**: Prevent SSRF attacks with proper URL validation
- **Rate limiting**: Prevent abuse with reasonable rate limits
- **Account isolation**: Ensure proper multi-tenant data separation
- **Input sanitization**: Clean and validate all input data 