# Ideogram V3 Jobs App - Specification Document

## Overview

This specification outlines the requirements for building a new application that focuses exclusively on Ideogram V3 API for image generation, built around a job-based system with configurable default settings per job type and user override capabilities.

## Core Concept

- **Jobs**: Discrete image generation tasks with specific purposes
- **Default Settings**: Pre-configured Ideogram V3 parameters per job type  
- **User Overrides**: Ability for users to modify settings for individual job executions
- **Database Integration**: Full integration with existing c360req database structure

## Technical Architecture

### Database Structure (Existing c360req Schema)

The app will leverage these existing tables:

#### Job Management
- `ssnews_jobs` - Core job queue with account isolation
- `ssnews_system_logs` - Job execution logging and debugging
- `ssnews_accounts` - Multi-tenant account management
- `ssnews_organizations` - Organisation-level settings

#### Configuration Management
- `ssnews_prompt_configuration` - Stores job type configurations
- `ssnews_image_assets` - Generated image storage with metadata
- `ssnews_generated_content` - Links content to generation jobs

#### Image Asset Management
- `ssnews_image_assets` - Image storage with Sirv CDN integration
- Source API enum already includes 'ideogram'

### New Database Additions Required

```sql
-- Job Type Configurations Table
CREATE TABLE IF NOT EXISTS ssnews_job_configurations (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL,
    job_type_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    default_settings JSON NOT NULL,
    ui_schema JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    execution_order INT DEFAULT 999,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account_job_type (account_id, job_type_name),
    INDEX idx_active (is_active),
    UNIQUE KEY unique_account_job_type (account_id, job_type_name)
);

-- Job Execution Settings Table
CREATE TABLE IF NOT EXISTS ssnews_job_execution_settings (
    execution_id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    config_id INT NOT NULL,
    user_overrides JSON,
    final_settings JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES ssnews_jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES ssnews_job_configurations(config_id) ON DELETE CASCADE,
    INDEX idx_job_id (job_id),
    INDEX idx_config_id (config_id)
);
```

## Ideogram V3 API Integration

### Supported Features (V3 Only)
Based on the existing implementation, focus exclusively on:

- **Endpoint**: `https://api.ideogram.ai/v1/ideogram-v3/generate`
- **Content Type**: `multipart/form-data`
- **Max Images**: 8 per generation
- **Enhanced Capabilities**: Better quality, more aspect ratios, improved style codes

### V3 Core Styles
```javascript
const IDEOGRAM_V3_STYLES = [
  { value: 'AUTO', label: 'Auto (AI Decides)', category: 'intelligent' },
  { value: 'GENERAL', label: 'General', category: 'artistic' },
  { value: 'REALISTIC', label: 'Realistic', category: 'photographic' },
  { value: 'DESIGN', label: 'Design', category: 'commercial' }
];
```

### V3 Enhanced Features
- **Reference Style Images**: Up to 3 images as style basis
- **Style Codes**: 8-character codes from previous generations
- **Random Style**: AI-generated style with reusable codes
- **Enhanced Aspect Ratios**: More options than legacy versions
- **Color Palette**: Advanced colour control
- **Magic Prompt**: Enhanced prompt optimisation

## Job Types to Implement

### 1. Product Marketing Images
**Purpose**: Generate product promotional images
**Default Settings**:
```json
{
  "styleType": "DESIGN",
  "aspectRatio": "16:9",
  "magicPrompt": "ON",
  "renderingSpeed": "DEFAULT",
  "numImages": 4,
  "colorPalette": {
    "members": ["#1B365D", "#FFFFFF", "#F4F4F4"]
  },
  "negativePrompt": "low quality, blurry, text, watermark"
}
```

### 2. Social Media Content
**Purpose**: Generate social media graphics
**Default Settings**:
```json
{
  "styleType": "DESIGN",
  "aspectRatio": "1:1",
  "magicPrompt": "AUTO",
  "renderingSpeed": "FAST",
  "numImages": 3,
  "styleCodes": [],
  "negativePrompt": "text, watermark, copyright"
}
```

