# Prompt Template System Analysis

## Overview

The application uses a sophisticated, multi-tenant prompt template system that enables dynamic content generation workflows with chaining capabilities. The system supports versioning, account isolation, and extensible content types. OK.

## Core Architecture

### Database Schema

The prompt system is built on three core tables:

#### 1. `ssnews_prompt_templates`
```sql
CREATE TABLE ssnews_prompt_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL,           -- Multi-tenant isolation
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category ENUM(...) NOT NULL,               -- Content type categorization
    execution_order INT DEFAULT 999,           -- Workflow sequencing
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE KEY unique_name_per_account (account_id, name)
);
```

#### 2. `ssnews_prompt_versions`
```sql
CREATE TABLE ssnews_prompt_versions (
    version_id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    version_number INT NOT NULL,
    prompt_content TEXT NOT NULL,              -- The actual prompt text
    system_message TEXT,                       -- AI system instructions
    parameters JSON,                           -- Additional config
    created_by VARCHAR(255),
    is_current BOOLEAN DEFAULT FALSE,          -- Version management
    notes TEXT,
    UNIQUE KEY unique_template_version (template_id, version_number)
);
```

#### 3. `ssnews_content_generation_log`
```sql
CREATE TABLE ssnews_content_generation_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    generated_article_id INT,
    template_id INT NOT NULL,
    version_id INT NOT NULL,
    ai_service ENUM('openai', 'gemini') NOT NULL,
    model_used VARCHAR(100),
    tokens_used INT,
    generation_time_ms INT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP
);
```

## Content Generation Workflow

### Initiation Process

Content generation is triggered through several entry points:

1. **Automated Story Processing**: `ContentGenerator.generateContentFromTopStories()`
2. **Manual Generation**: Via API endpoints
3. **Evergreen Content**: `ContentGenerator.generateEvergreenContent()`

### Requirements for Generation

To start content generation, the system requires:

1. **Account Context**: A valid `accountId` for multi-tenant isolation
2. **Source Material**: Either:
   - A scraped news article with analysis data
   - An evergreen content idea
   - Manual article input
3. **Active Templates**: At least one active prompt template in the account
4. **AI Service Access**: Configured Gemini or OpenAI API keys

### Workflow Execution

The system executes templates in a sophisticated workflow:

```javascript
// 1. Retrieve ordered workflow steps
const workflowSteps = await promptManager.getWorkflowPrompts(accountId, {
  article_content: `Title: ${article.title}\n\nContent: ${article.full_text}...`
});

// 2. Execute steps sequentially with chaining
for (const step of workflowSteps) {
  // Generate content with variable substitution
  const aiContent = await this.generateAIContentFromTemplateWithWorkflow(
    step, 
    stepOutputs,  // Previous step outputs
    blogId,
    accountId
  );
  
  // Parse based on content type
  const structuredData = this.parseContentToSchema(aiContent, config.storage_schema, step.category);
  
  // Store in database
  const contentId = await this.storeGenericContent(blogId, step.category, structuredData, config.generation_config, accountId);
  
  // Extract output for next step
  const outputContent = this.extractOutputForChaining(structuredData, step.category);
  stepOutputs[`${step.category}_output`] = outputContent;
}
```

## Content Types and Categories

### Supported Categories

The system supports these predefined categories:

```sql
ENUM('blog_post', 'social_media', 'video_script', 'analysis', 'prayer', 
     'image_generation', 'devotional', 'newsletter', 'sermon')
```

### Content Type Handling

Each content type has specialized handling:

#### 1. **Text-Based Content** (`blog_post`, `devotional`, `newsletter`, `sermon`)
- **Input**: Article content + template variables
- **Processing**: Direct AI generation with prompt templates
- **Output**: Structured text content
- **Parsing**: Generic text parsing with fallbacks

#### 2. **Social Media Content** (`social_media`)
- **Input**: Article + platform-specific requirements
- **Processing**: JSON-structured generation for multiple platforms
- **Output**: Platform-specific posts with hashtags
- **Parsing**: Specialized JSON parser with platform extraction

