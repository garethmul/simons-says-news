# Ideogram.ai Integration

## Overview

The Ideogram.ai integration allows users to generate custom AI images directly within the content review system. This feature works alongside the existing Pexels stock photography sourcing to provide comprehensive image options for Christian content.

## Features

### Custom Image Generation
- **AI-Powered Prompts**: Generate images from text descriptions using Ideogram's advanced AI
- **Christian Content Optimization**: Built-in guidelines to avoid inappropriate religious imagery
- **Multiple Styles**: Support for realistic, design, 3D render, anime, and auto styles
- **Flexible Aspect Ratios**: Square, landscape, portrait, and banner formats
- **Magic Prompt Enhancement**: Automatic prompt optimization for better results

### Smart Prompting
- **Auto-Generated Christian Prompts**: AI creates appropriate prompts based on article content
- **Manual Custom Prompts**: Full control over image description
- **Content-Aware Suggestions**: Prompts tailored to article themes (prayer, faith, community, etc.)
- **Negative Prompts**: Automatic exclusion of inappropriate religious symbols

## Usage

### In Content Review Modal

1. **Open Images Tab**: Navigate to the Images tab in the content review modal
2. **Generate Custom Image**: Click "Create Custom Image" button
3. **Choose Prompt Type**:
   - Enable "Use AI-generated Christian theme prompt" for automatic prompts
   - Disable for manual custom prompts
4. **Configure Options**:
   - **Aspect Ratio**: Choose from 7 predefined ratios
   - **Style**: Select from 6 different artistic styles
   - **Prompt Enhancement**: Auto, always on, or off
5. **Generate**: Click "Generate Image" to create the image
6. **Integration**: Generated images are automatically uploaded to Sirv CDN and added to content

### API Endpoints

#### Generate Custom Image
```
POST /api/eden/images/generate
```

#### Generate Image for Specific Content
```
POST /api/eden/images/generate-for-content/:contentId
```

#### Get Generation Options
```
GET /api/eden/images/ideogram/options
```

## Technical Implementation

### Backend Services
- **Image Service**: Extended with Ideogram API integration
- **Database**: Updated schema to support 'ideogram' as image source
- **Processing Pipeline**: Automatic Sirv CDN upload and storage

### Frontend Components
- **IdeogramImageGenerator**: Custom image generation form
- **Enhanced Images Tab**: Integrated generation interface
- **Visual Indicators**: AI-generated images marked with purple wand icon

### Database Changes
- Updated `ssnews_image_assets.source_api` enum to include 'ideogram'
- Automatic migration script included in schema updates

## Configuration

### Environment Variables
Add to `.env` file:
```
IDEOGRAM_API_KEY=your_ideogram_api_key_here
```

### Heroku Deployment
The `scripts/setup-heroku-production.js` script automatically syncs the Ideogram API key to Heroku config vars.

## Content Guidelines

### Approved Content
- Warm, hopeful imagery with natural lighting
- Diverse people in prayer, study, or fellowship
- Open Bibles and peaceful study settings
- Nature scenes representing hope and faith
- Community gatherings and family moments

### Avoided Content
- Jesus' face or physical depictions
- Crucifixes or prominent crosses
- Mystical symbols or occult imagery
- Overly Catholic iconography
- Abstract religious symbols

## Benefits

1. **Content Customization**: Create images perfectly matched to article content
2. **Brand Consistency**: Maintain Eden's warm, hopeful visual style
3. **Cost Efficiency**: Reduce dependency on stock photography for unique content
4. **Speed**: Generate custom images in seconds rather than searching stock libraries
5. **Quality**: High-resolution, professional-quality AI-generated images
6. **Integration**: Seamless workflow within existing content review process

## Future Enhancements

- **Style Templates**: Pre-configured style combinations for different content types
- **Batch Generation**: Generate multiple variations simultaneously
- **Image Editing**: Basic editing tools for generated images
- **Template Library**: Save and reuse successful prompt templates
- **A/B Testing**: Generate multiple options for comparison

## Support

For issues with Ideogram integration:
1. Check API key configuration in environment variables
2. Verify account has sufficient Ideogram API credits
3. Review server logs for detailed error messages
4. Ensure content exists and belongs to current account context 