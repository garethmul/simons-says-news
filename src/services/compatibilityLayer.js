// Compatibility Layer - Stage 1

import legacyContentGenerator from '../legacy/services/contentGenerator-legacy.js';
import dualWriteService from './dualWriteService.js';
import db from './database.js';

/**
 * COMPATIBILITY LAYER - UPDATED FOR STAGE 2
 * 
 * This layer determines whether to use the legacy content generation system
 * or the modern workflow system based on account configuration.
 * 
 * Stage 2 Updates:
 * - Integrated dual-write service for seamless data migration
 * - Enhanced routing logic for mixed legacy/modern systems
 * - Improved monitoring and statistics
 */
class CompatibilityLayer {
  constructor() {
    this.modernWorkflowEngine = null; // Will be set when modern system is ready
    this.enableDualWrite = process.env.ENABLE_DUAL_WRITE !== 'false'; // Default: enabled
  }

  /**
   * Main content generation entry point
   * Routes to either legacy, dual-write, or modern system based on account configuration
   */
  async generateContent(article, blogId, accountId = null) {
    console.log(`🔄 [COMPATIBILITY] Determining generation method for account: ${accountId}`);
    
    try {
      // Check if account has modern templates configured
      const hasModernTemplates = await this.checkForModernTemplates(accountId);
      
      if (hasModernTemplates && this.modernWorkflowEngine) {
        console.log(`✨ [COMPATIBILITY] Using modern workflow system for account: ${accountId}`);
        return await this.modernWorkflowEngine.execute(article, blogId, accountId);
      } else if (this.enableDualWrite) {
        console.log(`🔄 [COMPATIBILITY] Using dual-write system for account: ${accountId}`);
        return await this.generateContentWithDualWrite(article, blogId, accountId);
      } else {
        console.log(`🔄 [COMPATIBILITY] Using legacy system for account: ${accountId}`);
        return await this.generateLegacyContent(article, blogId, accountId);
      }
    } catch (error) {
      console.error(`❌ [COMPATIBILITY] Error in generateContent for account ${accountId}:`, error.message);
      
      // Fallback to legacy system on error
      console.log(`🔄 [COMPATIBILITY] Falling back to legacy system due to error`);
      return await this.generateLegacyContent(article, blogId, accountId);
    }
  }

  /**
   * Generate content using dual-write system (Stage 2)
   */
  async generateContentWithDualWrite(article, blogId, accountId = null) {
    console.log(`🔄 [COMPATIBILITY] Executing dual-write content generation...`);
    
    try {
      const results = {};

      // Generate social posts using dual-write
      const socialResult = await this.generateSocialMediaWithDualWrite(article, blogId, accountId);
      results.socialPosts = socialResult.legacy;
      results.socialMediaModern = socialResult.modern;

      // Generate video scripts using dual-write
      const videoResult = await this.generateVideoScriptsWithDualWrite(article, blogId, accountId);
      results.videoScripts = videoResult.legacy;
      results.videoScriptsModern = videoResult.modern;

      // Add dual-write metadata
      results._dualWrite = true;
      results._system = 'dual_write';
      results._generatedTypes = ['socialPosts', 'videoScripts'];
      results._modernIds = {
        socialMedia: socialResult.modern,
        videoScripts: videoResult.modern
      };

      console.log(`✅ [COMPATIBILITY] Dual-write content generation complete: ${results._generatedTypes.length} types`);
      return results;
    } catch (error) {
      console.error(`❌ [COMPATIBILITY] Dual-write content generation failed:`, error.message);
      
      // Fallback to legacy-only
      console.log(`🔄 [COMPATIBILITY] Falling back to legacy-only generation...`);
      return await this.generateLegacyContent(article, blogId, accountId);
    }
  }

  /**
   * Generate social media content with dual-write
   */
  async generateSocialMediaWithDualWrite(article, blogId, accountId = null) {
    try {
      // Generate content using AI
      const socialContent = await this.generateSocialMediaAI(article, blogId);
      
      // Parse the content
      const parsedContent = this.parseSocialMediaContent(socialContent);
      
      // Prepare data for dual-write
      const contentData = {
        article,
        blogId,
        platforms: ['facebook', 'instagram', 'linkedin'],
        parsedContent
      };

      // Write to both legacy and modern systems
      return await dualWriteService.writeSocialMediaContent(contentData, accountId);
      
    } catch (error) {
      console.error(`❌ [COMPATIBILITY] Social media dual-write failed:`, error.message);
      
      // Fallback to legacy-only
      return {
        legacy: await legacyContentGenerator.generateSocialPostsWithAccount(article, blogId, accountId),
        modern: null,
        dualWrite: false,
        fallback: true
      };
    }
  }

