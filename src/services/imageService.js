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

  // Centralized version registry for future extensibility
  getIdeogramVersionRegistry() {
    return {
      // Legacy API family (v1, v2, v2a)
      'v1': {
        family: 'legacy',
        generation: 1,
        endpoint: 'https://api.ideogram.ai/generate',
        apiModel: 'V_1',
        contentType: 'application/json',
        requiresWrapper: true,
        deprecated: false,
        releaseDate: '2023',
        capabilities: {
          maxImages: 8,
          colorPalette: true,
          styleCodes: true,
          negativePrompt: true,
          seed: true,
          resolution: true,
          aspectRatio: 'limited', // Limited aspect ratios
          referenceImages: true,
          multipleStyles: true
        },
        behaviors: {
          styleCodesBehavior: 'keyword_injection', // Adds keywords to prompt
          aspectRatioFormat: 'ASPECT_X_Y'
        }
      },
      
      'v2': {
        family: 'legacy',
        generation: 2,
        endpoint: 'https://api.ideogram.ai/generate',
        apiModel: 'V_2',
        contentType: 'application/json',
        requiresWrapper: true,
        deprecated: false,
        releaseDate: '2024-Q1',
        capabilities: {
          maxImages: 8,
          colorPalette: true,
          styleCodes: true,
          negativePrompt: true,
          seed: true,
          resolution: true,
          aspectRatio: 'limited', // Limited aspect ratios
          referenceImages: false,
          multipleStyles: false,
          specializedModels: true // 3D, Anime
        },
        behaviors: {
          styleCodesBehavior: 'specialized_models', // Uses specialized AI models
          aspectRatioFormat: 'ASPECT_X_Y'
        }
      },
      
      'v2a': {
        family: 'legacy',
        generation: 2,
        variant: 'turbo',
        endpoint: 'https://api.ideogram.ai/generate',
        apiModel: 'V_2_TURBO',
        contentType: 'application/json',
        requiresWrapper: true,
        deprecated: false,
        releaseDate: '2024-Q2',
        capabilities: {
          maxImages: 8,
          colorPalette: false, // Disabled for turbo mode
          styleCodes: false,
          negativePrompt: true,
          seed: true,
          resolution: true,
          aspectRatio: 'limited',
          referenceImages: false,
          multipleStyles: false,
          fastGeneration: true
        },
        behaviors: {
          styleCodesBehavior: 'disabled',
          aspectRatioFormat: 'ASPECT_X_Y',
          optimizedForSpeed: true
        }
      },
      
      'v3': {
        family: 'modern',
        generation: 3,
        endpoint: 'https://api.ideogram.ai/v1/ideogram-v3/generate',
        apiModel: 'V_3',
        contentType: 'multipart/form-data',
        requiresWrapper: false,
        deprecated: false,
        releaseDate: '2024-Q3',
        capabilities: {
          maxImages: 8,
          colorPalette: true,
          styleCodes: true,
          negativePrompt: true,
          seed: true,
          resolution: 'enhanced', // More resolution options
          aspectRatio: 'enhanced', // More aspect ratios
          referenceImages: true,
          multipleStyles: false,
          randomStyleCodes: true
        },
        behaviors: {
          styleCodesBehavior: 'direct', // Direct style application
          aspectRatioFormat: 'ASPECT_X_Y',
          qualityFocus: true
        }
      },
      
      // Future v4 placeholder - easily extensible
      'v4': {
        family: 'next_gen',
        generation: 4,
        endpoint: 'https://api.ideogram.ai/v2/ideogram-v4/generate', // Future endpoint
        apiModel: 'V_4',
        contentType: 'multipart/form-data',
        requiresWrapper: false,
        deprecated: false,
        releaseDate: 'TBD',
        capabilities: {
          maxImages: 16,
          colorPalette: true,
          styleCodes: true,
          negativePrompt: true,
          seed: true,
          resolution: 'unlimited',
          aspectRatio: 'unlimited',
          referenceImages: true,
          multipleStyles: true,
          videoGeneration: true, // Future feature
          enhancedControl: true
        },
        behaviors: {
          styleCodesBehavior: 'neural_style_transfer',
          aspectRatioFormat: 'flexible', // Could support any ratio
          aiEnhanced: true
        }
      }
    };
  }

  // Get version-specific configuration with future-proof design
  getIdeogramVersionConfig(modelVersion) {
    const registry = this.getIdeogramVersionRegistry();
    
    // Normalize version string with flexible parsing
    const normalizedVersion = modelVersion.toLowerCase().replace(/[^a-z0-9]/g, '');
    const versionMap = {
      'v1': 'v1', 'v10': 'v1', 'version1': 'v1',
      'v2': 'v2', 'v20': 'v2', 'version2': 'v2',
      'v2a': 'v2a', 'v2aturbo': 'v2a', 'v2turbo': 'v2a',
      'v3': 'v3', 'v30': 'v3', 'version3': 'v3',
      'v4': 'v4', 'v40': 'v4', 'version4': 'v4' // Future support
    };

    const configKey = versionMap[normalizedVersion] || 'v3'; // Default to latest stable
    const versionData = registry[configKey];
    
    if (!versionData) {
      console.warn(`⚠️ Unknown Ideogram version: ${modelVersion}, falling back to v3`);
      return registry['v3'];
    }
    
    // Transform registry data to expected format for backward compatibility
    return {
      endpoint: versionData.endpoint,
      isLegacy: versionData.family === 'legacy',
      apiModel: versionData.apiModel,
      contentType: versionData.contentType,
      requiresWrapper: versionData.requiresWrapper,
      maxImages: versionData.capabilities.maxImages,
      supportedFeatures: {
        colorPalette: versionData.capabilities.colorPalette,
        styleCodes: versionData.capabilities.styleCodes,
        negativePrompt: versionData.capabilities.negativePrompt,
        seed: versionData.capabilities.seed,
        resolution: !!versionData.capabilities.resolution,
        aspectRatio: !!versionData.capabilities.aspectRatio
      },
      // Additional metadata for future use
      metadata: {
        family: versionData.family,
        generation: versionData.generation,
        variant: versionData.variant,
        deprecated: versionData.deprecated,
        releaseDate: versionData.releaseDate,
        behaviors: versionData.behaviors
      }
    };
  }

  async generateIdeogramImage(options = {}) {
    console.log('🎨 Generating custom image with Ideogram.ai...');
    
    try {
      if (!this.ideogramApiKey) {
        throw new Error('Ideogram API key not configured');
      }

      if (!this.ideogramApiKey.startsWith('Bearer ') && !this.ideogramApiKey.match(/^[A-Za-z0-9_-]+$/)) {
        console.warn('⚠️ Ideogram API key format may be incorrect');
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
        modelVersion = 'v2',
        colorPalette = null,
        styleCodes = null
      } = options;

      if (!prompt) {
        throw new Error('Prompt is required for image generation');
      }

      // Get version-specific configuration
      const config = this.getIdeogramVersionConfig(modelVersion);

      // Auto-fix aspect ratio if provided and unsupported
      let finalAspectRatio = aspectRatio;
      let aspectRatioChanged = false;
      
      if (aspectRatio && !resolution) {
        const supportedRatios = this.getAspectRatios(modelVersion).map(r => r.value);
        if (!supportedRatios.includes(aspectRatio)) {
          console.warn(`⚠️ Aspect ratio ${aspectRatio} not supported by ${modelVersion}`);
          
          // Auto-fallback to closest alternative
          const aspectMappings = {
            '5:4': '4:3', // 1.25 -> 1.33 (closest landscape)
            '4:5': '3:4', // 0.8 -> 0.75 (closest portrait)
            '21:9': '16:9', // Ultra-wide -> standard wide
            '9:21': '9:16', // Ultra-tall -> standard tall
            '2:1': '3:1', // Banner -> wider banner
            '1:2': '1:3' // Tall banner -> taller banner
          };
          
          const fallback = aspectMappings[aspectRatio] || '16:9'; // Default to 16:9 if no mapping
          finalAspectRatio = fallback;
          aspectRatioChanged = true;
          
          console.log(`🔄 Automatically changed aspect ratio from ${aspectRatio} to ${finalAspectRatio} for ${modelVersion} compatibility`);
        }
      }

      // Validate numImages
      if (numImages < 1 || numImages > config.maxImages) {
        throw new Error(`Invalid number of images: ${numImages}. Must be between 1 and ${config.maxImages}.`);
      }

      // Validate style for version
      const availableStyles = this.getIdeogramStyles(modelVersion).map(s => s.value);
      if (!availableStyles.includes(styleType)) {
        console.warn(`⚠️ Style ${styleType} not available for ${modelVersion}, using GENERAL`);
        // Don't throw error, just use GENERAL as fallback
      }

      console.log(`🔍 Ideogram prompt: "${prompt.substring(0, 100)}..."`);
      console.log(`🎯 Model: ${config.apiModel} (${modelVersion}), Style: ${styleType}, Aspect: ${finalAspectRatio}, Magic: ${magicPrompt}`);
      console.log(`🔗 Using API endpoint: ${config.endpoint} (Legacy: ${config.isLegacy})`);
      
      if (aspectRatioChanged) {
        console.log(`📝 Note: Aspect ratio automatically adjusted from ${aspectRatio} to ${finalAspectRatio} for compatibility`);
      }
      
      if (colorPalette && config.supportedFeatures.colorPalette) {
        console.log(`🎨 Color palette: ${colorPalette.members?.length || 0} colors`);
      } else if (colorPalette && !config.supportedFeatures.colorPalette) {
        console.warn(`⚠️ Color palette not supported in ${modelVersion}, ignoring`);
      }
      
      if (styleCodes && styleCodes.length > 0 && config.supportedFeatures.styleCodes) {
        console.log(`🎭 Style codes: ${styleCodes.join(', ')}`);
      } else if (styleCodes && styleCodes.length > 0 && !config.supportedFeatures.styleCodes) {
        console.warn(`⚠️ Style codes not supported in ${modelVersion}, ignoring`);
      }

      let requestData;
      let headers = {
        ...this.axiosConfig.headers,
        'Api-Key': this.ideogramApiKey
      };

      // Convert aspect ratio to API format based on model version
      const formatAspectRatio = (ratio, isLegacy) => {
        if (isLegacy) {
          // Legacy APIs (v1, v2, v2a) expect ASPECT_X_Y format
          const [width, height] = ratio.split(':');
          return `ASPECT_${width}_${height}`;
        } else {
          // Modern APIs (v3+) expect raw X:Y format
          return ratio;
        }
      };

      if (config.isLegacy) {
        // Legacy endpoints (v1, v2, v2a) expect JSON wrapped in image_request
        const imageRequest = {
          prompt: prompt,
          style_type: styleType,
          magic_prompt: magicPrompt,
          num_images: numImages,
          rendering_speed: renderingSpeed,
          model: config.apiModel
        };

        // Use either resolution or aspect ratio, not both
        if (resolution && config.supportedFeatures.resolution) {
          imageRequest.resolution = resolution;
        } else if (config.supportedFeatures.aspectRatio) {
          imageRequest.aspect_ratio = formatAspectRatio(finalAspectRatio, true);
        }

        if (negativePrompt && config.supportedFeatures.negativePrompt) {
          imageRequest.negative_prompt = negativePrompt;
        }

        if (seed && config.supportedFeatures.seed) {
          imageRequest.seed = parseInt(seed);
        }

        if (colorPalette && colorPalette.members && colorPalette.members.length > 0 && config.supportedFeatures.colorPalette) {
          imageRequest.color_palette = colorPalette;
        }

        if (styleCodes && styleCodes.length > 0 && config.supportedFeatures.styleCodes) {
          imageRequest.style_codes = styleCodes;
        }

        // Wrap in image_request object as required by legacy API
        requestData = config.requiresWrapper ? { image_request: imageRequest } : imageRequest;
        headers['Content-Type'] = config.contentType;
        
      } else {
        // New endpoints (v3) expect FormData
        requestData = new FormData();
        requestData.append('prompt', prompt);
        requestData.append('style_type', styleType);
        requestData.append('magic_prompt', magicPrompt);
        requestData.append('num_images', numImages.toString());
        requestData.append('rendering_speed', renderingSpeed);
        requestData.append('model', config.apiModel);

        // Use either resolution or aspect ratio, not both
        if (resolution && config.supportedFeatures.resolution) {
          requestData.append('resolution', resolution);
        } else if (config.supportedFeatures.aspectRatio) {
          requestData.append('aspect_ratio', formatAspectRatio(finalAspectRatio, false));
        }

        if (negativePrompt && config.supportedFeatures.negativePrompt) {
          requestData.append('negative_prompt', negativePrompt);
        }

        if (seed && config.supportedFeatures.seed) {
          requestData.append('seed', seed.toString());
        }

        if (colorPalette && colorPalette.members && colorPalette.members.length > 0 && config.supportedFeatures.colorPalette) {
          requestData.append('color_palette', JSON.stringify(colorPalette));
        }

        if (styleCodes && styleCodes.length > 0 && config.supportedFeatures.styleCodes) {
          requestData.append('style_codes', styleCodes.join(','));
        }

        // Handle v3 reference images
        if (options.referenceImages && options.referenceImages.length > 0) {
          console.log(`🖼️ Adding ${options.referenceImages.length} reference images to v3 request`);
          options.referenceImages.forEach((image, index) => {
            // Append buffer directly with filename and content type
            requestData.append(`style_reference_${index}`, image.buffer, {
              filename: image.originalname,
              contentType: image.mimetype
            });
          });
        }

        headers['Content-Type'] = config.contentType;
      }

      // Debug logging for request
      console.log('🚀 Making Ideogram API request:');
      console.log('Endpoint:', config.endpoint);
      console.log('Headers:', JSON.stringify(headers, null, 2));
      if (config.isLegacy) {
        console.log('Request data (JSON):', JSON.stringify(requestData, null, 2));
      } else {
        console.log('Request data (FormData):');
        for (let [key, value] of requestData.entries()) {
          console.log(`  ${key}: ${value}`);
        }
      }

      // Retry logic for API calls
      let response;
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🚀 Making Ideogram API request (attempt ${attempt}/${maxRetries})`);
          
          response = await axios.post(
            config.endpoint,
            requestData,
            {
              ...this.axiosConfig,
              headers,
              timeout: 60000 // Longer timeout for image generation
            }
          );
          
          // Success! Break out of retry loop
          break;
          
        } catch (error) {
          lastError = error;
          console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.response?.status, error.response?.data?.detail || error.message);
          
          // Don't retry on client errors (400-499)
          if (error.response?.status >= 400 && error.response?.status < 500) {
            console.error('🚫 Client error - not retrying');
            throw error;
          }
          
          // If this isn't the last attempt, wait before retrying
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000; // Progressive backoff: 2s, 4s
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // If we exhausted all retries, throw the last error
      if (!response) {
        throw lastError;
      }

      const generatedImages = response.data.data || [];
      
      console.log(`✅ Generated ${generatedImages.length} image(s) with Ideogram ${modelVersion}`);
      
      // Prepare user-friendly messages about any automatic adjustments
      const adjustments = [];
      if (aspectRatioChanged) {
        adjustments.push({
          type: 'aspect_ratio_adjusted',
          message: `Aspect ratio automatically changed from ${aspectRatio} to ${finalAspectRatio} for ${modelVersion} compatibility`,
          original: aspectRatio,
          adjusted: finalAspectRatio,
          reason: `${aspectRatio} is not supported by Ideogram ${modelVersion}`
        });
      }
      
      const result = {
        images: generatedImages.map(image => ({
          id: `ideogram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: image.url,
          prompt: image.prompt || prompt,
          resolution: image.resolution,
          seed: image.seed,
          styleType: image.style_type || styleType,
          styleCodes: image.style_codes || image.style_code || null, // Capture style codes from response
          isImageSafe: image.is_image_safe,
          created: image.created || new Date().toISOString(),
          source: 'ideogram',
          modelVersion: modelVersion // Track which model generated this
        })),
        adjustments: adjustments,
        finalParameters: {
          aspectRatio: finalAspectRatio,
          styleType: styleType,
          modelVersion: modelVersion,
          numImages: numImages
        }
      };
      
      return result;

    } catch (error) {
      console.error('❌ Ideogram image generation failed:');
      console.error('Error status:', error.response?.status);
      console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error message:', error.message);
      console.error('Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      
      // Create detailed, user-friendly error message
      let userMessage = 'Image generation failed';
      let technicalDetails = error.message;
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.detail) {
          // API validation error (like aspect ratio issues)
          userMessage = `Generation failed: ${errorData.detail}`;
          technicalDetails = JSON.stringify(errorData);
        } else if (errorData.message) {
          userMessage = `Generation failed: ${errorData.message}`;
          technicalDetails = JSON.stringify(errorData);
        } else if (typeof errorData === 'string') {
          userMessage = `Generation failed: ${errorData}`;
          technicalDetails = errorData;
        } else {
          userMessage = `Generation failed: API returned error ${error.response.status}`;
          technicalDetails = JSON.stringify(errorData);
        }
      } else if (error.code === 'ECONNREFUSED') {
        userMessage = 'Cannot connect to Ideogram API - service may be down';
        technicalDetails = 'Connection refused to Ideogram API';
      } else if (error.code === 'ENOTFOUND') {
        userMessage = 'Cannot reach Ideogram API - check internet connection';
        technicalDetails = 'DNS resolution failed for Ideogram API';
      } else if (error.timeout) {
        userMessage = 'Image generation timed out - please try again';
        technicalDetails = 'Request timeout to Ideogram API';
      }
      
      // Create structured error for better handling
      const structuredError = new Error(userMessage);
      structuredError.code = 'IDEOGRAM_GENERATION_FAILED';
      structuredError.status = error.response?.status || 500;
      structuredError.details = technicalDetails;
      structuredError.originalError = error;
      
      throw structuredError;
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

      const result = await this.generateIdeogramImage(options);
      
      // Return backward-compatible format for legacy code
      return result.images || result;
    } catch (error) {
      console.error('❌ Custom image generation failed:', error.message);
      throw error;
    }
  }

  async editIdeogramImage(options = {}) {
    console.log('🎨 Editing image with Ideogram Magic Fill (v3)...');
    
    try {
      if (!this.ideogramApiKey) {
        throw new Error('Ideogram API key not configured');
      }

      const {
        imageFile,      // File object or buffer for base image
        maskFile,       // File object or buffer for mask (black/white)
        prompt,         // Description of what to generate in masked areas
        magicPrompt = 'AUTO',
        numImages = 1,
        seed = null,
        renderingSpeed = 'DEFAULT',
        colorPalette = null,
        styleCodes = null,
        styleReferenceImages = null
      } = options;

      if (!imageFile) {
        throw new Error('Base image file is required for Magic Fill');
      }

      if (!maskFile) {
        throw new Error('Mask file is required for Magic Fill');
      }

      if (!prompt) {
        throw new Error('Prompt is required for Magic Fill');
      }

      const endpoint = 'https://api.ideogram.ai/v1/ideogram-v3/edit';
      
      console.log(`🔍 Magic Fill prompt: "${prompt.substring(0, 100)}..."`);
      console.log(`🎯 Magic Prompt: ${magicPrompt}, Images: ${numImages}, Speed: ${renderingSpeed}`);
      console.log(`🔗 Using Edit API endpoint: ${endpoint}`);

      // Prepare FormData for multipart request
      const requestData = new FormData();
      
      // Add required files
      if (imageFile.buffer) {
        // Handle multer file objects
        requestData.append('image', imageFile.buffer, {
          filename: imageFile.originalname || 'base-image.jpg',
          contentType: imageFile.mimetype || 'image/jpeg'
        });
      } else {
        // Handle File objects or other formats
        requestData.append('image', imageFile);
      }

      if (maskFile.buffer) {
        // Handle multer file objects  
        requestData.append('mask', maskFile.buffer, {
          filename: maskFile.originalname || 'mask.png',
          contentType: maskFile.mimetype || 'image/png'
        });
      } else {
        // Handle File objects or other formats
        requestData.append('mask', maskFile);
      }

      // Add prompt and other parameters
      requestData.append('prompt', prompt);
      requestData.append('magic_prompt', magicPrompt);
      requestData.append('num_images', numImages.toString());
      requestData.append('rendering_speed', renderingSpeed);

      if (seed) {
        requestData.append('seed', seed.toString());
      }

      if (colorPalette && colorPalette.members && colorPalette.members.length > 0) {
        requestData.append('color_palette', JSON.stringify(colorPalette));
      }

      if (styleCodes && styleCodes.length > 0) {
        requestData.append('style_codes', styleCodes.join(','));
      }

      // Handle style reference images for v3
      if (styleReferenceImages && styleReferenceImages.length > 0) {
        console.log(`🖼️ Adding ${styleReferenceImages.length} style reference images`);
        styleReferenceImages.forEach((image, index) => {
          if (image.buffer) {
            requestData.append(`style_reference_images`, image.buffer, {
              filename: image.originalname || `style-ref-${index}.jpg`,
              contentType: image.mimetype || 'image/jpeg'
            });
          } else {
            requestData.append(`style_reference_images`, image);
          }
        });
      }

      const headers = {
        ...this.axiosConfig.headers,
        'Api-Key': this.ideogramApiKey,
        'Content-Type': 'multipart/form-data'
      };

      // Debug logging
      console.log('🚀 Making Ideogram Edit API request:');
      console.log('Endpoint:', endpoint);
      console.log('Form fields:');
      for (let [key, value] of requestData.entries()) {
        if (key === 'image' || key === 'mask' || key.includes('style_reference')) {
          console.log(`  ${key}: [File object]`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      // Retry logic for API calls
      let response;
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🚀 Making Magic Fill API request (attempt ${attempt}/${maxRetries})`);
          
          response = await axios.post(
            endpoint,
            requestData,
            {
              ...this.axiosConfig,
              headers,
              timeout: 90000 // Longer timeout for image editing
            }
          );
          
          // Success! Break out of retry loop
          break;
          
        } catch (error) {
          lastError = error;
          console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.response?.status, error.response?.data?.detail || error.message);
          
          // Don't retry on client errors (400-499)
          if (error.response?.status >= 400 && error.response?.status < 500) {
            console.error('🚫 Client error - not retrying');
            throw error;
          }
          
          // If this isn't the last attempt, wait before retrying
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000; // Progressive backoff: 2s, 4s
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // If we exhausted all retries, throw the last error
      if (!response) {
        throw lastError;
      }

      const editedImages = response.data.data || [];
      
      console.log(`✅ Magic Fill completed: Generated ${editedImages.length} edited image(s)`);
      
      const result = {
        images: editedImages.map(image => ({
          id: `ideogram_edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: image.url,
          prompt: image.prompt || prompt,
          resolution: image.resolution,
          seed: image.seed,
          styleType: image.style_type,
          isImageSafe: image.is_image_safe,
          created: image.created || new Date().toISOString(),
          source: 'ideogram',
          editType: 'magic_fill'
        })),
        finalParameters: {
          prompt: prompt,
          magicPrompt: magicPrompt,
          numImages: numImages,
          renderingSpeed: renderingSpeed
        }
      };
      
      return result;

    } catch (error) {
      console.error('❌ Ideogram Magic Fill failed:');
      console.error('Error status:', error.response?.status);
      console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error message:', error.message);
      
      // Create detailed, user-friendly error message
      let userMessage = 'Magic Fill failed';
      let technicalDetails = error.message;
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.detail) {
          userMessage = `Magic Fill failed: ${errorData.detail}`;
          technicalDetails = JSON.stringify(errorData);
        } else if (errorData.message) {
          userMessage = `Magic Fill failed: ${errorData.message}`;
          technicalDetails = JSON.stringify(errorData);
        } else if (typeof errorData === 'string') {
          userMessage = `Magic Fill failed: ${errorData}`;
          technicalDetails = errorData;
        } else {
          userMessage = `Magic Fill failed: API returned error ${error.response.status}`;
          technicalDetails = JSON.stringify(errorData);
        }
      }
      
      const structuredError = new Error(userMessage);
      structuredError.code = 'IDEOGRAM_MAGIC_FILL_FAILED';
      structuredError.status = error.response?.status || 500;
      structuredError.details = technicalDetails;
      structuredError.originalError = error;
      
      throw structuredError;
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
      // If no accountId provided, try to get it from the content record
      if (!accountId) {
        console.log(`🔍 No accountId provided, looking up from content ${contentId}...`);
        try {
          const contentRecord = await db.query('SELECT account_id FROM ssnews_generated_articles WHERE gen_article_id = ?', [contentId]);
          if (contentRecord.length > 0 && contentRecord[0].account_id) {
            accountId = contentRecord[0].account_id;
            console.log(`✅ Found accountId from content: ${accountId}`);
          } else {
            console.warn(`⚠️ No account_id found for content ${contentId}, using default account`);
            // Set a default account ID if none found - this prevents the database error
            accountId = '1'; // Default account ID
          }
        } catch (lookupError) {
          console.warn(`⚠️ Failed to lookup accountId for content ${contentId}:`, lookupError.message);
          accountId = '1'; // Default account ID as fallback
        }
      }

      // Generate unique filename for the image (avoid duplicates when processing multiple images)
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const filename = `ideogram-${contentId}-${timestamp}-${randomId}.jpg`;
      
      // Upload to Sirv CDN
      const sirvUrl = await this.uploadToSirv(ideogramImage.url, filename);
      
      // Store in database with enhanced metadata - always include account_id
      const imageData = {
        account_id: accountId, // Always include account_id
        associated_content_type: 'gen_article',
        associated_content_id: contentId,
        source_api: 'ideogram',
        source_image_id_external: ideogramImage.id,
        sirv_cdn_url: sirvUrl,
        alt_text_suggestion_ai: ideogramImage.prompt.substring(0, 250), // Use prompt as alt text
        status: 'pending_review', // Set default status to pending_review
        created_at: new Date(),
        // Store generation metadata as JSON
        generation_metadata: JSON.stringify({
          prompt: ideogramImage.prompt,
          seed: ideogramImage.seed,
          styleType: ideogramImage.styleType,
          styleCodes: ideogramImage.styleCodes, // Store style codes for reuse
          resolution: ideogramImage.resolution,
          modelVersion: ideogramImage.modelVersion,
          isImageSafe: ideogramImage.isImageSafe
        })
      };

      // Use regular insert since we're including account_id in the data
      const imageId = await db.insert('ssnews_image_assets', imageData);

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
        styleCodes: ideogramImage.styleCodes, // Include style codes in response
        seed: ideogramImage.seed,
        modelVersion: ideogramImage.modelVersion,
        generationMetadata: {
          prompt: ideogramImage.prompt,
          seed: ideogramImage.seed,
          styleType: ideogramImage.styleType,
          styleCodes: ideogramImage.styleCodes,
          resolution: ideogramImage.resolution,
          modelVersion: ideogramImage.modelVersion,
          isImageSafe: ideogramImage.isImageSafe
        }
      };

    } catch (error) {
      console.error('❌ Error processing Ideogram image:', error.message);
      throw error;
    }
  }

  // Comprehensive style system based on official Ideogram documentation
  getIdeogramStyles(modelVersion = 'v2') {
    const styleDefinitions = {
      'v3': {
        // v3.0 styles - 4 core styles + special features
        coreStyles: [
          { 
            value: 'AUTO', 
            label: 'Auto (AI Decides)', 
            description: 'AI analyzes your prompt and chooses the most appropriate style (General, Realistic, or Design)',
            category: 'intelligent'
          },
          { 
            value: 'GENERAL', 
            label: 'General', 
            description: 'Versatile style for artistic works, abstract paintings, pencil sketches, digitally manipulated images',
            category: 'artistic'
          },
          { 
            value: 'REALISTIC', 
            label: 'Realistic', 
            description: 'Best for lifelike, photographic images with emphasis on realism and detail',
            category: 'photographic'
          },
          { 
            value: 'DESIGN', 
            label: 'Design', 
            description: 'Perfect for logos, print-on-demand products, promotional materials, flyers, menus, graphic design',
            category: 'commercial'
          }
        ],
        specialFeatures: [
          {
            type: 'reference_style',
            name: 'Reference Style',
            description: 'Use up to 3 images as visual style basis',
            maxImages: 3,
            supported: true
          },
          {
            type: 'style_codes',
            name: 'Style Codes',
            description: '8-character codes from Random generations that can be reused',
            format: '8-character hex',
            supported: true
          },
          {
            type: 'random_style',
            name: 'Random Style',
            description: 'AI randomly selects style and generates reusable style code',
            supported: true
          }
        ]
      },
      
      'v2': {
        // v2.0 and v2a styles - specialized AI models
        coreStyles: [
          { 
            value: 'AUTO', 
            label: 'Auto (AI Decides)', 
            description: 'AI chooses the most appropriate specialized model for your prompt',
            category: 'intelligent'
          },
          { 
            value: 'GENERAL', 
            label: 'General', 
            description: 'Versatile style that can handle most content types',
            category: 'artistic'
          },
          { 
            value: 'REALISTIC', 
            label: 'Realistic', 
            description: 'Specialized model for photorealistic images',
            category: 'photographic'
          },
          { 
            value: 'DESIGN', 
            label: 'Design', 
            description: 'Specialized model for graphic design and commercial applications',
            category: 'commercial'
          },
          { 
            value: '3D', 
            label: '3D', 
            description: 'Specialized model for 3D characters, objects, and visual appeal',
            category: 'dimensional'
          },
          { 
            value: 'ANIME', 
            label: 'Anime', 
            description: 'Specialized model for anime-style images and characters',
            category: 'stylized'
          }
        ],
        specialFeatures: [
          {
            type: 'style_codes',
            name: 'Style Codes',
            description: 'Limited style code support',
            supported: false // v2 has limited style code support
          }
        ]
      },
      
      'v2a': {
        // v2a (turbo) - subset of v2 styles
        coreStyles: [
          { 
            value: 'AUTO', 
            label: 'Auto (AI Decides)', 
            description: 'AI chooses the most appropriate style for faster generation',
            category: 'intelligent'
          },
          { 
            value: 'GENERAL', 
            label: 'General', 
            description: 'Fast versatile style',
            category: 'artistic'
          },
          { 
            value: 'REALISTIC', 
            label: 'Realistic', 
            description: 'Fast photorealistic generation',
            category: 'photographic'
          },
          { 
            value: '3D', 
            label: '3D', 
            description: 'Fast 3D style generation',
            category: 'dimensional'
          },
          { 
            value: 'ANIME', 
            label: 'Anime', 
            description: 'Fast anime style generation',
            category: 'stylized'
          }
        ],
        specialFeatures: []
      },
      
      'v1': {
        // v1.0 styles - extensive style library with keyword injection
        coreStyles: [
          { 
            value: 'RANDOM', 
            label: 'Random', 
            description: 'AI randomly selects from vast style database and generates style codes',
            category: 'experimental'
          },
          { 
            value: 'GENERAL', 
            label: 'General', 
            description: 'Versatile style for most content',
            category: 'artistic'
          },
          { 
            value: 'REALISTIC', 
            label: 'Realistic', 
            description: 'Photorealistic images',
            category: 'photographic'
          },
          { 
            value: 'DESIGN', 
            label: 'Design', 
            description: 'Graphic design and illustrations',
            category: 'commercial'
          }
        ],
        extendedStyles: [
          { value: '3D_RENDER', label: '3D Render', description: '3D rendered style', category: 'dimensional' },
          { value: 'ANIME', label: 'Anime', description: 'Anime and manga style', category: 'stylized' },
          { value: 'ARCHITECTURE', label: 'Architecture', description: 'Architectural visualization', category: 'specialized' },
          { value: 'CINEMATIC', label: 'Cinematic', description: 'Movie-like dramatic lighting', category: 'cinematic' },
          { value: 'CONCEPTUAL_ART', label: 'Conceptual Art', description: 'Abstract conceptual artwork', category: 'artistic' },
          { value: 'DARK_FANTASY', label: 'Dark Fantasy', description: 'Gothic and dark fantasy themes', category: 'stylized' },
          { value: 'FASHION', label: 'Fashion', description: 'Fashion photography and styling', category: 'photographic' },
          { value: 'GRAFFITI', label: 'Graffiti', description: 'Street art and graffiti style', category: 'artistic' },
          { value: 'ILLUSTRATION', label: 'Illustration', description: 'Digital illustration style', category: 'artistic' },
          { value: 'PAINTING', label: 'Painting', description: 'Traditional painting techniques', category: 'artistic' },
          { value: 'PHOTO', label: 'Photo', description: 'Photographic style', category: 'photographic' },
          { value: 'PORTRAIT_PHOTOGRAPHY', label: 'Portrait Photography', description: 'Professional portrait style', category: 'photographic' },
          { value: 'POSTER', label: 'Poster', description: 'Poster and advertisement design', category: 'commercial' },
          { value: 'PRODUCT', label: 'Product', description: 'Product photography style', category: 'commercial' },
          { value: 'TYPOGRAPHY', label: 'Typography', description: 'Text and typography focus', category: 'commercial' },
          { value: 'UKIYO_E', label: 'Ukiyo-e', description: 'Traditional Japanese art style', category: 'stylized' },
          { value: 'VIBRANT', label: 'Vibrant', description: 'Bright and colorful style', category: 'artistic' },
          { value: 'WILDLIFE_PHOTOGRAPHY', label: 'Wildlife Photography', description: 'Nature and wildlife photography', category: 'photographic' }
        ],
        specialFeatures: [
          {
            type: 'reference_style',
            name: 'Reference Style',
            description: 'Use up to 3 existing images as visual style basis',
            maxImages: 3,
            supported: true
          },
          {
            type: 'style_codes',
            name: 'Style Codes',
            description: '8-character codes from Random generations, adds keywords to prompt',
            format: '8-character hex',
            supported: true,
            behavior: 'keyword_injection'
          },
          {
            type: 'multiple_selection',
            name: 'Multiple Styles',
            description: 'Can select and apply multiple styles simultaneously',
            supported: true
          }
        ]
      }
    };

    // Normalize version string
    const config = this.getIdeogramVersionConfig(modelVersion);
    const versionKey = config.isLegacy ? (modelVersion.includes('2a') ? 'v2a' : modelVersion.includes('1') ? 'v1' : 'v2') : 'v3';
    
    const versionData = styleDefinitions[versionKey] || styleDefinitions['v3'];
    
    // Combine core and extended styles
    let allStyles = [...versionData.coreStyles];
    if (versionData.extendedStyles) {
      allStyles = allStyles.concat(versionData.extendedStyles);
    }
    
    return allStyles;
  }

  // Get version-specific style features and capabilities
  getIdeogramStyleFeatures(modelVersion = 'v2') {
    const config = this.getIdeogramVersionConfig(modelVersion);
    const versionKey = config.isLegacy ? (modelVersion.includes('2a') ? 'v2a' : modelVersion.includes('1') ? 'v1' : 'v2') : 'v3';
    
    const styleDefinitions = {
      'v3': {
        referenceStyle: { supported: true, maxImages: 3 },
        styleCodes: { supported: true, format: '8-character', behavior: 'direct' },
        randomStyle: { supported: true, generatesStyleCodes: true },
        multipleSelection: { supported: false }
      },
      'v2': {
        referenceStyle: { supported: false },
        styleCodes: { supported: false },
        randomStyle: { supported: false },
        multipleSelection: { supported: false }
      },
      'v2a': {
        referenceStyle: { supported: false },
        styleCodes: { supported: false },
        randomStyle: { supported: false },
        multipleSelection: { supported: false }
      },
      'v1': {
        referenceStyle: { supported: true, maxImages: 3 },
        styleCodes: { supported: true, format: '8-character', behavior: 'keyword_injection' },
        randomStyle: { supported: true, generatesStyleCodes: true },
        multipleSelection: { supported: true }
      }
    };
    
    return styleDefinitions[versionKey] || styleDefinitions['v3'];
  }

  // Utility method to get available aspect ratios by version
  getAspectRatios(modelVersion = 'v2') {
    // Based on actual API responses and documentation
    const commonRatios = {
      // Legacy API (v1/v2) - From actual API error message
      legacy: [
        { value: '1:1', label: 'Square (1:1)', description: 'Perfect for social media posts and profile images' },
        { value: '16:9', label: 'Landscape (16:9)', description: 'Great for blog headers and wide displays' },
        { value: '9:16', label: 'Portrait (9:16)', description: 'Mobile-friendly vertical format' },
        { value: '4:3', label: 'Standard (4:3)', description: 'Classic photo format' },
        { value: '3:2', label: 'Photo (3:2)', description: 'Traditional photography ratio' },
        { value: '2:3', label: 'Tall Portrait (2:3)', description: 'Vertical content and posters' },
        { value: '3:1', label: 'Wide Banner (3:1)', description: 'Banner and header images' },
        { value: '1:3', label: 'Tall Banner (1:3)', description: 'Vertical banners and sidebars' },
        { value: '3:4', label: 'Portrait Standard (3:4)', description: 'Standard portrait orientation' },
        { value: '10:16', label: 'Portrait (10:16)', description: 'Tall portrait format' },
        { value: '16:10', label: 'Wide (16:10)', description: 'Wide landscape format' }
      ],
      // V3 API - From official documentation
      v3: [
        { value: '1:1', label: 'Square (1:1)', description: 'Perfect for social media posts and profile images' },
        { value: '16:9', label: 'Landscape (16:9)', description: 'Great for blog headers and wide displays' },
        { value: '9:16', label: 'Portrait (9:16)', description: 'Mobile-friendly vertical format' },
        { value: '4:3', label: 'Standard (4:3)', description: 'Classic photo format' },
        { value: '3:2', label: 'Photo (3:2)', description: 'Traditional photography ratio' },
        { value: '2:3', label: 'Tall Portrait (2:3)', description: 'Vertical content and posters' },
        { value: '3:1', label: 'Wide Banner (3:1)', description: 'Banner and header images' },
        { value: '1:3', label: 'Tall Banner (1:3)', description: 'Vertical banners and sidebars' },
        { value: '3:4', label: 'Portrait Standard (3:4)', description: 'Standard portrait orientation' },
        { value: '4:5', label: 'Instagram Portrait (4:5)', description: 'Instagram portrait posts' },
        { value: '5:4', label: 'Instagram Landscape (5:4)', description: 'Instagram landscape posts' },
        { value: '10:16', label: 'Portrait (10:16)', description: 'Tall portrait format' },
        { value: '16:10', label: 'Wide (16:10)', description: 'Wide landscape format' },
        { value: '1:2', label: 'Vertical Banner (1:2)', description: 'Tall vertical content' },
        { value: '2:1', label: 'Banner (2:1)', description: 'Web banners and covers' }
      ]
    };

    // Determine which set to use based on version
    const config = this.getIdeogramVersionConfig(modelVersion);
    return config.isLegacy ? commonRatios.legacy : commonRatios.v3;
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