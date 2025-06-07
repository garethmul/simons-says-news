import db from './database.js';

/**
 * DATA MIGRATION SERVICE - STAGE 2
 * 
 * This service migrates data from legacy content-specific tables
 * to the modern ssnews_generated_content table without losing data.
 * 
 * Features:
 * - Migrates social media posts from ssnews_generated_social_posts
 * - Migrates video scripts from ssnews_generated_video_scripts
 * - Preserves all original data and relationships
 * - Creates migration tracking for rollback capability
 * - Handles account-specific migrations
 */
class DataMigrationService {
  constructor() {
    this.batchSize = parseInt(process.env.MIGRATION_BATCH_SIZE) || 100;
    this.dryRun = process.env.MIGRATION_DRY_RUN === 'true';
  }

  /**
   * Migrate all legacy content to modern format
   */
  async migrateAllLegacyContent(accountId = null) {
    console.log('🚀 [MIGRATION] Starting complete legacy content migration...');
    
    if (this.dryRun) {
      console.log('🔍 [MIGRATION] Running in DRY RUN mode - no data will be modified');
    }

    const startTime = Date.now();
    let totalMigrated = 0;

    try {
      // Migrate social media posts
      const socialCount = await this.migrateSocialMediaPosts(accountId);
      totalMigrated += socialCount;

      // Migrate video scripts
      const videoCount = await this.migrateVideoScripts(accountId);
      totalMigrated += videoCount;

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log('🎉 [MIGRATION] Complete migration finished successfully!');
      console.log(`   Total items migrated: ${totalMigrated}`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Account: ${accountId || 'ALL'}`);

      return {
        success: true,
        totalMigrated,
        socialMediaMigrated: socialCount,
        videoScriptsMigrated: videoCount,
        duration,
        accountId
      };

    } catch (error) {
      console.error('❌ [MIGRATION] Complete migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Migrate social media posts to modern format
   */
  async migrateSocialMediaPosts(accountId = null) {
    console.log('📱 [MIGRATION] Migrating social media posts...');

    try {
      // Get count of posts to migrate
      const whereClause = accountId ? 'WHERE account_id = ?' : 'WHERE 1=1';
      const params = accountId ? [accountId] : [];

      const [countResult] = await db.query(`
        SELECT COUNT(*) as total 
        FROM ssnews_generated_social_posts 
        ${whereClause}
      `, params);

      const totalPosts = countResult.total;
      console.log(`📱 [MIGRATION] Found ${totalPosts} social media posts to migrate`);

      if (totalPosts === 0) {
        return 0;
      }

      let migratedCount = 0;
      let offset = 0;

      while (offset < totalPosts) {
        // Get batch of social media posts
        const posts = await db.query(`
          SELECT sp.*, ga.gen_article_id
          FROM ssnews_generated_social_posts sp
          LEFT JOIN ssnews_generated_articles ga ON sp.based_on_gen_article_id = ga.gen_article_id
          ${whereClause}
          ORDER BY sp.post_id
          LIMIT ? OFFSET ?
        `, [...params, this.batchSize, offset]);

        console.log(`📱 [MIGRATION] Processing batch ${Math.floor(offset / this.batchSize) + 1}: ${posts.length} posts`);

        for (const post of posts) {
          try {
            await this.migrateSocialMediaPost(post);
            migratedCount++;
          } catch (error) {
            console.error(`❌ [MIGRATION] Failed to migrate social post ${post.post_id}:`, error.message);
            // Continue with other posts
          }
        }

        offset += this.batchSize;
      }

      console.log(`✅ [MIGRATION] Social media migration complete: ${migratedCount}/${totalPosts} posts migrated`);
      return migratedCount;

    } catch (error) {
      console.error('❌ [MIGRATION] Social media migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Migrate video scripts to modern format
   */
  async migrateVideoScripts(accountId = null) {
    console.log('🎬 [MIGRATION] Migrating video scripts...');

    try {
      // Get count of scripts to migrate
      const whereClause = accountId ? 'WHERE account_id = ?' : 'WHERE 1=1';
      const params = accountId ? [accountId] : [];

      const [countResult] = await db.query(`
        SELECT COUNT(*) as total 
        FROM ssnews_generated_video_scripts 
        ${whereClause}
      `, params);

      const totalScripts = countResult.total;
      console.log(`🎬 [MIGRATION] Found ${totalScripts} video scripts to migrate`);

      if (totalScripts === 0) {
        return 0;
      }

      let migratedCount = 0;
      let offset = 0;

      while (offset < totalScripts) {
        // Get batch of video scripts
        const scripts = await db.query(`
          SELECT vs.*, ga.gen_article_id
          FROM ssnews_generated_video_scripts vs
          LEFT JOIN ssnews_generated_articles ga ON vs.based_on_gen_article_id = ga.gen_article_id
          ${whereClause}
          ORDER BY vs.script_id
          LIMIT ? OFFSET ?
        `, [...params, this.batchSize, offset]);

        console.log(`🎬 [MIGRATION] Processing batch ${Math.floor(offset / this.batchSize) + 1}: ${scripts.length} scripts`);

        for (const script of scripts) {
          try {
            await this.migrateVideoScript(script);
            migratedCount++;
          } catch (error) {
            console.error(`❌ [MIGRATION] Failed to migrate video script ${script.script_id}:`, error.message);
            // Continue with other scripts
          }
        }

        offset += this.batchSize;
      }

      console.log(`✅ [MIGRATION] Video scripts migration complete: ${migratedCount}/${totalScripts} scripts migrated`);
      return migratedCount;

    } catch (error) {
      console.error('❌ [MIGRATION] Video scripts migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Migrate a single social media post
   */
  async migrateSocialMediaPost(post) {
    if (this.dryRun) {
      console.log(`🔍 [DRY RUN] Would migrate social post ${post.post_id} (${post.platform})`);
      return;
    }

    // Check if already migrated
    const existing = await db.query(`
      SELECT content_id 
      FROM ssnews_generated_content 
      WHERE prompt_category = 'social_media' 
      AND JSON_EXTRACT(metadata, '$.legacy_ids') LIKE ?
    `, [`%${post.post_id}%`]);

    if (existing.length > 0) {
      console.log(`⏭️ [MIGRATION] Social post ${post.post_id} already migrated, skipping`);
      return;
    }

    // Transform to modern format
    const contentData = [{
      platform: post.platform,
      text: post.text_draft || '',
      hashtags: this.extractHashtags(post.text_draft),
      legacy_id: post.post_id,
      order: 1,
      emotional_hook_present: post.emotional_hook_present_ai_check || false
    }];

    const metadata = {
      source: 'legacy_migration',
      legacy_ids: [post.post_id],
      legacy_table: 'ssnews_generated_social_posts',
      migrated_at: new Date().toISOString(),
      original_created_at: post.created_at,
      platform: post.platform
    };

    // Insert into modern table
    const insertData = {
      based_on_gen_article_id: post.based_on_gen_article_id,
      prompt_category: 'social_media',
      content_data: JSON.stringify(contentData),
      metadata: JSON.stringify(metadata),
      status: post.status || 'draft',
      created_at: post.created_at,
      updated_at: new Date()
    };

    if (post.account_id) {
      insertData.account_id = post.account_id;
    }

    const contentId = await db.insert('ssnews_generated_content', insertData);
    
    // Create migration tracking record
    await this.createMigrationRecord('social_media', post.post_id, contentId, post.account_id);

    console.log(`✅ [MIGRATION] Migrated social post ${post.post_id} -> content ${contentId}`);
  }

  /**
   * Migrate a single video script
   */
  async migrateVideoScript(script) {
    if (this.dryRun) {
      console.log(`🔍 [DRY RUN] Would migrate video script ${script.script_id} (${script.duration_target_seconds}s)`);
      return;
    }

    // Check if already migrated
    const existing = await db.query(`
      SELECT content_id 
      FROM ssnews_generated_content 
      WHERE prompt_category = 'video_script' 
      AND JSON_EXTRACT(metadata, '$.legacy_ids') LIKE ?
    `, [`%${script.script_id}%`]);

    if (existing.length > 0) {
      console.log(`⏭️ [MIGRATION] Video script ${script.script_id} already migrated, skipping`);
      return;
    }

    // Parse visual suggestions
    let visualSuggestions = [];
    if (script.visual_suggestions) {
      try {
        visualSuggestions = JSON.parse(script.visual_suggestions);
      } catch (error) {
        console.warn(`⚠️ [MIGRATION] Could not parse visual suggestions for script ${script.script_id}`);
      }
    }

    // Transform to modern format
    const contentData = [{
      title: script.title,
      script: script.script_draft,
      duration_seconds: script.duration_target_seconds,
      type: this.getDurationTypeFromSeconds(script.duration_target_seconds),
      visual_suggestions: visualSuggestions,
      legacy_id: script.script_id,
      order: 1
    }];

    const metadata = {
      source: 'legacy_migration',
      legacy_ids: [script.script_id],
      legacy_table: 'ssnews_generated_video_scripts',
      migrated_at: new Date().toISOString(),
      original_created_at: script.created_at,
      duration_seconds: script.duration_target_seconds,
      title: script.title
    };

    // Insert into modern table
    const insertData = {
      based_on_gen_article_id: script.based_on_gen_article_id,
      prompt_category: 'video_script',
      content_data: JSON.stringify(contentData),
      metadata: JSON.stringify(metadata),
      status: script.status || 'draft',
      created_at: script.created_at,
      updated_at: new Date()
    };

    if (script.account_id) {
      insertData.account_id = script.account_id;
    }

    const contentId = await db.insert('ssnews_generated_content', insertData);
    
    // Create migration tracking record
    await this.createMigrationRecord('video_script', script.script_id, contentId, script.account_id);

    console.log(`✅ [MIGRATION] Migrated video script ${script.script_id} -> content ${contentId}`);
  }

  /**
   * Create migration tracking record
   */
  async createMigrationRecord(contentType, legacyId, modernId, accountId = null) {
    if (this.dryRun) return;

    try {
      const migrationData = {
        content_type: contentType,
        legacy_id: legacyId,
        modern_content_id: modernId,
        migration_date: new Date(),
        migration_version: '2.0'
      };

      if (accountId) {
        migrationData.account_id = accountId;
      }

      // Create migration tracking table if it doesn't exist
      await this.ensureMigrationTrackingTable();

      await db.insert('ssnews_content_migration_log', migrationData);
    } catch (error) {
      console.warn(`⚠️ [MIGRATION] Could not create migration record: ${error.message}`);
      // Don't fail the migration for tracking issues
    }
  }

  /**
   * Ensure migration tracking table exists
   */
  async ensureMigrationTrackingTable() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS ssnews_content_migration_log (
          migration_id INT AUTO_INCREMENT PRIMARY KEY,
          content_type VARCHAR(50) NOT NULL,
          legacy_id INT NOT NULL,
          modern_content_id INT NOT NULL,
          account_id VARCHAR(64),
          migration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          migration_version VARCHAR(10) DEFAULT '2.0',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_content_type (content_type),
          INDEX idx_legacy_id (legacy_id),
          INDEX idx_modern_content_id (modern_content_id),
          INDEX idx_account_id (account_id),
          
          UNIQUE KEY unique_migration (content_type, legacy_id, account_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (error) {
      // Table might already exist, ignore error
      if (!error.message.includes('already exists')) {
        console.warn(`⚠️ [MIGRATION] Could not create migration tracking table: ${error.message}`);
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Extract hashtags from text
   */
  extractHashtags(text) {
    if (!text) return [];
    
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches || [];
  }

  /**
   * Determine video type from duration
   */
  getDurationTypeFromSeconds(seconds) {
    if (seconds <= 30) return 'short-form';
    if (seconds <= 60) return 'short-form';
    return 'long-form';
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats(accountId = null) {
    try {
      const whereClause = accountId ? 'WHERE account_id = ?' : 'WHERE 1=1';
      const params = accountId ? [accountId] : [];

      // Count legacy content
      const legacySocial = await db.query(`
        SELECT COUNT(*) as count FROM ssnews_generated_social_posts ${whereClause}
      `, params);

      const legacyVideo = await db.query(`
        SELECT COUNT(*) as count FROM ssnews_generated_video_scripts ${whereClause}
      `, params);

      // Count migrated content
      const modernSocial = await db.query(`
        SELECT COUNT(*) as count 
        FROM ssnews_generated_content 
        ${whereClause}
        AND prompt_category = 'social_media'
        AND JSON_EXTRACT(metadata, '$.source') = 'legacy_migration'
      `, params);

      const modernVideo = await db.query(`
        SELECT COUNT(*) as count 
        FROM ssnews_generated_content 
        ${whereClause}
        AND prompt_category = 'video_script'
        AND JSON_EXTRACT(metadata, '$.source') = 'legacy_migration'
      `, params);

      return {
        legacy: {
          socialPosts: legacySocial[0].count,
          videoScripts: legacyVideo[0].count,
          total: legacySocial[0].count + legacyVideo[0].count
        },
        migrated: {
          socialPosts: modernSocial[0].count,
          videoScripts: modernVideo[0].count,
          total: modernSocial[0].count + modernVideo[0].count
        },
        migrationProgress: {
          socialPosts: legacySocial[0].count > 0 ? 
            Math.round((modernSocial[0].count / legacySocial[0].count) * 100) : 0,
          videoScripts: legacyVideo[0].count > 0 ? 
            Math.round((modernVideo[0].count / legacyVideo[0].count) * 100) : 0
        },
        accountId,
        dryRunMode: this.dryRun
      };

    } catch (error) {
      console.error('❌ [MIGRATION] Error getting migration stats:', error.message);
      return {
        error: error.message,
        dryRunMode: this.dryRun
      };
    }
  }

  /**
   * Set dry run mode
   */
  setDryRunMode(enabled) {
    this.dryRun = enabled;
    console.log(`🔄 [MIGRATION] Dry run mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Rollback migration for specific content
   */
  async rollbackMigration(contentType, legacyId, accountId = null) {
    console.log(`🔄 [MIGRATION] Rolling back migration for ${contentType} ${legacyId}...`);

    if (this.dryRun) {
      console.log(`🔍 [DRY RUN] Would rollback ${contentType} ${legacyId}`);
      return;
    }

    try {
      // Find migration record
      let whereClause = 'content_type = ? AND legacy_id = ?';
      let params = [contentType, legacyId];

      if (accountId) {
        whereClause += ' AND account_id = ?';
        params.push(accountId);
      }

      const migrationRecord = await db.query(`
        SELECT * FROM ssnews_content_migration_log WHERE ${whereClause}
      `, params);

      if (migrationRecord.length === 0) {
        console.log(`⚠️ [MIGRATION] No migration record found for ${contentType} ${legacyId}`);
        return;
      }

      const record = migrationRecord[0];

      // Delete from modern table
      let deleteWhereClause = 'content_id = ?';
      let deleteParams = [record.modern_content_id];

      if (accountId) {
        deleteWhereClause += ' AND account_id = ?';
        deleteParams.push(accountId);
      }

      await db.query(`DELETE FROM ssnews_generated_content WHERE ${deleteWhereClause}`, deleteParams);

      // Delete migration record
      await db.query(`DELETE FROM ssnews_content_migration_log WHERE migration_id = ?`, [record.migration_id]);

      console.log(`✅ [MIGRATION] Rollback complete for ${contentType} ${legacyId}`);

    } catch (error) {
      console.error(`❌ [MIGRATION] Rollback failed for ${contentType} ${legacyId}:`, error.message);
      throw error;
    }
  }
}

// Create singleton instance
const dataMigrationService = new DataMigrationService();

export default dataMigrationService; 