  /**
   * Generate video scripts with dual-write
   */
  async generateVideoScriptsWithDualWrite(article, blogId, accountId = null) {
    try {
      const videoConfigs = [
        { duration: 30, type: 'short-form' },
        { duration: 60, type: 'short-form' },
        { duration: 120, type: 'long-form' }
      ];

      // Generate scripts using AI
      const parsedVideos = [];
      for (const config of videoConfigs) {
        const videoContent = await this.generateVideoScriptAI(article, config.duration, blogId);
        const parsedVideo = this.parseVideoScriptContent(videoContent, config.duration);
        parsedVideos.push(parsedVideo);
      }

      // Prepare data for dual-write
      const contentData = {
        article,
        blogId,
        videoConfigs,
        parsedVideos
      };

      // Write to both legacy and modern systems
      return await dualWriteService.writeVideoScriptContent(contentData, accountId);
      
    } catch (error) {
      console.error(`❌ [COMPATIBILITY] Video script dual-write failed:`, error.message);
      
      // Fallback to legacy-only
      return {
        legacy: await legacyContentGenerator.generateVideoScriptsWithAccount(article, blogId, accountId),
        modern: null,
        dualWrite: false,
        fallback: true
      };
    }
  }

  // ============================================================================
  // AI GENERATION HELPERS
  // ============================================================================

  async generateSocialMediaAI(article, blogId) {
    // Import AI service dynamically to avoid circular dependencies
    const aiService = (await import('./aiService.js')).default;
    return await aiService.generateSocialMediaPosts(article, blogId);
  }

  async generateVideoScriptAI(article, duration, blogId) {
    // Import AI service dynamically to avoid circular dependencies
    const aiService = (await import('./aiService.js')).default;
    return await aiService.generateVideoScript(article, duration, blogId);
  }

  parseSocialMediaContent(content) {
    try {
      let cleanContent = content.trim();
      
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.log('⚠️ AI response is not JSON, using fallback structure');
      
      const fallbackText = content.substring(0, 200).replace(/```json|```/g, '').trim();
      return {
        facebook: { text: fallbackText, hashtags: ['#ChristianFaith', '#Eden'] },
        instagram: { text: fallbackText, hashtags: ['#ChristianLife', '#Eden'] },
        linkedin: { text: fallbackText, hashtags: ['#ChristianFaith', '#Eden'] }
      };
    }
  }

  parseVideoScriptContent(content, duration) {
    try {
      return JSON.parse(content);
    } catch {
      return {
        title: `${duration}s Video Script`,
        script: content,
        visualSuggestions: []
      };
    }
  }

  /**
   * Check if account has modern templates configured
   */
  async checkForModernTemplates(accountId) {
    if (!accountId) {
      return false; // No account means legacy mode
    }

    try {
      // Check if account has any prompt templates
      const templates = await db.query(`
        SELECT COUNT(*) as count 
        FROM ssnews_prompt_templates 
        WHERE account_id = ? AND is_active = TRUE
      `, [accountId]);

      return templates[0].count > 0;
    } catch (error) {
      console.warn(`⚠️ [COMPATIBILITY] Could not check for modern templates: ${error.message}`);
      return false; // Default to legacy on error
    }
  }

  /**
   * Generate content using the legacy system
   */
  async generateLegacyContent(article, blogId, accountId = null) {
    console.log(`🔄 [COMPATIBILITY] Executing legacy content generation...`);
    
    try {
      const results = {};

      // Generate social posts using legacy method
      const socialPosts = await legacyContentGenerator.generateSocialPostsWithAccount(article, blogId, accountId);
      results.socialPosts = socialPosts;

      // Generate video scripts using legacy method
      const videoScripts = await legacyContentGenerator.generateVideoScriptsWithAccount(article, blogId, accountId);
      results.videoScripts = videoScripts;

      // Add legacy metadata
      results._legacy = true;
      results._system = 'legacy';
      results._generatedTypes = ['socialPosts', 'videoScripts'];

      console.log(`✅ [COMPATIBILITY] Legacy content generation complete: ${results._generatedTypes.length} types`);
      return results;
    } catch (error) {
      console.error(`❌ [COMPATIBILITY] Legacy content generation failed:`, error.message);
      return {
        _legacy: true,
        _system: 'legacy',
        _error: error.message,
        socialPosts: [],
        videoScripts: []
      };
    }
  }

  /**
   * Generate evergreen content (always uses legacy for now)
   */
  async generateEvergreenContent(category, count = 1, accountId = null) {
    console.log(`🌲 [COMPATIBILITY] Generating evergreen content (legacy system)`);
    return await legacyContentGenerator.generateEvergreenContent(category, count, accountId);
  }

  /**
   * Set the modern workflow engine when it's ready
   */
  setModernWorkflowEngine(engine) {
    this.modernWorkflowEngine = engine;
    console.log(`✨ [COMPATIBILITY] Modern workflow engine registered`);
  }

