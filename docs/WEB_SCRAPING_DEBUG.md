# Web Scraping Debug Guide

## Overview

Project Eden uses a hybrid approach for news aggregation:
1. **RSS feeds** (preferred) - Faster and more reliable
2. **Web scraping** (fallback) - For sites without RSS feeds

## Debugging Tools

### 1. Test Individual Sources (Command Line)

```bash
node src/scripts/test-source.js "Source Name"
```

Example:
```bash
node src/scripts/test-source.js "Premier Christian News"
node src/scripts/test-source.js "Christian Today"
```

This will show:
- Source configuration details
- What type of scraping is being used
- How many articles were found
- Sample article titles and content

### 2. API Debug Endpoint

```bash
POST /api/eden/news/sources/:sourceName/test
Content-Type: application/json

{
  "verbose": true
}
```

Example with curl:
```bash
curl -X POST "http://localhost:3000/api/eden/news/sources/Premier%20Christian%20News/test" \
  -H "Content-Type: application/json" \
  -d '{"verbose": true}'
```

This provides detailed debug information including:
- HTTP response codes
- Content length and type
- Which CSS selectors were tried
- How many elements each selector found
- Sample extracted content

### 3. Frontend Sources Tab

In the Project Eden dashboard:
1. Go to the **Sources** tab
2. Check the **Articles (24h)** column
3. Sources with 0 articles may have scraping issues
4. Use the **Enable/Disable** toggle to test sources

## Common Issues & Solutions

### Issue 1: No Articles Found (Web Scraping)

**Symptoms:**
- Source shows 0 articles in last 24h
- Type shows "Web Scraping"
- Console logs show "No articles found"

**Debugging Steps:**
1. Check if website is accessible:
   ```bash
   curl -I https://example-christian-site.com
   ```

2. Test the source:
   ```bash
   node src/scripts/test-source.js "Source Name"
   ```

3. Check HTML structure:
   - Most sites use `<article>`, `.post`, `.news-item` classes
   - Some use custom classes like `.story-card`, `.bulletin-item`

**Solutions:**
- **Update CSS selectors** in `newsAggregator.js` for specific sites
- **Convert to RSS** if an RSS feed is available
- **Find alternative RSS URL** for the same organisation

### Issue 2: RSS Feed Broken

**Symptoms:**
- Source has `rss_feed_url` but finds 0 articles
- Console shows "RSS parsing failed"

**Debugging Steps:**
1. Test RSS URL directly:
   ```bash
   curl -H "Accept: application/rss+xml" https://example.com/rss
   ```

2. Check RSS validity:
   - Use https://validator.w3.org/feed/
   - Look for HTTP redirects or changes

**Solutions:**
- **Update RSS URL** if it has changed
- **Find new RSS URL** from site's footer/navigation
- **Convert to web scraping** as fallback

### Issue 3: Content Too Short

**Symptoms:**
- Articles are found but filtered out
- Console shows elements found but "content length < 30"

**Solutions:**
- **Lower content threshold** in `scrapeWebsite()` method
- **Improve content extraction** selectors
- **Use fallback text extraction** from whole article container

### Issue 4: Anti-Bot Protection

**Symptoms:**
- HTTP 403 Forbidden errors
- HTTP 429 Too Many Requests
- Empty responses from valid URLs

**Solutions:**
- ✅ **Improved User-Agent** (already implemented)
- ✅ **Better HTTP headers** (already implemented)
- **Add delays** between requests
- **Rotate User-Agents** if needed

## Website-Specific Fixes

### Christian News Sites Common Patterns

Different Christian news websites use different HTML structures:

| Site Type | Common Selectors |
|-----------|------------------|
| WordPress | `.post`, `.entry`, `article` |
| Custom CMS | `.news-item`, `.story`, `.article-card` |
| Church Sites | `.bulletin-item`, `.sermon`, `.ministry-update` |
| News Portals | `.story-card`, `.headline`, `.news-article` |

### Adding New Selectors

To add support for a specific site's structure:

1. **Identify the pattern** by inspecting the HTML
2. **Add to selectors array** in `newsAggregator.js`:
   ```javascript
   const articleSelectors = [
     // ... existing selectors ...
     '.your-custom-selector',
     '[data-article-id]',  // for data attributes
     '.story-wrapper article'  // for nested structures
   ];
   ```

## Performance Monitoring

### Success Rate Tracking

The Sources tab shows success rates for each source:
- **Green (>70%)**: Working well
- **Yellow (30-70%)**: Intermittent issues
- **Red (<30%)**: Needs attention

### Common Metrics

- **Articles per 24h**: How many articles found recently
- **Total articles**: Historical success
- **Last checked**: When last scraped
- **Response time**: How long scraping takes

## Quick Fixes Checklist

When a scraper stops working:

1. ✅ **Test the source** with debug tools
2. ✅ **Check website accessibility** with curl
3. ✅ **Verify RSS feed** if applicable
4. ✅ **Inspect HTML structure** for changes
5. ✅ **Update selectors** if needed
6. ✅ **Consider RSS alternative** if web scraping fails
7. ✅ **Document the fix** for future reference

## Getting Help

If you're still having issues:

1. **Run the debug endpoint** with `verbose: true`
2. **Share the console output** showing what selectors were tried
3. **Check the website manually** to see its current structure
4. **Look for RSS feeds** as an alternative
5. **Consider if the source is still relevant** for Eden's audience 