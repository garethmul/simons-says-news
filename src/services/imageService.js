import axios from 'axios';
import db from './database.js'; // Import database service

class ImageService {
  constructor() {
    this.pexelsApiKey = process.env.PEXELS_API_KEY;
    this.ideogramApiKey = process.env.IDEOGRAM_API_KEY;
    this.sirvClientId = process.env.SIRV_CLIENT_ID;
    this.sirvClientSecret = process.env.SIRV_CLIENT_SECRET;
    this.sirvPublicUrl = process.env.SIRV_PUBLIC_URL;
    
    this.sirvToken = null;
    this.sirvTokenExpiry = null;

    this.axiosConfig = {
      timeout: 30000,
      headers: {
        'User-Agent': 'Eden Content Bot 1.0 (https://eden.co.uk)'
      }
    };
  }

  async searchPexelsImages(query, perPage = 5) {
    console.log(`🔍 Searching Pexels for: "${query}"`);
    
    try {
      if (!this.pexelsApiKey) {
        throw new Error('Pexels API key not configured');
      }

      const response = await axios.get('https://api.pexels.com/v1/search', {
        ...this.axiosConfig,
        headers: {
          ...this.axiosConfig.headers,
          'Authorization': this.pexelsApiKey
        },
        params: {
          query,
          per_page: perPage,
          orientation: 'landscape',
          size: 'large'
        }
      });

      const images = response.data.photos.map(photo => ({
        id: photo.id,
        url: photo.url,
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        src: {
          original: photo.src.original,
          large: photo.src.large,
          medium: photo.src.medium,
          small: photo.src.small
        },
        alt: photo.alt || query,
        width: photo.width,
        height: photo.height
      }));

      console.log(`✅ Found ${images.length} images for "${query}"`);
      return images;
    } catch (error) {
      console.error(`❌ Pexels search failed for "${query}":`, error.message);
      return [];
    }
  }

  async getSirvToken() {
    // Check if we have a valid token
    if (this.sirvToken && this.sirvTokenExpiry && Date.now() < this.sirvTokenExpiry) {
      return this.sirvToken;
    }

    console.log('🔑 Getting Sirv authentication token...');

    try {
      if (!this.sirvClientId || !this.sirvClientSecret) {
        throw new Error('Sirv credentials not configured');
      }

      const response = await axios.post('https://api.sirv.com/v2/token', {
        clientId: this.sirvClientId,
        clientSecret: this.sirvClientSecret
      }, this.axiosConfig);

      this.sirvToken = response.data.token;
      this.sirvTokenExpiry = Date.now() + (response.data.expiresIn * 1000) - 60000; // 1 minute buffer

      console.log('✅ Sirv token obtained');
      return this.sirvToken;
    } catch (error) {
      console.error('❌ Sirv authentication failed:', error.message);
      throw error;
    }
  }

  async uploadToSirv(imageUrl, filename) {
    console.log(`📤 Uploading image to Sirv: ${filename}`);

    try {
      const token = await this.getSirvToken();

      // First, download the image
      const imageResponse = await axios.get(imageUrl, {
        ...this.axiosConfig,
        responseType: 'arraybuffer'
      });

      // Upload to Sirv
      const uploadResponse = await axios.post(
        `https://api.sirv.com/v2/files/upload?filename=/eden-content/${filename}`,
        imageResponse.data,
        {
          ...this.axiosConfig,
          headers: {
            ...this.axiosConfig.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/octet-stream'
          }
        }
      );

      const sirvUrl = `${this.sirvPublicUrl}/eden-content/${filename}`;
      console.log(`✅ Image uploaded to Sirv: ${sirvUrl}`);
      
      return sirvUrl;
    } catch (error) {
      console.error(`❌ Sirv upload failed for ${filename}:`, error.message);
      throw error;
    }
  }

  async optimizeImage(sirvUrl, options = {}) {
    console.log(`🎨 Optimizing image: ${sirvUrl}`);

    try {
      const defaultOptions = {
        w: 1200, // Max width
        h: 800,  // Max height
        q: 85,   // Quality
        format: 'webp' // Modern format
      };

      const finalOptions = { ...defaultOptions, ...options };
      const params = new URLSearchParams(finalOptions).toString();
      
      const optimizedUrl = `${sirvUrl}?${params}`;
      console.log(`✅ Image optimized: ${optimizedUrl}`);
      
      return optimizedUrl;
    } catch (error) {
      console.error(`❌ Image optimization failed:`, error.message);
      return sirvUrl; // Return original URL as fallback
    }
  }