### 3. Blog Header Images
**Purpose**: Generate blog article headers
**Default Settings**:
```json
{
  "styleType": "GENERAL",
  "aspectRatio": "16:9",
  "magicPrompt": "ON",
  "renderingSpeed": "DEFAULT",
  "numImages": 2,
  "negativePrompt": "people, faces, text"
}
```

### 4. Concept Illustrations
**Purpose**: Generate abstract concept visuals
**Default Settings**:
```json
{
  "styleType": "GENERAL",
  "aspectRatio": "4:3",
  "magicPrompt": "AUTO",
  "renderingSpeed": "SLOW",
  "numImages": 1,
  "styleCodes": [],
  "negativePrompt": "realistic, photographic, people"
}
```

### 5. Christian Content Images
**Purpose**: Generate appropriate Christian imagery (from existing implementation)
**Default Settings**:
```json
{
  "styleType": "REALISTIC",
  "aspectRatio": "16:9",
  "magicPrompt": "ON",
  "renderingSpeed": "DEFAULT",
  "numImages": 2,
  "negativePrompt": "Jesus face, crucifixes, catholic iconography, mystical symbols",
  "colorPalette": {
    "members": ["#8B4513", "#F5DEB3", "#87CEEB"]
  }
}
```

## API Endpoint Structure

### Core Endpoints

#### 1. Job Configuration Management
```
GET /api/jobs/configurations
POST /api/jobs/configurations
PUT /api/jobs/configurations/:configId
DELETE /api/jobs/configurations/:configId
```

#### 2. Job Execution
```
POST /api/jobs/execute
GET /api/jobs/:jobId/status
GET /api/jobs/:jobId/results
POST /api/jobs/:jobId/retry
```

#### 3. Settings Management
```
GET /api/jobs/configurations/:configId/settings
POST /api/jobs/configurations/:configId/settings/override
GET /api/jobs/configurations/:configId/ui-schema
```

#### 4. Image Generation (V3 Only)
```
POST /api/ideogram/v3/generate
POST /api/ideogram/v3/generate-with-overrides
GET /api/ideogram/v3/styles
GET /api/ideogram/v3/options
```

## Frontend Components

### 1. Job Configuration Manager
```jsx
// Components/JobConfigManager.jsx
- Job type creation/editing
- Default settings configuration
- UI schema builder for user overrides
- Bulk operations for job types
```

### 2. Job Execution Interface
```jsx
// Components/JobExecutor.jsx
- Job type selection
- Settings override form (dynamic based on UI schema)
- Real-time generation progress
- Results preview and management
```

### 3. Settings Override Form
```jsx
// Components/SettingsOverride.jsx
- Dynamic form based on job configuration UI schema
- Live preview of setting changes
- Validation and error handling
- Reset to defaults functionality
```

### 4. Generated Images Manager
```jsx
// Components/GeneratedImagesManager.jsx
- Image gallery with filtering
- Bulk download/export
- Regeneration with same/modified settings
- Sirv CDN integration for storage
```

## Implementation Steps

### Phase 1: Database Setup
1. **Create new tables** for job configurations and execution settings
2. **Migrate existing** Ideogram integration to V3-only
3. **Seed default job types** with configurations
4. **Test database** integrity and relationships

### Phase 2: Backend API Development
1. **Job configuration CRUD** operations
2. **Ideogram V3 service** (strip out v1/v2/v2a support)
3. **Job execution engine** with settings override
4. **Image processing pipeline** integration

### Phase 3: Frontend Development
1. **Job configuration interface** for admins
2. **Job execution interface** for users
3. **Settings override forms** (dynamic)
4. **Results management** and export tools

### Phase 4: Integration & Testing
1. **Account isolation** testing
2. **Multi-tenant configuration** validation
3. **Performance optimisation** for job queue
4. **Error handling** and retry mechanisms

## Configuration Examples

