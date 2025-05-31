
## Comprehensive Architecture Prompt for Multi-Tenant Organization System

### Project Context
You are working on "Simon's Says News" - a content generation system that aggregates news, analyzes it with AI, and generates content. The app currently has:
- News sources management
- Content generation (articles, social posts, video scripts)
- Prompt templates
- User bookmarks
- Job queue system
- Firebase authentication

### Architecture Requirement
Implement a **two-level multi-tenant architecture**:

```
Level 1: Organizations (e.g., "Eden Church Network")
  └── Level 2: Accounts (e.g., "Eden London", "Eden Manchester", "Eden Youth")
      └── All Data (sources, prompts, stories, settings, etc.)
```

### Key Requirements

1. **Data Isolation**
   - Each account has completely separate:
     - News sources
     - Prompt templates
     - Generated content
     - Settings
     - Jobs
   - No data sharing between accounts (even within same organization)

2. **User Access**
   - Users can belong to multiple organizations
   - Within each organization, users can access multiple accounts
   - Roles: owner, admin, member (per organization or per account - your choice)
   - User flow: Login → Select Organization → Select Account → Use App

3. **API Integration**
   - External API endpoint exists: `getV1UserByIdOrganisations`
   - Returns organizations user has access to
   - Need to integrate with this for organization list

4. **UI/UX Requirements**
   - Account switcher in top-left corner showing: "Org Name / Account Name"
   - Seamless switching without page reload
   - Remember last selected account per user

5. **Database Constraints**
   - Already have these tables without any organization/account fields:
     - ssnews_news_sources
     - ssnews_scraped_articles
     - ssnews_generated_articles
     - ssnews_prompt_templates
     - ssnews_user_bookmarks
     - ssnews_jobs
     - ssnews_evergreen_content_ideas
     - etc.

6. **Technical Stack**
   - Backend: Node.js/Express
   - Frontend: React with Vite
   - Database: MySQL
   - Auth: Firebase

### Implementation Priorities

1. **Phase 1**: Database schema and migrations
2. **Phase 2**: Backend middleware and API updates
3. **Phase 3**: Frontend context and components
4. **Phase 4**: Testing and migration of existing data

### Special Considerations

- System should work with a default organization/account for backward compatibility
- All existing API endpoints need to be account-aware
- Job processing should be account-scoped
- Consider performance implications of filtering everything by account_id

### Questions to Answer Before Implementation

1. Should roles be at organization level, account level, or both?
2. Should there be any shared resources between accounts (e.g., prompt templates)?
3. How should the default account be handled for new users?
4. Should job workers process all accounts or be account-specific?

### Expected Deliverables

1. Database migration scripts
2. Middleware for account context extraction
3. Updated API endpoints with account filtering
4. Frontend AccountContext and switcher component
5. Documentation of the new architecture

---

**With this prompt, the implementation would have been much cleaner from the start, with proper naming conventions (organizations/accounts instead of just organizations) and a clear two-level hierarchy throughout the system.**