  async generateImageVariants(sirvUrl) {
    console.log(`🖼️ Generating image variants for: ${sirvUrl}`);

    try {
      const variants = {
        thumbnail: this.optimizeImage(sirvUrl, { w: 300, h: 200, q: 80 }),
        medium: this.optimizeImage(sirvUrl, { w: 600, h: 400, q: 85 }),
        large: this.optimizeImage(sirvUrl, { w: 1200, h: 800, q: 85 }),
        social: this.optimizeImage(sirvUrl, { w: 1200, h: 630, q: 85 }), // Social media aspect ratio
        square: this.optimizeImage(sirvUrl, { w: 800, h: 800, q: 85 }) // Instagram square
      };

      const resolvedVariants = {};
      for (const [key, promise] of Object.entries(variants)) {
        resolvedVariants[key] = await promise;
      }

      console.log(`✅ Generated ${Object.keys(resolvedVariants).length} image variants`);
      return resolvedVariants;
    } catch (error) {
      console.error('❌ Image variant generation failed:', error.message);
      return { original: sirvUrl };
    }
  }

  async validateImageContent(imageUrl, description = '') {
    console.log(`🔍 Validating image content: ${description}`);

    try {
      // Basic validation based on description and filename
      const lowercaseDesc = description.toLowerCase();
      
      // Check for forbidden content
      const forbiddenTerms = [
        'jesus face', 'christ face', 'crucifix', 'cross prominent',
        'catholic', 'mystical', 'occult', 'abstract religious'
      ];

      const hasForbiddenContent = forbiddenTerms.some(term => 
        lowercaseDesc.includes(term)
      );

      if (hasForbiddenContent) {
        console.log(`⚠️ Image may contain forbidden content: ${description}`);
        return {
          approved: false,
          reason: 'Contains potentially inappropriate religious imagery',
          confidence: 0.8
        };
      }

      // Check for preferred content
      const preferredTerms = [
        'bible', 'prayer', 'hands', 'nature', 'light', 'hope',
        'community', 'family', 'study', 'reading', 'peaceful'
      ];

      const hasPreferredContent = preferredTerms.some(term => 
        lowercaseDesc.includes(term)
      );

      console.log(`✅ Image validation complete: ${hasPreferredContent ? 'Preferred' : 'Acceptable'} content`);
      
      return {
        approved: true,
        reason: hasPreferredContent ? 'Contains preferred Christian imagery' : 'Acceptable content',
        confidence: hasPreferredContent ? 0.9 : 0.7
      };
    } catch (error) {
      console.error('❌ Image validation failed:', error.message);
      return {
        approved: true, // Default to approved if validation fails
        reason: 'Validation failed, manual review recommended',
        confidence: 0.5
      };
    }
  }

  async searchAndValidateImages(query, count = 3) {
    console.log(`🔍 Searching and validating images for: "${query}"`);

    try {
      // Search for more images than needed to allow for filtering
      const searchResults = await this.searchPexelsImages(query, count * 2);
      
      if (searchResults.length === 0) {
        return [];
      }

      const validatedImages = [];

      for (const image of searchResults) {
        if (validatedImages.length >= count) break;

        const validation = await this.validateImageContent(image.alt, query);
        
        if (validation.approved) {
          validatedImages.push({
            ...image,
            validation
          });
        } else {
          console.log(`❌ Image rejected: ${validation.reason}`);
        }
      }

      console.log(`✅ Found ${validatedImages.length} validated images for "${query}"`);
      return validatedImages;
    } catch (error) {
      console.error(`❌ Image search and validation failed for "${query}":`, error.message);
      return [];
    }
  }

  async processImageForContent(imageUrl, filename, contentId) {
    console.log(`🎨 Processing image for content ${contentId}: ${filename}`);

    try {
      // Upload to Sirv
      const sirvUrl = await this.uploadToSirv(imageUrl, filename);
      
      // Generate variants
      const variants = await this.generateImageVariants(sirvUrl);
      
      // Return processed image data
      return {
        originalUrl: imageUrl,
        sirvUrl,
        variants,
        filename,
        contentId,
        processedAt: new Date()
      };
    } catch (error) {
      console.error(`❌ Image processing failed for ${filename}:`, error.message);
      throw error;
    }
  }

