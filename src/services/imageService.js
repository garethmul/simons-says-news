import axios from 'axios';
import db from './database.js'; // Import database service

class ImageService {
  constructor() {
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

  async searchAndValidateImages(query, count = 3) {
    console.log(`🔍 Image search disabled - Pexels integration removed`);
    console.log(`⚠️ Use AI image generation with Ideogram instead`);
    return [];
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
        renderingSpeed = 'DEFAULT',
        modelVersion = 'v2'
      } = options;

      if (!prompt) {
        throw new Error('Prompt is required for image generation');
      }

      // Add model version parameter - map to API format
      let apiModel;
      switch (modelVersion) {
        case 'v1':
        case 'v1.0':
          apiModel = 'V_1';
          break;
        case 'v2':
        case 'v2.0':
          apiModel = 'V_2';
          break;
        case 'v2a':
          apiModel = 'V_2_TURBO';
          break;
        case 'v3':
        case 'v3.0':
        default:
          apiModel = 'V_3'; // Default to latest
          break;
      }

      // Determine the correct API endpoint based on model version
      let apiEndpoint;
      let isLegacyEndpoint = false;
      
      switch (modelVersion) {
        case 'v1':
        case 'v1.0':
        case 'v2':
        case 'v2.0':
        case 'v2a':
          // Legacy endpoint for v1 and v2 models
          apiEndpoint = 'https://api.ideogram.ai/generate';
          isLegacyEndpoint = true;
          break;
        case 'v3':
        case 'v3.0':
        default:
          // New endpoint for v3 models
          apiEndpoint = 'https://api.ideogram.ai/v1/ideogram-v3/generate';
          isLegacyEndpoint = false;
          break;
      }

      console.log(`🔍 Ideogram prompt: "${prompt.substring(0, 100)}..."`);
      console.log(`🎯 Model: ${apiModel} (${modelVersion}), Style: ${styleType}, Aspect: ${aspectRatio}, Magic: ${magicPrompt}`);
      console.log(`🔗 Using API endpoint: ${apiEndpoint} (Legacy: ${isLegacyEndpoint})`);

      let requestData;
      let headers = {
        ...this.axiosConfig.headers,
        'Api-Key': this.ideogramApiKey
      };

      if (isLegacyEndpoint) {
        // Legacy endpoints (v1, v2) expect JSON
        requestData = {
          prompt: prompt,
          style_type: styleType,
          magic_prompt: magicPrompt,
          num_images: numImages,
          rendering_speed: renderingSpeed,
          model: apiModel
        };

        // Use either resolution or aspect ratio, not both
        if (resolution) {
          requestData.resolution = resolution;
        } else {
          // Convert aspect ratio format from 16:9 to 16x9 for Ideogram API
          requestData.aspect_ratio = aspectRatio.replace(':', 'x');
        }

        if (negativePrompt) {
          requestData.negative_prompt = negativePrompt;
        }

        if (seed) {
          requestData.seed = parseInt(seed);
        }

        headers['Content-Type'] = 'application/json';
        
      } else {
        // New endpoints (v3) expect FormData
        requestData = new FormData();
        requestData.append('prompt', prompt);
        requestData.append('style_type', styleType);
        requestData.append('magic_prompt', magicPrompt);
        requestData.append('num_images', numImages.toString());
        requestData.append('rendering_speed', renderingSpeed);
        requestData.append('model', apiModel);

        // Use either resolution or aspect ratio, not both
        if (resolution) {
          requestData.append('resolution', resolution);
        } else {
          // Convert aspect ratio format from 16:9 to 16x9 for Ideogram API
          const ideogramAspectRatio = aspectRatio.replace(':', 'x');
          requestData.append('aspect_ratio', ideogramAspectRatio);
        }

        if (negativePrompt) {
          requestData.append('negative_prompt', negativePrompt);
        }

        if (seed) {
          requestData.append('seed', seed.toString());
        }

        headers['Content-Type'] = 'multipart/form-data';
      }

      const response = await axios.post(
        apiEndpoint,
        requestData,
        {
          ...this.axiosConfig,
          headers,
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
    console.log('⛪ Generating image with custom prompt...');

    try {
      // Use only the custom prompt provided
      if (!customPrompt || !customPrompt.trim()) {
        throw new Error('Custom prompt is required for image generation');
      }

      const options = {
        prompt: customPrompt.trim(),
        aspectRatio: '16:9',
        styleType: 'REALISTIC',
        magicPrompt: 'ON',
        numImages: 1,
        renderingSpeed: 'DEFAULT'
      };

      return await this.generateIdeogramImage(options);
    } catch (error) {
      console.error('❌ Custom image generation failed:', error.message);
      throw error;
    }
  }

  // Deprecated - keeping for backward compatibility but will return simple fallback
  createChristianImagePrompt(title, content) {
    console.warn('⚠️ createChristianImagePrompt is deprecated. Use custom prompts with account prefix/suffix instead.');
    return 'A warm, professional image with good lighting and composition';
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
        status: 'pending_review', // Set default status to pending_review
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

  // Utility method to get available Ideogram styles by model version
  getIdeogramStyles(modelVersion = 'v2') {
    switch (modelVersion) {
      case 'v3':
      case 'v3.0':
        return [
          { value: 'AUTO', label: 'Auto (System Decides)', description: 'Let Ideogram choose the best style automatically' },
          { value: 'GENERAL', label: 'General', description: 'Versatile style for artistic works, sketches, digital art' },
          { value: 'REALISTIC', label: 'Realistic', description: 'Photorealistic images with natural lighting' },
          { value: 'DESIGN', label: 'Design', description: 'Graphic design elements, logos, promotional materials' }
        ];
      
      case 'v2':
      case 'v2.0':
      case 'v2a':
        return [
          { value: 'AUTO', label: 'Auto (System Decides)', description: 'Let Ideogram choose the best style automatically' },
          { value: 'GENERAL', label: 'General', description: 'Versatile style for artistic works, sketches, digital art' },
          { value: 'REALISTIC', label: 'Realistic', description: 'Photorealistic images with natural lighting' },
          { value: 'DESIGN', label: 'Design', description: 'Graphic design elements, logos, promotional materials' },
          { value: '3D', label: '3D', description: 'Perfect for 3D characters, objects, and visual appeal' },
          { value: 'ANIME', label: 'Anime', description: 'Ideal for anime-style images and characters' }
        ];
      
      case 'v1':
      case 'v1.0':
        return [
          { value: 'RANDOM', label: 'Random', description: 'AI randomly selects from vast style database' },
          { value: 'GENERAL', label: 'General', description: 'Versatile style for most content' },
          { value: 'REALISTIC', label: 'Realistic', description: 'Photorealistic images' },
          { value: 'DESIGN', label: 'Design', description: 'Graphic design and illustrations' },
          { value: '3D_RENDER', label: '3D Render', description: '3D rendered style' },
          { value: 'ANIME', label: 'Anime', description: 'Anime and manga style' },
          { value: 'ARCHITECTURE', label: 'Architecture', description: 'Architectural visualization' },
          { value: 'CINEMATIC', label: 'Cinematic', description: 'Movie-like dramatic lighting' },
          { value: 'CONCEPTUAL_ART', label: 'Conceptual Art', description: 'Abstract conceptual artwork' },
          { value: 'DARK_FANTASY', label: 'Dark Fantasy', description: 'Gothic and dark fantasy themes' },
          { value: 'FASHION', label: 'Fashion', description: 'Fashion photography and styling' },
          { value: 'GRAFFITI', label: 'Graffiti', description: 'Street art and graffiti style' },
          { value: 'ILLUSTRATION', label: 'Illustration', description: 'Digital illustration style' },
          { value: 'PAINTING', label: 'Painting', description: 'Traditional painting techniques' },
          { value: 'PHOTO', label: 'Photo', description: 'Photographic style' },
          { value: 'PORTRAIT_PHOTOGRAPHY', label: 'Portrait Photography', description: 'Professional portrait style' },
          { value: 'POSTER', label: 'Poster', description: 'Poster and advertisement design' },
          { value: 'PRODUCT', label: 'Product', description: 'Product photography style' },
          { value: 'TYPOGRAPHY', label: 'Typography', description: 'Text and typography focus' },
          { value: 'UKIYO_E', label: 'Ukiyo-e', description: 'Traditional Japanese art style' },
          { value: 'VIBRANT', label: 'Vibrant', description: 'Bright and colorful style' },
          { value: 'WILDLIFE_PHOTOGRAPHY', label: 'Wildlife Photography', description: 'Nature and wildlife photography' }
        ];
      
      default:
        // Default to v3 styles
        return this.getIdeogramStyles('v3');
    }
  }

  // Utility method to get available aspect ratios
  getAspectRatios() {
    return [
      { value: '1:1', label: 'Square (1:1)', description: 'Perfect for social media posts and profile images' },
      { value: '16:9', label: 'Landscape (16:9)', description: 'Great for blog headers and wide displays' },
      { value: '9:16', label: 'Portrait (9:16)', description: 'Mobile-friendly vertical format' },
      { value: '4:3', label: 'Standard (4:3)', description: 'Classic photo format' },
      { value: '3:2', label: 'Photo (3:2)', description: 'Traditional photography ratio' },
      { value: '2:3', label: 'Tall Portrait (2:3)', description: 'Vertical content and posters' },
      { value: '3:1', label: 'Wide Banner (3:1)', description: 'Banner and header images' },
      { value: '1:3', label: 'Tall Banner (1:3)', description: 'Vertical banners and sidebars' },
      { value: '4:5', label: 'Instagram Portrait (4:5)', description: 'Instagram portrait posts' },
      { value: '5:4', label: 'Instagram Landscape (5:4)', description: 'Instagram landscape posts' },
      { value: '9:21', label: 'Story Format (9:21)', description: 'Instagram/Facebook stories' },
      { value: '21:9', label: 'Ultrawide (21:9)', description: 'Cinematic and ultrawide displays' },
      { value: '2:1', label: 'Banner (2:1)', description: 'Web banners and covers' },
      { value: '1:2', label: 'Vertical Banner (1:2)', description: 'Tall vertical content' },
      { value: '3:4', label: 'Portrait Standard (3:4)', description: 'Standard portrait orientation' }
    ];
  }

  // Utility method to get available resolutions (based on Ideogram API)
  getResolutions() {
    return [
      // Square formats
      { value: '1024x1024', label: '1024×1024 (1:1)', category: 'Square' },
      { value: '1536x1536', label: '1536×1536 (1:1 HD)', category: 'Square' },
      
      // Landscape formats
      { value: '1024x768', label: '1024×768 (4:3)', category: 'Landscape' },
      { value: '1152x896', label: '1152×896 (9:7)', category: 'Landscape' },
      { value: '1216x832', label: '1216×832 (19:13)', category: 'Landscape' },
      { value: '1344x768', label: '1344×768 (7:4)', category: 'Landscape' },
      { value: '1408x704', label: '1408×704 (2:1)', category: 'Landscape' },
      { value: '1472x736', label: '1472×736 (2:1)', category: 'Landscape' },
      { value: '1536x640', label: '1536×640 (12:5)', category: 'Landscape' },
      { value: '1600x640', label: '1600×640 (5:2)', category: 'Landscape' },
      { value: '1792x1024', label: '1792×1024 (7:4 HD)', category: 'Landscape' },
      { value: '1984x1024', label: '1984×1024 (31:16)', category: 'Landscape' },
      { value: '2048x1152', label: '2048×1152 (16:9 HD)', category: 'Landscape' },
      
      // Portrait formats
      { value: '768x1024', label: '768×1024 (3:4)', category: 'Portrait' },
      { value: '768x1344', label: '768×1344 (4:7)', category: 'Portrait' },
      { value: '832x1216', label: '832×1216 (13:19)', category: 'Portrait' },
      { value: '896x1152', label: '896×1152 (7:9)', category: 'Portrait' },
      { value: '704x1408', label: '704×1408 (1:2)', category: 'Portrait' },
      { value: '736x1472', label: '736×1472 (1:2)', category: 'Portrait' },
      { value: '640x1536', label: '640×1536 (5:12)', category: 'Portrait' },
      { value: '640x1600', label: '640×1600 (2:5)', category: 'Portrait' },
      { value: '1024x1792', label: '1024×1792 (4:7 HD)', category: 'Portrait' },
      { value: '1024x1984', label: '1024×1984 (16:31)', category: 'Portrait' },
      { value: '1152x2048', label: '1152×2048 (9:16 HD)', category: 'Portrait' }
    ];
  }
}

// Create singleton instance
const imageService = new ImageService();

export default imageService; 