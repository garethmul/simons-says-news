# Quick Feature Test: URL Submission

## Test Checklist for URL Submission Feature

### Prerequisites
- [ ] Server running (`npm run dev`)
- [ ] Logged in with valid account
- [ ] Account has necessary permissions

### Manual Testing Steps

1. **Navigate to Sources Page**
   - Click "Sources" tab
   - Verify "Submit URLs" button is visible

2. **Open URL Submission Form**
   - Click "Submit URLs" button
   - Form should open with blue styling

3. **Test URL Validation**
   - Paste sample URLs (one per line):
     ```
     https://www.christianpost.com/news/example
     bbc.co.uk/news/uk-example
     premier.org.uk/news/example
     invalid-url
     ```
   - Should show green checkmarks for valid URLs
   - Should show red warnings for invalid URLs

4. **Test Submission**
   - Click "Submit X URLs" button
   - Should show "Submitting..." state
   - Should show success message
   - Should clear form after 3 seconds

5. **Verify Backend Processing**
   - Check live logs for processing messages
   - Look for job creation and progress
   - URLs should appear in Stories tab within 2-5 minutes

### Expected API Call
```javascript
POST /api/eden/sources/submit-urls
Headers: {
  'Content-Type': 'application/json',
  'x-account-id': 'account-uuid',
  'x-user-id': 'user-uid'
}
Body: {
  "urls": ["https://normalized-url1", "https://normalized-url2"]
}
```

### Expected Response
```json
{
  "success": true,
  "message": "Successfully submitted 2 URLs for analysis",
  "data": {
    "submittedUrls": 2,
    "duplicatesSkipped": 0,
    "invalidUrls": 0,
    "queuedJobs": [...],
    "estimatedProcessingTime": "2-5 minutes"
  }
}
```

### Common Issues to Check
- [ ] 400 error = Missing account context headers
- [ ] 401 error = Authentication problem
- [ ] 403 error = Permission denied
- [ ] 500 error = Server-side processing error

### Backend Verification
Check logs for these patterns:
```
📎 Processing X submitted URLs for account [account-id]
✅ Created "User Submitted" source (ID: X) for account [account-id]
✅ URL submission processed: X queued, 0 duplicates, 0 invalid
🔗 Analyzing submitted URL: [url]
✅ Content scraped successfully for [url]
✅ AI analysis completed for article [id]
``` 