# Development Standards & Quality Assurance Protocol

## Overview
This document establishes mandatory checks and procedures to prevent incomplete implementations and ensure reliable code delivery.

## The Problem
Repeated pattern of "Perfect!" declarations followed by:
- Missing API endpoint implementations
- Incorrect method calls to non-existent functions
- Missing required headers/authentication
- Untested integration points
- Database schema mismatches

## Mandatory Pre-Implementation Checklist

### 1. **API Integration Requirements**
Before implementing any new API functionality:

- [ ] **Verify endpoint exists** - Search codebase for existing endpoint
- [ ] **Check middleware requirements** - Confirm authentication/account context needs
- [ ] **Validate request format** - Ensure headers, body, and parameters match expectations
- [ ] **Test with existing patterns** - Copy working examples of similar API calls

**Example Check:**
```bash
# Before implementing new API call, verify endpoint exists:
grep -r "submit-urls" src/
grep -r "withAccountContext" src/components/
```

### 2. **Method Existence Verification**
Before calling any service methods:

- [ ] **Verify method exists** - Check the actual service file
- [ ] **Confirm method signature** - Check parameters and return values
- [ ] **Test return value structure** - Ensure calling code handles response correctly

**Example Check:**
```bash
# Before calling newsAggregator.analyzeArticle():
grep -r "analyzeArticle" src/services/
# Result: Method doesn't exist, use aiService.analyzeArticle() instead
```

### 3. **Database Integration Standards**
For any database operations:

- [ ] **Verify table/column names** - Check actual schema
- [ ] **Confirm account filtering** - Ensure multi-tenant isolation
- [ ] **Test with existing data** - Don't assume empty tables
- [ ] **Handle constraint violations** - Account for unique indexes, etc.

### 4. **Frontend-Backend Integration**
For new features spanning frontend and backend:

- [ ] **Implement backend first** - Create and test API endpoint
- [ ] **Test with curl/Postman** - Verify endpoint works independently  
- [ ] **Implement frontend** - Use existing patterns for API calls
- [ ] **Test end-to-end** - Verify complete user flow

## Implementation Protocol

### Phase 1: Analysis & Planning
1. **Identify Dependencies**
   - List all services, endpoints, and methods required
   - Verify each dependency exists
   - Document any missing pieces

2. **Review Existing Patterns**
   - Find similar working functionality
   - Copy proven approaches
   - Don't reinvent working solutions

### Phase 2: Backend Implementation
1. **Create API Endpoint**
   - Follow existing middleware patterns
   - Use proper account context
   - Include comprehensive error handling

2. **Test Independently**
   ```bash
   curl -X POST http://localhost:3607/api/endpoint \
     -H "Content-Type: application/json" \
     -H "x-account-id: test-account" \
     -H "x-user-id: test-user" \
     -d '{"test": "data"}'
   ```

3. **Verify Database Operations**
   - Test with real data
   - Confirm account isolation
   - Check constraint handling

### Phase 3: Frontend Implementation
1. **Use Established Patterns**
   ```javascript
   // Always use withAccountContext for API calls
   const { withAccountContext } = useAccount();
   const response = await fetch('/api/endpoint', withAccountContext({
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(data)
   }));
   ```

2. **Handle All Response States**
   - Success responses
   - Error responses  
   - Network failures
   - Loading states

### Phase 4: Integration Testing
1. **End-to-End Testing**
   - Test complete user workflow
   - Verify data persistence
   - Check account isolation

2. **Error Scenarios**
   - Invalid inputs
   - Network failures
   - Permission errors
   - Resource conflicts

## Quality Gates

### Before Claiming "Complete"
- [ ] **All dependencies verified** - No calls to non-existent methods
- [ ] **API tested independently** - Backend works without frontend
- [ ] **Frontend tested with real backend** - No mock/hardcoded data
- [ ] **Error handling implemented** - Graceful failure modes
- [ ] **Account isolation verified** - Multi-tenant data separation works

### Communication Standards
Instead of "Perfect!" or "Complete!", use:
- "Backend implemented and tested"
- "Frontend connected, needs testing"
- "Implementation complete, requires user testing"
- "Known limitations: [specific issues]"

## Debugging Protocol

### When Issues Arise
1. **Check Browser Network Tab**
   - Verify request format
   - Check response codes
   - Examine headers

2. **Check Server Logs**
   - Look for specific error messages
   - Verify middleware execution
   - Check database queries

3. **Verify Account Context**
   ```bash
   # Check if headers are being sent:
   grep -r "x-account-id" src/
   grep -r "withAccountContext" src/
   ```

## Examples of Good Implementation

### ✅ Correct API Call Pattern
```javascript
// Good: Uses established pattern
const { withAccountContext } = useAccount();
const response = await fetch('/api/eden/content/generate', withAccountContext({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ limit: 5 })
}));
```

### ❌ Incorrect Pattern  
```javascript
// Bad: Manual header management
const response = await fetch('/api/eden/content/generate', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-account-id': selectedAccount?.id  // Wrong property, missing x-user-id
  },
  body: JSON.stringify({ accountId: selectedAccount?.id, limit: 5 })
});
```

### ✅ Correct Service Method Usage
```javascript
// Good: Verify method exists first
// grep -r "analyzeArticle" src/services/ shows it's in aiService
const result = await aiService.analyzeArticle(article);
if (result) {
  await db.update('table', {
    summary_ai: result.summary,
    keywords_ai: result.keywords,
    relevance_score: result.relevanceScore
  }, 'id = ?', [id]);
}
```

### ❌ Incorrect Method Usage
```javascript
// Bad: Calling non-existent method
const result = await newsAggregator.analyzeArticle(article); // Method doesn't exist
```

## Accountability Measures

### Before Implementation
- Document all dependencies and verify they exist
- Create simple test plan
- Identify potential failure points

### During Implementation  
- Test each component independently
- Verify integration points work
- Check error handling

### Before Declaring Complete
- Run through complete user workflow
- Test error scenarios
- Verify data persistence and account isolation

This protocol ensures reliable implementations and prevents the cycle of incomplete features requiring multiple fixes. 