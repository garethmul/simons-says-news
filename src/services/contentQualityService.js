/**
 * CONTENT QUALITY SERVICE
 * Assesses article content quality and determines generation eligibility
 * Prevents content generation on articles with insufficient source material
 */

import db from './database.js';
import accountSettingsService from './accountSettingsService.js';

class ContentQualityService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Assess content quality for an article using account-specific thresholds
   * @param {Object} article - Article object with title, body_final/body_draft
   * @param {string} accountId - Account ID for getting specific settings
   * @returns {Promise<Object>} Quality assessment
   */
  async assessContentQuality(article, accountId) {
    try {
      // Get account-specific settings
      const settings = await accountSettingsService.getContentQualitySettings(accountId);
      const { thresholds, scoring, generationRules } = settings;

      const content = this.extractContent(article);
      const contentLength = content.length;
      
      // Basic quality assessment
      const assessment = {
        content_length: contentLength,
        content_quality_score: 0.0,
        min_content_length_met: contentLength >= thresholds.min_content_length,
        content_generation_eligible: false,
        content_issues: [],
        quality_tier: 'poor',
        recommendations: []
      };

      // Check for critical issues first
      if (contentLength === 0) {
        assessment.content_issues.push('no_content');
        assessment.recommendations.push('Article appears to have no content - check scraping or source URL');
        return assessment;
      }

      if (this.isTitleOnly(article, thresholds.title_only_threshold)) {
        assessment.content_issues.push('title_only');
        assessment.recommendations.push('Article appears to contain only the title - verify source content exists');
        return assessment;
      }

      if (contentLength < thresholds.min_content_length) {
        assessment.content_issues.push('insufficient_length');
        assessment.recommendations.push(`Content too short (${contentLength} chars). Minimum ${thresholds.min_content_length} chars required for generation.`);
      }

      // Calculate quality score using account-specific weights
      let qualityScore = 0;

      // Content length scoring (weighted)
      const lengthScore = this.calculateLengthScore(contentLength, thresholds);
      qualityScore += lengthScore * scoring.content_length_weight;

      // Content structure scoring (weighted)
      const structureScore = this.calculateStructureScore(content);
      qualityScore += structureScore * scoring.structure_weight;

      // Content uniqueness scoring (weighted)
      const uniquenessScore = this.calculateUniquenessScore(article);
      qualityScore += uniquenessScore * scoring.uniqueness_weight;

      assessment.content_quality_score = Math.round(qualityScore * 100) / 100;

      // Determine quality tier using account thresholds
      if (assessment.content_quality_score >= 0.8 && contentLength >= thresholds.excellent_content_length) {
        assessment.quality_tier = 'excellent';
      } else if (assessment.content_quality_score >= 0.6 && contentLength >= thresholds.good_content_length) {
        assessment.quality_tier = 'good';
      } else if (assessment.content_quality_score >= 0.3 && contentLength >= thresholds.min_content_length) {
        assessment.quality_tier = 'fair';
      } else {
        assessment.quality_tier = 'poor';
      }

      // Determine eligibility based on account rules
      assessment.content_generation_eligible = this.determineEligibility(
        assessment, 
        thresholds, 
        generationRules
      );

      // Add recommendations based on quality
      this.addQualityRecommendations(assessment, thresholds);

      return assessment;
    } catch (error) {
      console.error('❌ Error assessing content quality:', error);
      return this.getErrorAssessment(article);
    }
  }

  /**
   * Determine if content is eligible for generation based on account rules
   * @param {Object} assessment - Quality assessment
   * @param {Object} thresholds - Account thresholds
   * @param {Object} generationRules - Account generation rules
   * @returns {boolean} Eligibility status
   */
  determineEligibility(assessment, thresholds, generationRules) {
    // Block if flagged as title-only and account blocks this
    if (assessment.content_issues.includes('title_only') && generationRules.block_title_only) {
      return false;
    }

    // Block if no content and account blocks this
    if (assessment.content_issues.includes('no_content') && generationRules.block_no_content) {
      return false;
    }

    // Check minimum quality score requirement
    if (assessment.content_quality_score < thresholds.min_quality_score) {
      return false;
    }

    // Must meet minimum length requirement
    if (!assessment.min_content_length_met) {
      return false;
    }

    return true;
  }

  /**
   * Add quality-specific recommendations
   * @param {Object} assessment - Quality assessment
   * @param {Object} thresholds - Account thresholds
   */
  addQualityRecommendations(assessment, thresholds) {
    if (assessment.quality_tier === 'excellent') {
      assessment.recommendations.push('✅ Excellent content quality - ideal for all content generation types');
    } else if (assessment.quality_tier === 'good') {
      assessment.recommendations.push('✅ Good content quality - suitable for most content generation');
    } else if (assessment.quality_tier === 'fair') {
      assessment.recommendations.push('⚠️ Fair content quality - generation possible but may benefit from source improvement');
      if (assessment.content_length < thresholds.good_content_length) {
        assessment.recommendations.push(`💡 Consider sources with ${thresholds.good_content_length}+ characters for better results`);
      }
    } else {
      assessment.recommendations.push('❌ Poor content quality - not recommended for generation');
      assessment.recommendations.push('💡 Try improving source selection or scraping configuration');
    }
  }

  /**
   * Calculate length-based quality score using account thresholds
   * @param {number} contentLength - Content length
   * @param {Object} thresholds - Account thresholds
   * @returns {number} Length score (0-1)
   */
  calculateLengthScore(contentLength, thresholds) {
    if (contentLength <= 0) return 0;
    if (contentLength < thresholds.min_content_length) return 0.1;
    if (contentLength >= thresholds.excellent_content_length) return 1.0;
    
    // Linear interpolation between min and excellent
    const range = thresholds.excellent_content_length - thresholds.min_content_length;
    const position = contentLength - thresholds.min_content_length;
    return 0.3 + (position / range) * 0.7; // Scale from 0.3 to 1.0
  }

  /**
   * Extract content from article for quality assessment
   * @param {Object} article - Article object
   * @returns {string} Extracted content
   */
  extractContent(article) {
    // Try body_final first, then body_draft, then fallback to title
    const content = article.body_final || article.body_draft || '';
    return content.trim();
  }

  /**
   * Check if article appears to be title-only using account threshold
   * @param {Object} article - Article object
   * @param {number} titleOnlyThreshold - Account-specific threshold
   * @returns {boolean} True if appears to be title-only
   */
  isTitleOnly(article, titleOnlyThreshold) {
    const content = this.extractContent(article);
    const title = article.title || '';
    
    // If content is very short and similar to title
    if (content.length <= titleOnlyThreshold) {
      const similarity = this.calculateStringSimilarity(title, content);
      return similarity > 0.8;
    }
    
    return false;
  }

  /**
   * Calculate content structure quality
   * @param {string} content - Content text
   * @returns {number} Structure score (0-1)
   */
  calculateStructureScore(content) {
    if (!content || content.length === 0) return 0;

    let score = 0.3; // Base score for having content

    // Check for paragraph structure
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    if (paragraphs.length >= 2) score += 0.2;
    if (paragraphs.length >= 4) score += 0.2;

    // Check for sentence variety
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 3) score += 0.1;
    if (sentences.length >= 6) score += 0.1;

    // Check for structured elements (lists, quotes, etc.)
    if (content.includes('-') || content.includes('•') || content.includes('"')) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate content uniqueness score
   * @param {Object} article - Article object
   * @returns {number} Uniqueness score (0-1)
   */
  calculateUniquenessScore(article) {
    const content = this.extractContent(article);
    const title = article.title || '';
    
    if (!content || content.length === 0) return 0;

    // Base uniqueness score
    let score = 0.5;

    // Penalise if content is mostly the title repeated
    const titleWords = title.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    if (titleWords.length > 0 && contentWords.length > 0) {
      const titleWordsInContent = titleWords.filter(word => 
        contentWords.includes(word) && word.length > 3
      ).length;
      const titleRepetitionRatio = titleWordsInContent / titleWords.length;
      
      if (titleRepetitionRatio > 0.8) {
        score -= 0.3;
      } else if (titleRepetitionRatio > 0.5) {
        score -= 0.1;
      }
    }

    // Bonus for content diversity
    const uniqueWords = new Set(contentWords.filter(word => word.length > 3));
    const diversityRatio = uniqueWords.size / contentWords.length;
    if (diversityRatio > 0.5) score += 0.2;
    if (diversityRatio > 0.7) score += 0.3;

    return Math.max(Math.min(score, 1.0), 0);
  }

  /**
   * Calculate string similarity (simple implementation)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity ratio (0-1)
   */
  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get error assessment fallback
   * @param {Object} article - Article object
   * @returns {Object} Error assessment
   */
  getErrorAssessment(article) {
    const content = this.extractContent(article);
    return {
      content_length: content.length,
      content_quality_score: 0.0,
      min_content_length_met: false,
      content_generation_eligible: false,
      content_issues: ['assessment_error'],
      quality_tier: 'poor',
      recommendations: ['❌ Error occurred during quality assessment - manual review recommended']
    };
  }

  /**
   * Update article quality in database
   * @param {number} articleId - Article ID
   * @param {Object} qualityAssessment - Quality assessment object
   * @returns {Promise<boolean>} Success status
   */
  async updateArticleQuality(articleId, qualityAssessment) {
    try {
      await db.query(`
        UPDATE ssnews_scraped_articles 
        SET 
          content_quality_score = ?,
          min_content_length_met = ?,
          content_generation_eligible = ?,
          content_issues = ?
        WHERE article_id = ?
      `, [
        qualityAssessment.content_quality_score,
        qualityAssessment.min_content_length_met,
        qualityAssessment.content_generation_eligible,
        JSON.stringify(qualityAssessment.content_issues),
        articleId
      ]);
      
      return true;
    } catch (error) {
      console.error('❌ Error updating article quality:', error);
      return false;
    }
  }

  /**
   * Check if a story/article is eligible for content generation
   * @param {Object} story - Story object with content to assess
   * @param {string} accountId - Account ID for specific settings (optional)
   * @returns {Promise<boolean>} True if eligible for generation
   */
  async isEligibleForGeneration(story, accountId = null) {
    try {
      // If no account ID provided, try to get it from the story
      const storyAccountId = accountId || story.account_id;
      
      // Assess the content quality
      const assessment = await this.assessContentQuality(story, storyAccountId);
      
      // Return eligibility status
      return assessment.content_generation_eligible;
    } catch (error) {
      console.error('❌ Error checking generation eligibility:', error);
      // Default to false if there's an error
      return false;
    }
  }

  /**
   * Clear quality assessment cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export default new ContentQualityService(); 