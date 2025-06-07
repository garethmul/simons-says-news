import db from './database.js';

/**
 * DUAL-WRITE SERVICE - STAGE 2
 * 
 * This service writes content to both legacy tables and the modern
 * ssnews_generated_content table, ensuring data consistency during
 * the transition period.
 * 
 * Features:
 * - Atomic transactions across both systems
 * - Rollback on failure
 * - Data transformation between legacy and modern formats
 * - Comprehensive logging
 */
class DualWriteService {
  constructor() {
    this.enableDualWrite = process.env.ENABLE_DUAL_WRITE !== 'false'; // Default: enabled
    this.prioritizeModern = process.env.PRIORITIZE_MODERN === 'true'; // Default: legacy priority
  }

  /**
   * Write social media content to both legacy and modern tables
   */
  async writeSocialMediaContent(contentData, accountId = null) {
    console.log('📝 [DUAL-WRITE] Writing social media content to both systems...');
    
    if (!this.enableDualWrite) {
      console.log('⚠️ [DUAL-WRITE] Dual-write disabled, using legacy only');
      return await this.writeLegacySocialMedia(contentData, accountId);
    }

    const transaction = await db.beginTransaction();
    
    try {
      // Write to legacy table first (for backwards compatibility)
      const legacyIds = await this.writeLegacySocialMediaInTransaction(contentData, accountId, transaction);
      
      // Transform and write to modern table
      const modernData = this.transformSocialMediaToModern(contentData, legacyIds);
      const modernId = await this.writeModernContentInTransaction(modernData, accountId, transaction);
      
      // Commit transaction
      await db.commitTransaction(transaction);
      
      console.log(`✅ [DUAL-WRITE] Social media content written successfully`);
      console.log(`   Legacy IDs: [${legacyIds.join(', ')}]`);
      console.log(`   Modern ID: ${modernId}`);
      
      return {
        legacy: legacyIds,
        modern: modernId,
        dualWrite: true
      };
      
    } catch (error) {
      await db.rollbackTransaction(transaction);
      console.error('❌ [DUAL-WRITE] Failed to write social media content:', error.message);
      
      // Fallback to legacy-only write
      console.log('🔄 [DUAL-WRITE] Falling back to legacy-only write...');
      return await this.writeLegacySocialMedia(contentData, accountId);
    }
  }

  /**
   * Write video script content to both legacy and modern tables
   */
  async writeVideoScriptContent(contentData, accountId = null) {
    console.log('🎬 [DUAL-WRITE] Writing video script content to both systems...');
    
    if (!this.enableDualWrite) {
      console.log('⚠️ [DUAL-WRITE] Dual-write disabled, using legacy only');
      return await this.writeLegacyVideoScript(contentData, accountId);
    }

    const transaction = await db.beginTransaction();
    
    try {
      // Write to legacy table first
      const legacyIds = await this.writeLegacyVideoScriptsInTransaction(contentData, accountId, transaction);
      
      // Transform and write to modern table
      const modernData = this.transformVideoScriptsToModern(contentData, legacyIds);
      const modernId = await this.writeModernContentInTransaction(modernData, accountId, transaction);
      
      // Commit transaction
      await db.commitTransaction(transaction);
      
      console.log(`✅ [DUAL-WRITE] Video script content written successfully`);
      console.log(`   Legacy IDs: [${legacyIds.join(', ')}]`);
      console.log(`   Modern ID: ${modernId}`);
      
      return {
        legacy: legacyIds,
        modern: modernId,
        dualWrite: true
      };
      
    } catch (error) {
      await db.rollbackTransaction(transaction);
      console.error('❌ [DUAL-WRITE] Failed to write video script content:', error.message);
      
      // Fallback to legacy-only write
      console.log('🔄 [DUAL-WRITE] Falling back to legacy-only write...');
      return await this.writeLegacyVideoScript(contentData, accountId);
    }
  }