  /**
   * Enable/disable dual-write mode
   */
  setDualWriteMode(enabled) {
    this.enableDualWrite = enabled;
    dualWriteService.setDualWriteMode(enabled);
    console.log(`🔄 [COMPATIBILITY] Dual-write mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check system health and configuration
   */
  async getSystemHealth() {
    try {
      const health = {
        legacy: {
          available: true,
          methods: ['generateSocialPosts', 'generateVideoScripts', 'generateEvergreenContent']
        },
        modern: {
          available: !!this.modernWorkflowEngine,
          templates: await this.countModernTemplates()
        },
        dualWrite: {
          enabled: this.enableDualWrite,
          available: dualWriteService.isDualWriteEnabled(),
          stats: await dualWriteService.getDualWriteStats()
        },
        database: {
          legacyTables: await this.checkLegacyTables(),
          modernTables: await this.checkModernTables()
        }
      };

      return health;
    } catch (error) {
      console.error(`❌ [COMPATIBILITY] Error checking system health:`, error.message);
      return {
        legacy: { available: false, error: error.message },
        modern: { available: false, error: error.message },
        dualWrite: { enabled: false, error: error.message },
        database: { error: error.message }
      };
    }
  }

  /**
   * Get comprehensive generation statistics
   */
  async getGenerationStats(accountId = null) {
    try {
      const legacyStats = await this.getLegacyStats(accountId);
      const modernStats = await this.getModernStats(accountId);
      const dualWriteStats = await dualWriteService.getDualWriteStats(accountId);

      return {
        legacy: legacyStats,
        modern: modernStats,
        dualWrite: dualWriteStats,
        total: {
          articles: legacyStats.articles + modernStats.articles,
          socialPosts: legacyStats.socialPosts + modernStats.socialPosts,
          videoScripts: legacyStats.videoScripts + modernStats.videoScripts
        },
        migration: {
          dualWriteEnabled: this.enableDualWrite,
          modernSystemReady: !!this.modernWorkflowEngine
        }
      };
    } catch (error) {
      console.error(`❌ [COMPATIBILITY] Error getting generation stats:`, error.message);
      return {
        legacy: { articles: 0, socialPosts: 0, videoScripts: 0 },
        modern: { articles: 0, socialPosts: 0, videoScripts: 0 },
        dualWrite: { error: error.message },
        total: { articles: 0, socialPosts: 0, videoScripts: 0 }
      };
    }
  }

  async getLegacyStats(accountId = null) {
    try {
      const whereClause = accountId ? 'WHERE account_id = ?' : 'WHERE 1=1';
      const params = accountId ? [accountId] : [];

      const articles = await db.query(`
        SELECT COUNT(*) as count FROM ssnews_generated_articles ${whereClause}
      `, params);

      const socialPosts = await db.query(`
        SELECT COUNT(*) as count FROM ssnews_generated_social_posts ${whereClause}
      `, params);

      const videoScripts = await db.query(`
        SELECT COUNT(*) as count FROM ssnews_generated_video_scripts ${whereClause}
      `, params);

      return {
        articles: articles[0].count,
        socialPosts: socialPosts[0].count,
        videoScripts: videoScripts[0].count
      };
    } catch (error) {
      console.error(`❌ [COMPATIBILITY] Error getting legacy stats:`, error.message);
      return { articles: 0, socialPosts: 0, videoScripts: 0 };
    }
  }

  async getModernStats(accountId = null) {
    try {
      const whereClause = accountId ? 'WHERE account_id = ?' : 'WHERE 1=1';
      const params = accountId ? [accountId] : [];

      const genericContent = await db.query(`
        SELECT prompt_category, COUNT(*) as count 
        FROM ssnews_generated_content ${whereClause}
        GROUP BY prompt_category
      `, params);

      const stats = { articles: 0, socialPosts: 0, videoScripts: 0, other: 0 };

      genericContent.forEach(row => {
        switch (row.prompt_category) {
          case 'blog_post':
          case 'article':
            stats.articles += row.count;
            break;
          case 'social_media':
          case 'social_posts':
            stats.socialPosts += row.count;
            break;
          case 'video_script':
          case 'video_scripts':
            stats.videoScripts += row.count;
            break;
          default:
            stats.other += row.count;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error(`❌ [COMPATIBILITY] Error getting modern stats:`, error.message);
      return { articles: 0, socialPosts: 0, videoScripts: 0, other: 0 };
    }
  }

  async countModernTemplates() {
    try {
      const result = await db.query(`
        SELECT COUNT(*) as count FROM ssnews_prompt_templates WHERE is_active = TRUE
      `);
      return result[0].count;
    } catch (error) {
      return 0;
    }
  }

  async checkLegacyTables() {
    try {
      const tables = ['ssnews_generated_social_posts', 'ssnews_generated_video_scripts'];
      const results = {};

      for (const table of tables) {
        const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        results[table] = result[0].count;
      }

      return results;
    } catch (error) {
      return { error: error.message };
    }
  }

  async checkModernTables() {
    try {
      const result = await db.query(`SELECT COUNT(*) as count FROM ssnews_generated_content`);
      return { ssnews_generated_content: result[0].count };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Create singleton instance
const compatibilityLayer = new CompatibilityLayer();

export default compatibilityLayer;