### Job Configuration Schema
```json
{
  "job_type_name": "product_marketing",
  "display_name": "Product Marketing Images",
  "description": "Generate promotional images for product marketing",
  "default_settings": {
    "styleType": "DESIGN",
    "aspectRatio": "16:9",
    "magicPrompt": "ON",
    "renderingSpeed": "DEFAULT",
    "numImages": 4,
    "colorPalette": {
      "members": ["#1B365D", "#FFFFFF", "#F4F4F4"]
    },
    "negativePrompt": "low quality, blurry, text, watermark"
  },
  "ui_schema": {
    "fields": [
      {
        "name": "prompt",
        "type": "textarea",
        "label": "Image Description",
        "required": true,
        "placeholder": "Describe the product marketing image you want to generate..."
      },
      {
        "name": "styleType", 
        "type": "select",
        "label": "Style Type",
        "options": ["AUTO", "GENERAL", "REALISTIC", "DESIGN"],
        "default": "DESIGN"
      },
      {
        "name": "aspectRatio",
        "type": "select", 
        "label": "Aspect Ratio",
        "options": ["1:1", "16:9", "9:16", "4:3", "3:4"],
        "default": "16:9"
      },
      {
        "name": "numImages",
        "type": "slider",
        "label": "Number of Images",
        "min": 1,
        "max": 8,
        "default": 4
      }
    ]
  }
}
```

### User Override Example
```json
{
  "job_id": 12345,
  "user_overrides": {
    "aspectRatio": "1:1",
    "numImages": 2,
    "styleType": "REALISTIC",
    "customPromptAddition": "with modern minimalist design"
  },
  "final_settings": {
    "styleType": "REALISTIC",
    "aspectRatio": "1:1", 
    "magicPrompt": "ON",
    "renderingSpeed": "DEFAULT",
    "numImages": 2,
    "colorPalette": {
      "members": ["#1B365D", "#FFFFFF", "#F4F4F4"]
    },
    "negativePrompt": "low quality, blurry, text, watermark"
  }
}
```

## Security & Performance Considerations

### Security
- **Account isolation**: All jobs scoped to account_id
- **API key management**: Secure Ideogram API key storage
- **Rate limiting**: Per-account generation limits
- **Input validation**: Sanitise all user inputs and overrides

### Performance
- **Job queue**: Background processing with priority
- **Caching**: Cache job configurations and UI schemas
- **CDN integration**: Sirv CDN for image delivery
- **Database optimisation**: Proper indexing for job queries

### Monitoring
- **Job execution logs**: Detailed logging in ssnews_system_logs
- **Generation metrics**: Track success rates and timing
- **Error tracking**: Structured error handling and reporting
- **Usage analytics**: Per-account generation statistics

## Migration from Existing System

### Code Reuse
- **ImageService.js**: Extract V3-only functionality
- **Database schemas**: Extend existing multi-tenant structure
- **Sirv integration**: Reuse CDN upload functionality
- **Account management**: Leverage existing authentication

### Deprecation Plan
- **V1/V2 support**: Remove legacy API versions
- **Simplified configuration**: Focus on job-based settings
- **Streamlined UI**: Purpose-built for job execution

## Testing Strategy

### Unit Tests
- Job configuration CRUD operations
- Settings override merging logic
- Ideogram V3 API integration
- Database schema validation

### Integration Tests  
- End-to-end job execution flow
- Multi-tenant account isolation
- Image generation and storage pipeline
- Error handling and retry mechanisms

### Load Testing
- Concurrent job execution
- Database performance under load
- Ideogram API rate limiting
- Sirv CDN integration performance

## Deployment Considerations

### Environment Variables
```bash
# Ideogram API (V3 only)
IDEOGRAM_API_KEY=your_v3_api_key

# Database
DATABASE_URL=mysql://...
C360REQ_DATABASE_URL=mysql://...

# Sirv CDN
SIRV_CLIENT_ID=your_sirv_client_id
SIRV_CLIENT_SECRET=your_sirv_client_secret
SIRV_PUBLIC_URL=https://your-account.sirv.com

# Job Processing
MAX_CONCURRENT_JOBS=5
JOB_TIMEOUT_SECONDS=300
RETRY_MAX_ATTEMPTS=3
```

### Heroku Configuration
- **Worker dynos**: For job processing
- **Database**: MySQL add-on with sufficient connections
- **Redis**: For job queue (if implementing background processing)

This specification provides a comprehensive blueprint for building a focused, job-based Ideogram V3 application that leverages your existing database infrastructure while providing flexible configuration management and user override capabilities. 