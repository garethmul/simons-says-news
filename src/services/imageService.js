import axios from 'axios';

class ImageService {
  constructor() {
    this.pexelsApiKey = process.env.PEXELS_API_KEY;
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

  async getImageStats() {
    try {
      console.log('📊 Getting image usage statistics...');
      
      // This would typically query your database for image usage stats
      // For now, return a placeholder structure
      return {
        totalImages: 0,
        imagesThisWeek: 0,
        topQueries: [],
        storageUsed: '0 MB',
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('❌ Error getting image stats:', error.message);
      throw error;
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
}

// Create singleton instance
const imageService = new ImageService();

export default imageService; 