```javascript
parseSocialMediaContent(content) {
  try {
    const parsed = JSON.parse(content);
    const platforms = ['facebook', 'instagram', 'linkedin', 'twitter'];
    const socialPosts = [];
    
    platforms.forEach((platform, index) => {
      if (parsed[platform]) {
        socialPosts.push({
          platform,
          text: parsed[platform].text || parsed[platform],
          hashtags: parsed[platform].hashtags || [],
          order_number: index + 1
        });
      }
    });
    return socialPosts;
  } catch (error) {
    // Fallback to generic posts
    return [{ platform: 'general', text: content.substring(0, 300) }];
  }
}
```

#### 3. **Video Scripts** (`video_script`)
- **Input**: Article + duration parameters
- **Processing**: Script generation with visual suggestions
- **Output**: Structured script with timing and visuals
- **Parsing**: JSON with script, duration, and visual cues

```javascript
parseVideoScriptContent(content) {
  try {
    const parsed = JSON.parse(content);
    return [{
      title: parsed.title || 'Video Script',
      script: parsed.script || content,
      duration: parsed.duration || 60,
      visual_suggestions: parsed.visualSuggestions || [],
      order_number: 1
    }];
  } catch (error) {
    // Fallback structure
  }
}
```

#### 4. **Prayer Points** (`prayer`)
- **Input**: Article content + spiritual themes
- **Processing**: Thematic prayer generation
- **Output**: Multiple prayer points with themes
- **Parsing**: Line-based parsing with theme extraction

```javascript
parsePrayerPointsContent(content) {
  const prayerPoints = [];
  const lines = content.split('\n\n').filter(line => line.trim().length > 0);
  
  lines.forEach((line, index) => {
    const cleanLine = line.trim();
    if (cleanLine.length > 10) {
      prayerPoints.push({
        order_number: index + 1,
        prayer_text: cleanLine,
        theme: this.extractThemeFromPrayer(cleanLine)
      });
    }
  });
  return prayerPoints;
}
```

#### 5. **Image Generation** (`image_generation`)
- **Input**: Article content + visual requirements
- **Processing**: Two-step process:
  1. AI generates image prompts using template
  2. Ideogram API creates actual images
- **Output**: Generated images with metadata
- **Parsing**: Specialized prompt extraction and image processing

```javascript
// Special handling in generateGenericContentWithPrompt
if (category === 'image_generation') {
  // First, use the template to generate a proper image prompt
  const visualDescription = await this.generateWithPrompt(prompt, systemMessage, category, generatedArticleId);
  
  // Then use that description to generate the actual image with Ideogram
  return await this.generateImageWithIdeogram(visualDescription, generatedArticleId);
}
```

## Variable System and Chaining

### Variable Substitution

The system supports dynamic variable substitution in prompts:

```javascript
// Base variables always available
const stepOutputs = {
  article_content: `Title: ${article.title}\n\nContent: ${article.full_text}...`
};

// Variables are substituted using placeholder syntax
for (const [key, value] of Object.entries(variables)) {
  const placeholder = `{${key}}`;
  prompt = prompt.replace(new RegExp(placeholder, 'g'), value || '');
}
```

### Workflow Chaining

Templates can use outputs from previous steps:

```javascript
// After each step, output is extracted and made available
const outputContent = this.extractOutputForChaining(structuredData, step.category);
stepOutputs[`${step.category}_output`] = outputContent;

// Available in subsequent templates as {category_output}
// Example: {prayer_points_output}, {social_media_output}
```

### Output Extraction by Type

Different content types extract different outputs for chaining:

```javascript
extractOutputForChaining(structuredData, category) {
  switch (category) {
    case 'prayer_points':
      return structuredData.map(item => item.prayer_text || item.text || '').join('\n\n');
    
    case 'social_media':
      return structuredData.map(item => `${item.platform || 'Social'}: ${item.text || ''}`).join('\n\n');
    
    case 'video_script':
      return structuredData.map(item => item.script || item.text || '').join('\n\n');
    
    case 'image_generation':
      return structuredData.map(item => item.text || item.content || item.prompt || JSON.stringify(item)).join('\n\n');
    
    default:
      return structuredData.map(item => 
        item.text || item.content || item.script || item.prayer_text || JSON.stringify(item)
      ).join('\n\n');
  }
}
```