  /**
   * Write generic content to modern table only
   */
  async writeGenericContent(category, contentData, metadata, blogId, accountId = null) {
    console.log(`📊 [DUAL-WRITE] Writing generic content (${category}) to modern system...`);
    
    const modernData = {
      category,
      contentData,
      metadata,
      blogId,
      status: 'draft'
    };
    
    try {
      const modernId = await this.writeModernContent(modernData, accountId);
      
      console.log(`✅ [DUAL-WRITE] Generic content written successfully (ID: ${modernId})`);
      
      return {
        modern: modernId,
        legacy: null,
        dualWrite: false,
        generic: true
      };
      
    } catch (error) {
      console.error(`❌ [DUAL-WRITE] Failed to write generic content:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // LEGACY WRITE METHODS
  // ============================================================================

  async writeLegacySocialMedia(contentData, accountId = null) {
    const { article, blogId, platforms, parsedContent } = contentData;
    const socialPosts = [];

    for (const platform of platforms) {
      try {
        const platformContent = parsedContent[platform] || parsedContent;
        const text = platformContent.text || '';
        const hashtags = platformContent.hashtags || [];
        
        const postData = {
          based_on_gen_article_id: blogId,
          platform,
          text_draft: `${text}\n\n${hashtags.join(' ')}`,
          emotional_hook_present_ai_check: platform !== 'linkedin',
          status: 'draft'
        };

        const postId = accountId 
          ? await db.insertWithAccount('ssnews_generated_social_posts', postData, accountId)
          : await db.insert('ssnews_generated_social_posts', postData);

        socialPosts.push({
          id: postId,
          platform,
          content: { text, hashtags }
        });

      } catch (error) {
        console.error(`❌ Error creating ${platform} post:`, error.message);
      }
    }

    return socialPosts.map(post => post.id);
  }

  async writeLegacySocialMediaInTransaction(contentData, accountId, transaction) {
    const { article, blogId, platforms, parsedContent } = contentData;
    const socialPostIds = [];

    for (const platform of platforms) {
      try {
        const platformContent = parsedContent[platform] || parsedContent;
        const text = platformContent.text || '';
        const hashtags = platformContent.hashtags || [];
        
        const postData = {
          based_on_gen_article_id: blogId,
          platform,
          text_draft: `${text}\n\n${hashtags.join(' ')}`,
          emotional_hook_present_ai_check: platform !== 'linkedin',
          status: 'draft'
        };

        const postId = accountId 
          ? await db.insertWithAccountInTransaction('ssnews_generated_social_posts', postData, accountId, transaction)
          : await db.insertInTransaction('ssnews_generated_social_posts', postData, transaction);

        socialPostIds.push(postId);

      } catch (error) {
        console.error(`❌ Error creating ${platform} post in transaction:`, error.message);
        throw error;
      }
    }

    return socialPostIds;
  }

  async writeLegacyVideoScript(contentData, accountId = null) {
    const { article, blogId, videoConfigs, parsedVideos } = contentData;
    const videoScriptIds = [];

    for (let i = 0; i < videoConfigs.length; i++) {
      try {
        const config = videoConfigs[i];
        const parsedVideo = parsedVideos[i];
        
        const scriptData = {
          based_on_gen_article_id: blogId,
          title: parsedVideo.title,
          duration_target_seconds: config.duration,
          script_draft: parsedVideo.script,
          visual_suggestions: JSON.stringify(parsedVideo.visualSuggestions || []),
          status: 'draft'
        };

        const scriptId = accountId 
          ? await db.insertWithAccount('ssnews_generated_video_scripts', scriptData, accountId)
          : await db.insert('ssnews_generated_video_scripts', scriptData);

        videoScriptIds.push(scriptId);

      } catch (error) {
        console.error(`❌ Error creating video script:`, error.message);
      }
    }

    return videoScriptIds;
  }

  async writeLegacyVideoScriptsInTransaction(contentData, accountId, transaction) {
    const { article, blogId, videoConfigs, parsedVideos } = contentData;
    const videoScriptIds = [];

    for (let i = 0; i < videoConfigs.length; i++) {
      try {
        const config = videoConfigs[i];
        const parsedVideo = parsedVideos[i];
        
        const scriptData = {
          based_on_gen_article_id: blogId,
          title: parsedVideo.title,
          duration_target_seconds: config.duration,
          script_draft: parsedVideo.script,
          visual_suggestions: JSON.stringify(parsedVideo.visualSuggestions || []),
          status: 'draft'
        };

        const scriptId = accountId 
          ? await db.insertWithAccountInTransaction('ssnews_generated_video_scripts', scriptData, accountId, transaction)
          : await db.insertInTransaction('ssnews_generated_video_scripts', scriptData, transaction);

        videoScriptIds.push(scriptId);

      } catch (error) {
        console.error(`❌ Error creating video script in transaction:`, error.message);
        throw error;
      }
    }

    return videoScriptIds;
  }

  // ============================================================================
  // MODERN WRITE METHODS
  // ============================================================================

  async writeModernContent(data, accountId = null) {
    const { category, contentData, metadata, blogId, status = 'draft' } = data;
    
    const insertData = {
      based_on_gen_article_id: blogId,
      prompt_category: category,
      content_data: JSON.stringify(contentData),
      metadata: JSON.stringify(metadata),
      status,
      created_at: new Date(),
      updated_at: new Date()
    };

    const contentId = accountId 
      ? await db.insertWithAccount('ssnews_generated_content', insertData, accountId)
      : await db.insert('ssnews_generated_content', insertData);

    return contentId;
  }

  async writeModernContentInTransaction(data, accountId, transaction) {
    const { category, contentData, metadata, blogId, status = 'draft' } = data;
    
    const insertData = {
      based_on_gen_article_id: blogId,
      prompt_category: category,
      content_data: JSON.stringify(contentData),
      metadata: JSON.stringify(metadata),
      status,
      created_at: new Date(),
      updated_at: new Date()
    };

    const contentId = accountId 
      ? await db.insertWithAccountInTransaction('ssnews_generated_content', insertData, accountId, transaction)
      : await db.insertInTransaction('ssnews_generated_content', insertData, transaction);

    return contentId;
  }

  // ============================================================================
  // DATA TRANSFORMATION METHODS
  // ============================================================================

  transformSocialMediaToModern(contentData, legacyIds) {
    const { article, blogId, platforms, parsedContent } = contentData;
    
    const transformedContent = platforms.map((platform, index) => {
      const platformContent = parsedContent[platform] || parsedContent;
      return {
        platform,
        text: platformContent.text || '',
        hashtags: platformContent.hashtags || [],
        legacy_id: legacyIds[index] || null,
        order: index + 1
      };
    });

    return {
      category: 'social_media',
      contentData: transformedContent,
      metadata: {
        source: 'dual_write_migration',
        legacy_ids: legacyIds,
        platforms: platforms,
        generated_at: new Date().toISOString(),
        article_title: article?.title || 'Unknown'
      },
      blogId
    };
  }

  transformVideoScriptsToModern(contentData, legacyIds) {
    const { article, blogId, videoConfigs, parsedVideos } = contentData;
    
    const transformedContent = videoConfigs.map((config, index) => {
      const parsedVideo = parsedVideos[index];
      return {
        title: parsedVideo.title,
        script: parsedVideo.script,
        duration_seconds: config.duration,
        type: config.type,
        visual_suggestions: parsedVideo.visualSuggestions || [],
        legacy_id: legacyIds[index] || null,
        order: index + 1
      };
    });

    return {
      category: 'video_script',
      contentData: transformedContent,
      metadata: {
        source: 'dual_write_migration',
        legacy_ids: legacyIds,
        total_scripts: videoConfigs.length,
        generated_at: new Date().toISOString(),
        article_title: article?.title || 'Unknown'
      },
      blogId
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if dual-write is enabled
   */
  isDualWriteEnabled() {
    return this.enableDualWrite;
  }

  /**
   * Enable/disable dual-write mode
   */
  setDualWriteMode(enabled) {
    this.enableDualWrite = enabled;
    console.log(`🔄 [DUAL-WRITE] Mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get dual-write statistics
   */
  async getDualWriteStats(accountId = null) {
    try {
      const whereClause = accountId ? 'WHERE account_id = ?' : 'WHERE 1=1';
      const params = accountId ? [accountId] : [];

      // Count modern content with dual-write metadata
      const modernWithDualWrite = await db.query(`
        SELECT COUNT(*) as count 
        FROM ssnews_generated_content 
        ${whereClause}
        AND JSON_EXTRACT(metadata, '$.source') = 'dual_write_migration'
      `, params);

      // Count legacy social posts
      const legacySocial = await db.query(`
        SELECT COUNT(*) as count 
        FROM ssnews_generated_social_posts 
        ${whereClause}
      `, params);

      // Count legacy video scripts
      const legacyVideo = await db.query(`
        SELECT COUNT(*) as count 
        FROM ssnews_generated_video_scripts 
        ${whereClause}
      `, params);

      return {
        dualWriteEnabled: this.enableDualWrite,
        modernDualWriteEntries: modernWithDualWrite[0].count,
        legacySocialPosts: legacySocial[0].count,
        legacyVideoScripts: legacyVideo[0].count,
        accountId
      };
      
    } catch (error) {
      console.error('❌ [DUAL-WRITE] Error getting stats:', error.message);
      return {
        error: error.message,
        dualWriteEnabled: this.enableDualWrite
      };
    }
  }
}

// Create singleton instance
const dualWriteService = new DualWriteService();

export default dualWriteService; 