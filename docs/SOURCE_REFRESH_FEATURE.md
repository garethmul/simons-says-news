# Source Refresh Feature

## Overview

The Source Refresh feature allows users to manually trigger article aggregation from individual news sources through the Sources tab interface. This feature provides targeted control over content aggregation and is useful for testing specific sources or refreshing content from high-priority sources.

## Key Features

### 🔄 **Individual Source Refresh**
- Dedicated refresh button for each source in the Sources table
- Creates background jobs for non-blocking operation
- Real-time loading states and feedback
- Account-aware security with proper isolation

### 🎯 **Smart Job Management**
- High priority (4) for individual source refresh jobs
- Uses existing `news_aggregation` job type with `singleSource: true` flag
- Comprehensive logging and progress tracking
- Account ID filtering for multi-tenant security

## Implementation Details

### **API Endpoints**

**POST** `/api/eden/news/sources/{sourceId}/refresh`
- **Purpose**: Create a source refresh job for a specific source
- **Security**: Requires account context and user authentication
- **Validation**: Verifies source exists and belongs to user's account
- **Response**: Returns job ID and status information

### **Job Worker Integration**

**Job Type**: `news_aggregation` (existing ENUM value)
- **Payload**: `{ sourceId, sourceName, singleSource: true }`
- **Priority**: 4 (high priority for user-initiated actions)
- **Processing**: Enhanced `processNewsAggregation()` method detects `singleSource` flag
- **Logging**: Job-specific logger with detailed progress tracking

### **Frontend Components**

**SourcesTab Enhancement**:
- Refresh button next to each source's enable/disable button
- Loading states with spinner animation
- Tooltip indicating source name for clarity
- Disabled state during refresh operations

**useSourceActions Hook**:
- `refreshSource(sourceId, sourceName)` method
- `isRefreshLoading(sourceId)` loading state checker
- `refreshLoadingMap` for tracking multiple concurrent refreshes
- Error handling and user feedback

## User Interface

### **Refresh Button**
- **Location**: Actions column in Sources table
- **Appearance**: Secondary variant button with RefreshCw icon
- **States**: 
  - Default: "Refresh" with refresh icon
  - Loading: "Refreshing..." with spinning loader
  - Disabled: When refresh is in progress
- **Tooltip**: Shows "Refresh articles from {source name}"

### **Visual Feedback**
- Button becomes disabled during refresh
- Loading spinner replaces refresh icon
- Button text changes to "Refreshing..."
- Sources list refreshes automatically after job completion

## Technical Flow

1. **User Clicks Refresh**: Button triggers `refreshSource(sourceId, sourceName)`
2. **API Request**: POST to source refresh endpoint with account context
3. **Job Creation**: Backend creates `news_aggregation` job with `singleSource: true` flag
4. **Job Processing**: Worker detects `singleSource` flag and processes single source only
5. **Database Updates**: Updates source last_checked timestamp
6. **UI Updates**: Loading states clear, sources list refreshes

## Benefits

### 🎯 **Targeted Testing**
- Test individual sources without running full aggregation
- Quickly identify problematic sources
- Verify new source configurations

### ⚡ **Responsive Operations**
- High priority ensures quick processing
- Non-blocking background job execution
- Real-time feedback for user actions

### 🔒 **Secure Multi-tenancy**
- Account-scoped source verification
- Proper permission checking
- Isolated job execution per account

### 📊 **Enhanced Monitoring**
- Detailed job logs for each refresh operation
- Source-specific performance tracking
- Clear audit trail for manual operations

## Usage Examples

### **Testing New Sources**
1. Add a new source via "Add Source" form
2. Use refresh button to immediately test content discovery
3. Check job logs for detailed processing information
4. Verify articles appear in Stories tab

### **Troubleshooting Sources**
1. Identify sources with low article counts
2. Use refresh button to test connectivity
3. Review job logs for error messages
4. Adjust source configuration if needed

### **Priority Content Updates**
1. Identify high-priority news sources
2. Use refresh button during breaking news periods
3. Ensure latest content is captured quickly
4. Generate content from fresh articles

## Security Considerations

- All refresh operations are scoped to user's account
- Source ownership verification before job creation  
- Job execution includes account ID for proper isolation
- Audit logging for all refresh operations

## Performance Impact

- Individual source refresh is lightweight compared to full aggregation
- High priority ensures timely processing
- Background job execution prevents UI blocking
- Minimal impact on overall system performance

## Troubleshooting

### **Database ENUM Constraint Issue (RESOLVED)**

**Problem**: `Data truncated for column 'job_type' at row 1`
- **Root Cause**: Database `job_type` column uses strict ENUM constraint
- **ENUM Values**: `('content_generation', 'full_cycle', 'news_aggregation', 'ai_analysis')`
- **Failed Attempts**: Custom job types like `'source_refresh'`, `'src_refresh'`, `'refresh'` were all rejected
- **Final Solution**: Use existing `'news_aggregation'` job type with `singleSource: true` flag
- **Impact**: No database schema changes required, leverages existing infrastructure

## Database Schema Requirements

The feature uses existing database structure with no modifications required:

**Jobs Table** (`ssnews_jobs`):
- `job_type` ENUM('content_generation', 'full_cycle', 'news_aggregation', 'ai_analysis') NOT NULL
- `account_id` column for multi-tenant isolation
- `payload` JSON column for job parameters including `singleSource` flag

**Sources Table** (`ssnews_news_sources`):
- `account_id` foreign key for account association
- `source_id` primary key referenced in job payload
- Standard source fields (name, url, rss_feed_url, etc.)

### **Key Design Decision**

Instead of adding a new ENUM value (which would require database migration), the feature cleverly reuses the existing `'news_aggregation'` job type and differentiates single source operations via the `singleSource: true` flag in the JSON payload. This approach:

- ✅ Requires no database schema changes
- ✅ Leverages existing job processing infrastructure  
- ✅ Maintains compatibility with existing news aggregation jobs
- ✅ Provides clear separation of concerns via payload flags

### **Database Compatibility**

**ENUM Constraint Solution**:
- Database `job_type` column uses ENUM: `('content_generation', 'full_cycle', 'news_aggregation', 'ai_analysis')`
- Source refresh uses existing `'news_aggregation'` value instead of custom type
- Differentiated by `singleSource: true` flag in job payload
- No database schema changes required 