  async getImageStats(accountId = null) {
    try {
      console.log(`📊 Getting image usage statistics (accountId: ${accountId})...`);
      
      // Add account filtering to queries if accountId is provided
      let accountFilter = '';
      let accountParams = [];
      
      if (accountId) {
        accountFilter = ' AND account_id = ?';
        accountParams = [accountId];
      }
      
      // Get total images
      const totalResult = await db.query(`
        SELECT COUNT(*) as total
        FROM ssnews_image_assets
        WHERE 1=1${accountFilter}
      `, accountParams);
      
      // Get images this week
      const weekResult = await db.query(`
        SELECT COUNT(*) as count
        FROM ssnews_image_assets
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)${accountFilter}
      `, accountParams);
      
      // Get top search queries (approximate from alt text)
      const topQueriesResult = await db.query(`
        SELECT 
          alt_text_suggestion_ai as query,
          COUNT(*) as count
        FROM ssnews_image_assets
        WHERE alt_text_suggestion_ai IS NOT NULL${accountFilter}
        GROUP BY alt_text_suggestion_ai
        ORDER BY count DESC
        LIMIT 10
      `, accountParams);
      
      // Calculate approximate storage used (this is a rough estimate)
      const storageResult = await db.query(`
        SELECT COUNT(*) * 0.5 as approx_mb
        FROM ssnews_image_assets
        WHERE 1=1${accountFilter}
      `, accountParams);
      
      const stats = {
        totalImages: totalResult[0]?.total || 0,
        imagesThisWeek: weekResult[0]?.count || 0,
        topQueries: topQueriesResult.map(row => ({
          query: row.query,
          count: row.count
        })),
        storageUsed: `${Math.round(storageResult[0]?.approx_mb || 0)} MB (approx)`,
        accountId: accountId,
        lastUpdated: new Date()
      };
      
      console.log(`📊 Image stats: ${stats.totalImages} total, ${stats.imagesThisWeek} this week`);
      return stats;
    } catch (error) {
      console.error('❌ Error getting image stats:', error.message);
      // Return safe fallback data
      return {
        totalImages: 0,
        imagesThisWeek: 0,
        topQueries: [],
        storageUsed: '0 MB',
        accountId: accountId,
        lastUpdated: new Date(),
        error: 'Failed to load stats'
      };
    }
  }

  // Utility methods
  getImageDimensions(width, height) {
    const aspectRatio = width / height;
    
    if (aspectRatio > 1.5) return 'landscape';
    if (aspectRatio < 0.75) return 'portrait';
    return 'square';
  }

  generateFilename(contentId, imageIndex, extension = 'jpg') {
    const timestamp = Date.now();
    return `content-${contentId}-${imageIndex}-${timestamp}.${extension}`;
  }

  isValidImageUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  async generateIdeogramImage(options = {}) {
    console.log('🎨 Generating custom image with Ideogram.ai...');
    
    try {
      if (!this.ideogramApiKey) {
        throw new Error('Ideogram API key not configured');
      }

      const {
        prompt,
        aspectRatio = '16:9',
        resolution = null,
        styleType = 'GENERAL',
        magicPrompt = 'AUTO',
        negativePrompt = '',
        seed = null,
        numImages = 1,
        renderingSpeed = 'DEFAULT'
      } = options;

      if (!prompt) {
        throw new Error('Prompt is required for image generation');
      }

      // Prepare form data for the API request
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('style_type', styleType);
      formData.append('magic_prompt', magicPrompt);
      formData.append('num_images', numImages.toString());
      formData.append('rendering_speed', renderingSpeed);

      // Use either resolution or aspect ratio, not both
      if (resolution) {
        formData.append('resolution', resolution);
      } else {
        formData.append('aspect_ratio', aspectRatio);
      }

      if (negativePrompt) {
        formData.append('negative_prompt', negativePrompt);
      }

      if (seed) {
        formData.append('seed', seed.toString());
      }

      console.log(`🔍 Ideogram prompt: "${prompt.substring(0, 100)}..."`);
      console.log(`🎯 Style: ${styleType}, Aspect: ${aspectRatio}, Magic: ${magicPrompt}`);

      const response = await axios.post(
        'https://api.ideogram.ai/v1/ideogram-v3/generate',
        formData,
        {
          ...this.axiosConfig,
          headers: {
            ...this.axiosConfig.headers,
            'Api-Key': this.ideogramApiKey,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000 // Longer timeout for image generation
        }
      );

      const generatedImages = response.data.data || [];
      
      console.log(`✅ Generated ${generatedImages.length} image(s) with Ideogram`);
      
      return generatedImages.map(image => ({
        id: `ideogram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: image.url,
        prompt: image.prompt || prompt,
        resolution: image.resolution,
        seed: image.seed,
        styleType: image.style_type || styleType,
        isImageSafe: image.is_image_safe,
        created: image.created || new Date().toISOString(),
        source: 'ideogram'
      }));

    } catch (error) {
      console.error('❌ Ideogram image generation failed:', error.response?.data || error.message);
      throw new Error(`Ideogram generation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async generateChristianContentImage(articleTitle, articleContent, customPrompt = null) {
    console.log('⛪ Generating Christian-themed image with Ideogram...');

    try {
      // Create a Christian-themed prompt if none provided
      let prompt = customPrompt;
      
      if (!prompt) {
        prompt = this.createChristianImagePrompt(articleTitle, articleContent);
      }

      // Add Christian content guidelines to negative prompt
      const negativePrompt = 'Jesus face, crucifix, overly Catholic iconography, mystical symbols, occult imagery, abstract religious symbols, distorted Bible, inappropriate religious content';

      const options = {
        prompt,
        aspectRatio: '16:9',
        styleType: 'REALISTIC',
        magicPrompt: 'ON',
        negativePrompt,
        numImages: 1,
        renderingSpeed: 'DEFAULT'
      };

      return await this.generateIdeogramImage(options);
    } catch (error) {
      console.error('❌ Christian content image generation failed:', error.message);
      throw error;
    }
  }

  createChristianImagePrompt(title, content) {
    // Extract key themes from title and content
    const text = (title + ' ' + content).toLowerCase();
    
    let basePrompt = 'A warm, hopeful image with soft natural lighting showing ';
    
    // Add specific elements based on content
    if (text.includes('prayer') || text.includes('pray')) {
      basePrompt += 'diverse people with hands in prayer, peaceful expressions, ';
    } else if (text.includes('bible') || text.includes('scripture')) {
      basePrompt += 'an open Bible being read, warm candlelight, peaceful study setting, ';
    } else if (text.includes('church') || text.includes('community')) {
      basePrompt += 'people gathering in fellowship, diverse community, warm expressions, ';
    } else if (text.includes('faith') || text.includes('hope')) {
      basePrompt += 'sunrise breaking through clouds, path through peaceful landscape, symbols of hope, ';
    } else if (text.includes('family')) {
      basePrompt += 'diverse family praying together, peaceful home setting, ';
    } else {
      basePrompt += 'peaceful natural scene with warm golden light, representing hope and faith, ';
    }

    basePrompt += 'modern photography style, editorial quality, warm colors, natural expressions, authentic moments, high quality, professional lighting';

    return basePrompt;
  }

  async processIdeogramImageForContent(ideogramImage, contentId, accountId = null) {
    console.log(`🎨 Processing Ideogram image for content ${contentId}...`);

    try {
      // Generate filename for the image
      const filename = `ideogram-${contentId}-${Date.now()}.jpg`;
      
      // Upload to Sirv CDN
      const sirvUrl = await this.uploadToSirv(ideogramImage.url, filename);
      
      // Store in database
      const imageData = {
        associated_content_type: 'gen_article',
        associated_content_id: contentId,
        source_api: 'ideogram',
        source_image_id_external: ideogramImage.id,
        sirv_cdn_url: sirvUrl,
        alt_text_suggestion_ai: ideogramImage.prompt.substring(0, 250), // Use prompt as alt text
        is_approved_human: false,
        created_at: new Date()
      };

      const imageId = accountId 
        ? await db.insertWithAccount('ssnews_image_assets', imageData, accountId)
        : await db.insert('ssnews_image_assets', imageData);

      console.log(`✅ Ideogram image processed and stored (ID: ${imageId})`);

      return {
        id: imageId,
        sirvUrl,
        altText: imageData.alt_text_suggestion_ai,
        ideogramId: ideogramImage.id,
        prompt: ideogramImage.prompt,
        source: 'ideogram',
        resolution: ideogramImage.resolution,
        styleType: ideogramImage.styleType,
        seed: ideogramImage.seed
      };

    } catch (error) {
      console.error('❌ Error processing Ideogram image:', error.message);
      throw error;
    }
  }

  // Utility method to get available Ideogram styles
  getIdeogramStyles() {
    return [
      { value: 'AUTO', label: 'Auto (System Decides)', description: 'Let Ideogram choose the best style' },
      { value: 'GENERAL', label: 'General', description: 'Default versatile style' },
      { value: 'REALISTIC', label: 'Realistic', description: 'Photorealistic images' },
      { value: 'DESIGN', label: 'Design', description: 'Graphic design elements' },
      { value: 'RENDER_3D', label: '3D Render', description: '3D rendered images' },
      { value: 'ANIME', label: 'Anime', description: 'Anime-style illustrations' }
    ];
  }

  // Utility method to get available aspect ratios
  getAspectRatios() {
    return [
      { value: '1:1', label: 'Square (1:1)', description: 'Perfect for social media posts' },
      { value: '16:9', label: 'Landscape (16:9)', description: 'Great for blog headers' },
      { value: '9:16', label: 'Portrait (9:16)', description: 'Mobile-friendly format' },
      { value: '4:3', label: 'Standard (4:3)', description: 'Classic photo format' },
      { value: '3:2', label: 'Photo (3:2)', description: 'Traditional photography ratio' },
      { value: '2:3', label: 'Tall Portrait (2:3)', description: 'Vertical content' },
      { value: '3:1', label: 'Wide Banner (3:1)', description: 'Banner and header images' }
    ];
  }
}

// Create singleton instance
const imageService = new ImageService();

export default imageService; 