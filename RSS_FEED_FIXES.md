# RSS Feed Issues and Fixes for Project Eden

## Problem Analysis
Only 3 out of 8 news sources are delivering articles to the system:

### Working Sources ✅
1. **Church Times**: 25 articles (https://churchtimes.co.uk/rss)
2. **Christian Concern**: 21 articles (https://christianconcern.com/rss)  
3. **Catholic Herald UK**: 11 articles (https://catholicherald.co.uk/rss)

### Broken Sources ❌
1. **Premier Christian News**: 0 articles - Cloudflare blocking
2. **Christian Today UK**: 0 articles - 404 error on RSS feed
3. **Evangelical Alliance**: 0 articles - 301 redirect
4. **Baptist Times**: 0 articles - No RSS feed URL configured
5. **UCB**: 0 articles - No response from RSS feed

## Root Causes

### 1. Incorrect RSS Feed URLs
- **Christian Today UK**: Using `/rss` but should be `/rss.xml`
- **Premier Christian News**: RSS feed blocked by Cloudflare protection
- **Evangelical Alliance**: URL redirects, need to find correct endpoint

### 2. Missing RSS Feed URLs
- **Baptist Times**: No RSS feed URL in database (null value)

### 3. Anti-Bot Protection
- **Premier Christian News**: Cloudflare protection blocking automated requests
- **UCB**: Possible rate limiting or bot detection

## Proposed Fixes

### 1. Update RSS Feed URLs
```sql
-- Fix Christian Today UK RSS feed URL
UPDATE ssnews_news_sources 
SET rss_feed_url = 'https://www.christiantoday.com/rss.xml' 
WHERE name = 'Christian Today UK';

-- Fix Evangelical Alliance RSS feed URL (need to research correct URL)
UPDATE ssnews_news_sources 
SET rss_feed_url = 'https://www.eauk.org/news/rss.xml' 
WHERE name = 'Evangelical Alliance';

-- Add Baptist Times RSS feed URL (if available)
UPDATE ssnews_news_sources 
SET rss_feed_url = 'https://www.baptist.org.uk/news/rss' 
WHERE name = 'Baptist Times';
```

### 2. Add User-Agent Headers
The news scraper should include proper User-Agent headers to avoid being blocked:
```javascript
headers: {
  'User-Agent': 'Project Eden News Aggregator (contact@eden.co.uk)',
  'Accept': 'application/rss+xml, application/xml, text/xml'
}
```

### 3. Implement Retry Logic
Add exponential backoff for failed requests and handle rate limiting.

### 4. Alternative Sources
Consider replacing non-working sources with reliable alternatives:
- **Premier Christian Radio**: https://premierchristian.news/rss (if different from current)
- **Christian Institute**: https://www.christian.org.uk/news/rss
- **Crosswalk UK**: Alternative Christian news source

## Immediate Actions Needed

1. **Test and update RSS URLs** for broken sources
2. **Add proper HTTP headers** to avoid bot detection
3. **Implement retry logic** for failed requests
4. **Monitor source reliability** and replace consistently failing sources
5. **Add logging** to track which sources fail and why

## Long-term Improvements

1. **Source health monitoring** - Track success rates over time
2. **Automatic source validation** - Test RSS feeds before adding to database
3. **Fallback sources** - Have backup sources for each category
4. **Content deduplication** - Handle cases where multiple sources report same story 