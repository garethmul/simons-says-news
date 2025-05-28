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
          await this.pool.execute(statement);
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

  // News Sources methods
  async getActiveNewsSources() {
    return this.findMany('ssnews_news_sources', 'is_active = ?', [true]);
  }

  async updateSourceLastScraped(sourceId) {
    return this.update(
      'ssnews_news_sources',
      { last_scraped_at: new Date() },
      'source_id = ?',
      [sourceId]
    );
  }

  // Scraped Articles methods
  async insertScrapedArticle(articleData) {
    return this.insert('ssnews_scraped_articles', articleData);
  }

  async getUnanalyzedArticles(limit = 50) {
    return this.findMany(
      'ssnews_scraped_articles',
      'status = ?',
      ['scraped'],
      'scraped_at DESC',
      limit
    );
  }

  async updateArticleAnalysis(articleId, analysisData) {
    return this.update(
      'ssnews_scraped_articles',
      { ...analysisData, status: 'analyzed' },
      'article_id = ?',
      [articleId]
    );
  }

  async getTopArticlesByRelevance(limit = 10, minScore = 0.5) {
    return this.findMany(
      'ssnews_scraped_articles',
      'status = ? AND relevance_score >= ?',
      ['analyzed', minScore],
      'relevance_score DESC, publication_date DESC',
      limit
    );
  }

  // Generated Content methods
  async insertGeneratedArticle(articleData) {
    return this.insert('ssnews_generated_articles', articleData);
  }

  async insertGeneratedSocialPost(postData) {
    return this.insert('ssnews_generated_social_posts', postData);
  }

  async insertGeneratedVideoScript(scriptData) {
    return this.insert('ssnews_generated_video_scripts', scriptData);
  }

  async getContentForReview(status = 'draft', limit = 20) {
    try {
      // Handle multiple statuses separated by commas
      const statuses = typeof status === 'string' ? status.split(',').map(s => s.trim()) : [status];
      console.log('📋 getContentForReview called with statuses:', statuses, 'limit:', limit);
      
      let articles = [];
      
      // Get articles for each status using the original working approach
      for (const singleStatus of statuses) {
        const statusArticles = await this.findMany(
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
        // Get social posts
        article.socialPosts = await this.findMany(
          'ssnews_generated_social_posts',
          'based_on_gen_article_id = ?',
          [article.gen_article_id]
        );

        // Get video scripts
        article.videoScripts = await this.findMany(
          'ssnews_generated_video_scripts',
          'based_on_gen_article_id = ?',
          [article.gen_article_id]
        );

        // Get images
        article.images = await this.findMany(
          'ssnews_image_assets',
          'associated_content_type = ? AND associated_content_id = ?',
          ['gen_article', article.gen_article_id]
        );

        // Get source article information if available
        if (article.based_on_scraped_article_id) {
          try {
            const sourceArticleQuery = `
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
            
            const [sourceRows] = await this.pool.execute(sourceArticleQuery, [article.based_on_scraped_article_id]);
            
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
      }

      console.log(`📋 Found ${uniqueArticles.length} content pieces for review`);
      return uniqueArticles;
    } catch (error) {
      console.error('❌ Database getContentForReview failed:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  // Image Assets methods
  async insertImageAsset(imageData) {
    return this.insert('ssnews_image_assets', imageData);
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

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Create singleton instance
const db = new DatabaseService();

export default db; 