import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  constructor() {
    this.connection = null;
    this.pool = null;
  }

  async initialize() {
    try {
      // SSL configuration for production vs development
      const sslConfig = process.env.NODE_ENV === 'production' 
        ? {
            ca: process.env.MYSQL_SSL_CA,
            rejectUnauthorized: false // For Heroku compatibility
          }
        : process.env.MYSQL_SSL_CA 
          ? { ca: process.env.MYSQL_SSL_CA }
          : false;

      // Create connection pool for better performance
      this.pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: sslConfig,
        timezone: 'Z',
        dateStrings: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 30000, // Reduced for Heroku
        timeout: 30000, // Reduced for Heroku
        connectTimeout: 30000
      });

      // Test connection with retry logic
      let retries = 3;
      let connection;
      
      while (retries > 0) {
        try {
          connection = await this.pool.getConnection();
          console.log('✅ Database connected successfully');
          connection.release();
          break;
        } catch (error) {
          retries--;
          console.log(`❌ Database connection attempt failed (${3 - retries}/3): ${error.message}`);
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }

      // Initialize schema
      await this.initializeSchema();
      
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('Connection details:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        hasSSL: !!process.env.MYSQL_SSL_CA
      });
      throw error;
    }
  }

  async initializeSchema() {
    try {
      const schemaPath = path.join(__dirname, '../scripts/database-schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            // Use query() instead of execute() for DDL statements
            // execute() uses prepared statements which don't support DDL commands
            await this.pool.query(statement);
          } catch (error) {
            // Ignore duplicate key errors for INSERT IGNORE statements
            if (error.code === 'ER_DUP_ENTRY' && statement.includes('INSERT IGNORE')) {
              continue;
            }
            // Ignore duplicate index/constraint errors during schema updates
            if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_DUP_INDEX') {
              continue;
            }
            throw error;
          }
        }
      }
      
      console.log('✅ Database schema initialized');
    } catch (error) {
      console.error('❌ Schema initialization failed:', error.message);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('❌ Database query failed:', error.message);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  async insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    try {
      const [result] = await this.pool.execute(sql, values);
      return result.insertId;
    } catch (error) {
      console.error('❌ Database insert failed:', error.message);
      throw error;
    }
  }

  async update(table, data, where, whereParams = []) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    
    try {
      const [result] = await this.pool.execute(sql, values);
      return result.affectedRows;
    } catch (error) {
      console.error('❌ Database update failed:', error.message);
      throw error;
    }
  }

  async findOne(table, where, whereParams = []) {
    const sql = `SELECT * FROM ${table} WHERE ${where} LIMIT 1`;
    
    try {
      const [rows] = await this.pool.execute(sql, whereParams);
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Database findOne failed:', error.message);
      throw error;
    }
  }

  async findMany(table, where = '1=1', whereParams = [], orderBy = '', limit = '') {
    let sql = `SELECT * FROM ${table} WHERE ${where}`;
    
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    
    try {
      const [rows] = await this.pool.execute(sql, whereParams);
      return rows;
    } catch (error) {
      console.error('❌ Database findMany failed:', error.message);
      throw error;
    }
  }

  // Account-aware helper methods
  async findOneByAccount(table, accountId, where = '1=1', whereParams = []) {
    const accountWhere = where === '1=1' ? 'account_id = ?' : `${where} AND account_id = ?`;
    return this.findOne(table, accountWhere, [...whereParams, accountId]);
  }

  async findManyByAccount(table, accountId, where = '1=1', whereParams = [], orderBy = '', limit = '') {
    const accountWhere = where === '1=1' ? 'account_id = ?' : `${where} AND account_id = ?`;
    return this.findMany(table, accountWhere, [...whereParams, accountId], orderBy, limit);
  }

  // Generic insert with account_id check
  async insertWithAccount(table, data, accountId) {
    console.log(`➡️ ENTER: db.insertWithAccount for table: ${table}`);
    if (!accountId) {
      throw new Error('accountId is required for multi-tenant insert');
    }
    const fullData = { ...data, account_id: accountId };
    const result = await this.insert(table, fullData);
    console.log(`⬅️ EXIT: db.insertWithAccount, Result: ${JSON.stringify(result)}`);
    return result;
  }

  // News Sources methods - updated for account context
  async getActiveNewsSources(accountId = null) {
    if (accountId) {
      return this.findManyByAccount('ssnews_news_sources', accountId, 'is_active = ?', [true]);
    }
    return this.findMany('ssnews_news_sources', 'is_active = ?', [true]);
  }

  async updateSourceLastScraped(sourceId, accountId = null) {
    const whereClause = accountId 
      ? 'source_id = ? AND account_id = ?' 
      : 'source_id = ?';
    const whereParams = accountId ? [sourceId, accountId] : [sourceId];
    
    return this.update(
      'ssnews_news_sources',
      { last_scraped_at: new Date() },
      whereClause,
      whereParams
    );
  }

  // Scraped Articles methods - updated for account context
  async insertScrapedArticle(articleData, accountId = null) {
    if (accountId) {
      return this.insertWithAccount('ssnews_scraped_articles', articleData, accountId);
    }
    return this.insert('ssnews_scraped_articles', articleData);
  }

  async getUnanalyzedArticles(limit = 50, accountId = null) {
    if (accountId) {
      return this.findManyByAccount(
        'ssnews_scraped_articles',
        accountId,
        'status = ?',
        ['scraped'],
        'scraped_at DESC',
        limit
      );
    }
    return this.findMany(
      'ssnews_scraped_articles',
      'status = ?',
      ['scraped'],
      'scraped_at DESC',
      limit
    );
  }

  async updateArticleAnalysis(articleId, analysisData, accountId = null) {
    const whereClause = accountId 
      ? 'article_id = ? AND account_id = ?' 
      : 'article_id = ?';
    const whereParams = accountId ? [articleId, accountId] : [articleId];
    
    return this.update(
      'ssnews_scraped_articles',
      { ...analysisData, status: 'analyzed' },
      whereClause,
      whereParams
    );
  }

  async getTopArticlesByRelevance(limit = 10, minScore = 0.5, accountId = null) {
    if (accountId) {
      return this.findManyByAccount(
        'ssnews_scraped_articles',
        accountId,
        'status = ? AND relevance_score >= ?',
        ['analyzed', minScore],
        'relevance_score DESC, publication_date DESC',
        limit
      );
    }
    return this.findMany(
      'ssnews_scraped_articles',
      'status = ? AND relevance_score >= ?',
      ['analyzed', minScore],
      'relevance_score DESC, publication_date DESC',
      limit
    );
  }

  // Generated Content methods - updated for account context
  async insertGeneratedArticle(articleData, accountId = null) {
    if (accountId) {
      return this.insertWithAccount('ssnews_generated_articles', articleData, accountId);
    }
    return this.insert('ssnews_generated_articles', articleData);
  }

  async insertGeneratedSocialPost(postData, accountId = null) {
    if (accountId) {
      return this.insertWithAccount('ssnews_generated_social_posts', postData, accountId);
    }
    return this.insert('ssnews_generated_social_posts', postData);
  }

  async insertGeneratedVideoScript(scriptData, accountId = null) {
    if (accountId) {
      return this.insertWithAccount('ssnews_generated_video_scripts', scriptData, accountId);
    }
    return this.insert('ssnews_generated_video_scripts', scriptData);
  }

  async getContentForReview(status = 'draft', limit = 20, accountId = null) {
    try {
      // Handle multiple statuses separated by commas
      const statuses = typeof status === 'string' ? status.split(',').map(s => s.trim()) : [status];
      console.log('📋 getContentForReview called with statuses:', statuses, 'limit:', limit, 'accountId:', accountId);
      
      let articles = [];
      
      // Get articles for each status using the original working approach
      for (const singleStatus of statuses) {
        const statusArticles = accountId
          ? await this.findManyByAccount(
              'ssnews_generated_articles',
              accountId,
              'status = ?',
              [singleStatus],
              'created_at DESC',
              limit
            )
          : await this.findMany(
              'ssnews_generated_articles',
              'status = ?',
              [singleStatus],
              'created_at DESC',
              limit
            );
        articles = articles.concat(statusArticles);
      }
      
      // Remove duplicates and limit results
      const uniqueArticles = articles.filter((item, index, self) => 
        index === self.findIndex(t => t.gen_article_id === item.gen_article_id)
      ).slice(0, limit);

      // Get associated content and source article information for each article
      for (const article of uniqueArticles) {
        // Get all generated content from the unified system ONLY
        const allGeneratedContent = accountId
          ? await this.findManyByAccount(
              'ssnews_generated_content',
              accountId,
              'based_on_gen_article_id = ?',
              [article.gen_article_id],
              'prompt_category ASC, created_at ASC'
            )
          : await this.findMany(
              'ssnews_generated_content',
              'based_on_gen_article_id = ?',
              [article.gen_article_id],
              'prompt_category ASC, created_at ASC'
            );

        // Group content by category for UI compatibility
        const contentByCategory = {};
        allGeneratedContent.forEach(content => {
          if (!contentByCategory[content.prompt_category]) {
            contentByCategory[content.prompt_category] = [];
          }
          contentByCategory[content.prompt_category].push(content);
        });

        // Map to unified content structure (NO legacy tables)
        article.allGeneratedContent = contentByCategory;
        
        // For backward compatibility with existing UI components that expect specific arrays
        article.socialPosts = contentByCategory['social_media'] || [];
        article.videoScripts = contentByCategory['video_script'] || [];
        article.analysisContent = contentByCategory['analysis'] || [];
        article.emailContent = contentByCategory['email'] || [];
        article.blogContent = contentByCategory['blog_post'] || [];
        article.letterContent = contentByCategory['letter'] || [];
        article.generatedImages = contentByCategory['image_generation'] || [];

        // Get images (exclude archived images from content card display)
        article.images = accountId
          ? await this.findManyByAccount(
              'ssnews_image_assets',
              accountId,
              'associated_content_type = ? AND associated_content_id = ? AND status != ?',
              ['gen_article', article.gen_article_id, 'archived']
            )
          : await this.findMany(
              'ssnews_image_assets',
              'associated_content_type = ? AND associated_content_id = ? AND status != ?',
              ['gen_article', article.gen_article_id, 'archived']
            );

        // Map image field names to camelCase for frontend compatibility
        article.images = article.images.map(img => ({
          ...img,
          sirvUrl: img.sirv_cdn_url,
          altText: img.alt_text_suggestion_ai,
          query: img.alt_text_suggestion_ai || 'Christian content image' // Use alt text as query fallback
        }));

        // Get source article information if available
        if (article.based_on_scraped_article_id) {
          try {
            let sourceArticleQuery = `
              SELECT 
                sa.title,
                sa.url,
                sa.publication_date,
                sa.summary_ai,
                sa.keywords_ai,
                sa.relevance_score,
                ns.name as source_name,
                ns.url as source_website
              FROM ssnews_scraped_articles sa
              LEFT JOIN ssnews_news_sources ns ON sa.source_id = ns.source_id
              WHERE sa.article_id = ?
            `;
            
            const queryParams = [article.based_on_scraped_article_id];
            
            if (accountId) {
              sourceArticleQuery += ' AND sa.account_id = ?';
              queryParams.push(accountId);
            }
            
            const [sourceRows] = await this.pool.execute(sourceArticleQuery, queryParams);
            
            if (sourceRows.length > 0) {
              const sourceData = sourceRows[0];
              article.sourceArticle = {
                title: sourceData.title,
                url: sourceData.url,
                publication_date: sourceData.publication_date,
                summary: sourceData.summary_ai,
                keywords: sourceData.keywords_ai,
                relevance_score: sourceData.relevance_score,
                source_name: sourceData.source_name,
                source_website: sourceData.source_website
              };
            }
          } catch (sourceError) {
            console.error(`❌ Error fetching source article for ${article.gen_article_id}:`, sourceError.message);
            // Continue without source article info
          }
        }

        // Handle prayer points from the already-fetched content
        const prayerContent = [...(contentByCategory['prayer'] || []), ...(contentByCategory['prayer_points'] || [])];
        
        if (prayerContent.length > 0) {
          // Convert generic content to expected format
          article.prayerPoints = prayerContent.map(point => {
            const data = point.content_data;
            if (Array.isArray(data)) {
              return data.map((item, index) => ({
                id: `${point.content_id}_${index}`,
                order: item.order_number || index + 1,
                content: item.prayer_text,
                theme: item.theme
              }));
            }
            return [];
          }).flat();
        } else {
          article.prayerPoints = [];
        }
      }

      console.log(`📋 Found ${uniqueArticles.length} content pieces for review`);
      return uniqueArticles;
    } catch (error) {
      console.error('❌ Database getContentForReview failed:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  // Image Assets methods - updated for account context
  async insertImageAsset(imageData, accountId = null) {
    if (accountId) {
      return this.insertWithAccount('ssnews_image_assets', imageData, accountId);
    }
    return this.insert('ssnews_image_assets', imageData);
  }

  // System Logs methods
  async insertLog(level, message, source = 'server', metadata = null, accountId = null, jobId = null) {
    try {
      const logData = {
        level,
        message,
        source,
        metadata: metadata ? JSON.stringify(metadata) : null
      };
      
      if (accountId) {
        logData.account_id = accountId;
      }
      
      if (jobId) {
        logData.job_id = jobId;
      }
      
      return await this.insert('ssnews_system_logs', logData);
    } catch (error) {
      // Don't throw errors for logging failures to avoid infinite loops
      console.error('❌ Failed to insert log to database:', error.message);
      return null;
    }
  }

  async getLogs(limit = 100, level = null, source = null, accountId = null) {
    try {
      let whereClause = '1=1';
      const whereParams = [];

      if (level) {
        whereClause += ' AND level = ?';
        whereParams.push(level);
      }

      if (source) {
        whereClause += ' AND source = ?';
        whereParams.push(source);
      }

      // CRITICAL: Filter by account ID for security
      if (accountId) {
        whereClause += ' AND (account_id = ? OR account_id IS NULL)'; // Include system logs too
        whereParams.push(accountId);
      }

      // Use string interpolation for LIMIT to avoid parameter binding issues
      const limitValue = parseInt(limit) || 100;

      const [rows] = await this.pool.execute(`
        SELECT 
          log_id as id,
          timestamp,
          level,
          message,
          source,
          metadata,
          job_id,
          account_id,
          created_at
        FROM ssnews_system_logs 
        WHERE ${whereClause}
        ORDER BY timestamp DESC 
        LIMIT ${limitValue}
      `, whereParams);

      // Parse metadata JSON safely
      return rows.map(row => {
        let parsedMetadata = null;
        if (row.metadata) {
          try {
            // Handle case where metadata might already be an object or a string
            if (typeof row.metadata === 'string') {
              parsedMetadata = JSON.parse(row.metadata);
            } else {
              parsedMetadata = row.metadata;
            }
          } catch (error) {
            console.warn('Failed to parse metadata for log', row.id, ':', error.message);
            parsedMetadata = null;
          }
        }
        
        return {
          ...row,
          metadata: parsedMetadata
        };
      });
    } catch (error) {
      console.error('❌ Failed to retrieve logs from database:', error.message);
      return [];
    }
  }

  async getJobLogs(jobId, accountId = null) {
    try {
      let whereClause = 'job_id = ?';
      const whereParams = [jobId];

      // CRITICAL: Filter by account ID for security  
      if (accountId) {
        whereClause += ' AND (account_id = ? OR account_id IS NULL)';
        whereParams.push(accountId);
      }

      const [rows] = await this.pool.execute(`
        SELECT 
          log_id as id,
          timestamp,
          level,
          message,
          source,
          metadata,
          job_id,
          account_id,
          created_at
        FROM ssnews_system_logs 
        WHERE ${whereClause}
        ORDER BY timestamp ASC
      `, whereParams);

      // Parse metadata JSON safely
      return rows.map(row => {
        let parsedMetadata = null;
        if (row.metadata) {
          try {
            if (typeof row.metadata === 'string') {
              parsedMetadata = JSON.parse(row.metadata);
            } else {
              parsedMetadata = row.metadata;
            }
          } catch (error) {
            console.warn('Failed to parse metadata for log', row.id, ':', error.message);
            parsedMetadata = null;
          }
        }
        
        return {
          ...row,
          metadata: parsedMetadata
        };
      });
    } catch (error) {
      console.error('❌ Failed to retrieve job logs from database:', error.message);
      return [];
    }
  }

  async clearLogs(olderThanDays = null, accountId = null) {
    try {
      let sql = 'DELETE FROM ssnews_system_logs';
      const whereParams = [];
      const whereConditions = [];

      if (olderThanDays) {
        whereConditions.push('timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)');
        whereParams.push(olderThanDays);
      }

      // CRITICAL: Only clear logs for specific account
      if (accountId) {
        whereConditions.push('account_id = ?');
        whereParams.push(accountId);
      }

      if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
      }

      const [result] = await this.pool.execute(sql, whereParams);

      return result.affectedRows;
    } catch (error) {
      console.error('❌ Failed to clear logs from database:', error.message);
      return 0;
    }
  }

  async getLogStats(accountId = null) {
    try {
      let whereClause = 'timestamp > DATE_SUB(NOW(), INTERVAL 7 DAY)';
      const whereParams = [];

      // CRITICAL: Filter stats by account
      if (accountId) {
        whereClause += ' AND (account_id = ? OR account_id IS NULL)';
        whereParams.push(accountId);
      }

      const [rows] = await this.pool.execute(`
        SELECT 
          level,
          COUNT(*) as count,
          DATE(timestamp) as date
        FROM ssnews_system_logs 
        WHERE ${whereClause}
        GROUP BY level, DATE(timestamp)
        ORDER BY date DESC, level
      `, whereParams);

      return rows;
    } catch (error) {
      console.error('❌ Failed to get log stats from database:', error.message);
      return [];
    }
  }

  // Evergreen Content methods
  async insertEvergreenIdea(ideaData) {
    return this.insert('ssnews_evergreen_content_ideas', ideaData);
  }

  async getEvergreenIdeasByCategory(category) {
    return this.findMany(
      'ssnews_evergreen_content_ideas',
      'theme_category = ?',
      [category]
    );
  }

  // Generic Content System methods
  async getContentConfiguration(category, accountId = null) {
    const whereClause = accountId
      ? 'prompt_category = ? AND account_id = ? AND is_active = ?'
      : 'prompt_category = ? AND is_active = ?';
    const whereParams = accountId ? [category, accountId, true] : [category, true];
    
    return this.findOne('ssnews_prompt_configuration', whereClause, whereParams);
  }

  async getActiveContentConfigurations(accountId = null) {
    const whereClause = accountId
      ? 'account_id = ? AND is_active = ?'
      : 'is_active = ?';
    const whereParams = accountId ? [accountId, true] : [true];
    
    // Query the correct table: ssnews_prompt_templates (not ssnews_prompt_configuration)
    return this.findMany('ssnews_prompt_templates', whereClause, whereParams, 'execution_order ASC, category ASC');
  }

  async getGenericContent(articleId, category, accountId = null) {
    const whereClause = accountId
      ? 'based_on_gen_article_id = ? AND prompt_category = ? AND account_id = ?'
      : 'based_on_gen_article_id = ? AND prompt_category = ?';
    const whereParams = accountId ? [articleId, category, accountId] : [articleId, category];
    
    return this.findMany('ssnews_generated_content', whereClause, whereParams, 'created_at ASC');
  }

  // Database lifecycle methods
  async close() {
    if (this.pool) {
      console.log('🔌 Closing database connection pool...');
      await this.pool.end();
      this.pool = null;
      console.log('✅ Database connections closed');
    }
  }

  // ============================================================================
  // TRANSACTION SUPPORT METHODS - STAGE 2
  // ============================================================================

  /**
   * Begin a database transaction
   */
  async beginTransaction() {
    try {
      const connection = await this.pool.getConnection();
      await connection.beginTransaction();
      console.log('🔄 [TRANSACTION] Started database transaction');
      return connection;
    } catch (error) {
      console.error('❌ [TRANSACTION] Failed to begin transaction:', error.message);
      throw error;
    }
  }

  /**
   * Commit a database transaction
   */
  async commitTransaction(connection) {
    try {
      await connection.commit();
      connection.release();
      console.log('✅ [TRANSACTION] Transaction committed successfully');
    } catch (error) {
      console.error('❌ [TRANSACTION] Failed to commit transaction:', error.message);
      await this.rollbackTransaction(connection);
      throw error;
    }
  }

  /**
   * Rollback a database transaction
   */
  async rollbackTransaction(connection) {
    try {
      await connection.rollback();
      connection.release();
      console.log('🔄 [TRANSACTION] Transaction rolled back');
    } catch (error) {
      console.error('❌ [TRANSACTION] Failed to rollback transaction:', error.message);
      // Always release connection even if rollback fails
      try {
        connection.release();
      } catch (releaseError) {
        console.error('❌ [TRANSACTION] Failed to release connection:', releaseError.message);
      }
      throw error;
    }
  }

  /**
   * Insert data within a transaction
   */
  async insertInTransaction(table, data, connection) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    try {
      const [result] = await connection.execute(sql, values);
      console.log(`📝 [TRANSACTION] Inserted into ${table} (ID: ${result.insertId})`);
      return result.insertId;
    } catch (error) {
      console.error('❌ [TRANSACTION] Database insert failed:', error.message);
      console.error('SQL:', sql);
      console.error('Values:', values);
      throw error;
    }
  }

  /**
   * Insert data with account ID within a transaction
   */
  async insertWithAccountInTransaction(table, data, accountId, connection) {
    if (!accountId) {
      throw new Error('accountId is required for multi-tenant insert in transaction');
    }
    const fullData = { ...data, account_id: accountId };
    return await this.insertInTransaction(table, fullData, connection);
  }

  /**
   * Update data within a transaction
   */
  async updateInTransaction(table, data, where, whereParams = [], connection) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    
    try {
      const [result] = await connection.execute(sql, values);
      console.log(`📝 [TRANSACTION] Updated ${table} (${result.affectedRows} rows)`);
      return result.affectedRows;
    } catch (error) {
      console.error('❌ [TRANSACTION] Database update failed:', error.message);
      console.error('SQL:', sql);
      console.error('Values:', values);
      throw error;
    }
  }

  /**
   * Query within a transaction
   */
  async queryInTransaction(sql, params = [], connection) {
    try {
      const [rows] = await connection.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('❌ [TRANSACTION] Database query failed:', error.message);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }
}

// Create singleton instance
const db = new DatabaseService();

export default db; 