## Multiple Items and Objects Support

### Multi-Item Generation

Templates can request multiple items through:

1. **Structured JSON Output**: Templates can specify arrays
2. **Parsing Logic**: Content parsers handle multiple items
3. **Order Management**: Items are automatically numbered

Example for prayer points:
```javascript
// Template generates multiple prayer points
// Parser splits by double newlines and creates array
const lines = content.split('\n\n').filter(line => line.trim().length > 0);
lines.forEach((line, index) => {
  prayerPoints.push({
    order_number: index + 1,
    prayer_text: cleanLine,
    theme: this.extractThemeFromPrayer(cleanLine)
  });
});
```

### Platform-Specific Objects

Social media templates generate platform-specific objects:
```json
{
  "facebook": {
    "text": "Inspiring post text...",
    "hashtags": ["#faith", "#hope"]
  },
  "instagram": {
    "text": "Visual story...",
    "hashtags": ["#blessed", "#christian"]
  },
  "linkedin": {
    "text": "Professional insight...",
    "hashtags": ["#leadership", "#values"]
  }
}
```

## Hardcoded vs Template-Based Elements

### Current State

**Mostly Template-Based**: The system has largely moved away from hardcoded prompts to a flexible template system.

**Legacy Hardcoded Elements** (being phased out):
- Some fallback prompts in aiService.js
- Image generation search queries
- Alt text generation prompts

**Template-Based Elements**:
- All primary content generation
- Workflow orchestration
- Variable substitution
- Multi-step chaining

### Template Examples

Default templates are seeded during setup:

```sql
INSERT INTO ssnews_prompt_templates (name, description, category) VALUES
('Blog Post Generator', 'Generates engaging blog posts from news articles', 'blog_post'),
('Social Media Post', 'Creates social media content for various platforms', 'social_media'),
('Video Script Creator', 'Generates video scripts for different durations', 'video_script'),
('Prayer Points Generator', 'Creates prayer points based on news articles', 'prayer'),
('Image Search Query Generator', 'Generates search queries for relevant images', 'image_generation');
```

## Advanced Features

### Version Management

Templates support full version control:
- Multiple versions per template
- Current version designation
- Version history tracking
- Usage statistics per version

### Multi-Tenant Isolation

The system provides complete account isolation:
- Templates are account-specific
- No cross-account access
- Separate workflows per account
- Account-filtered queries throughout

### Execution Ordering

Templates can be ordered for workflow execution:
```javascript
const orderedTemplates = templates
  .filter(t => t.is_active)
  .sort((a, b) => (a.execution_order || 999) - (b.execution_order || 999));
```

### Error Handling and Fallbacks

The system includes comprehensive error handling:
- Template-level fallbacks
- Content parsing fallbacks
- Graceful degradation
- Error logging and tracking

## Extension Points

### Adding New Content Types

1. **Database**: Add new category to ENUM
2. **Parser**: Create specialized parser function
3. **AI Service**: Add generation method if needed
4. **Frontend**: Add UI components for new type

### Custom Variable Sources

Variables can come from:
- Article content (automatic)
- Previous step outputs (chaining)
- External APIs (extensible)
- User input (manual generation)

### Advanced Workflow Features

Future extensions could include:
- Conditional branching
- Parallel execution
- Dynamic template selection
- A/B testing frameworks
- Performance optimization

## Security and Performance

### Security Measures

- Account-based access control
- SQL injection prevention
- Template validation
- Output sanitization

### Performance Optimizations

- Template caching
- Connection pooling
- Batch processing
- Async execution
- Error recovery

## Conclusion

The prompt template system provides a flexible, extensible foundation for AI content generation with sophisticated workflow management, multi-tenant isolation, and comprehensive content type support. The system successfully balances power and simplicity while maintaining security and performance standards.
