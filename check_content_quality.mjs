#!/usr/bin/env node

/**
 * CONTENT QUALITY MONITORING SCRIPT
 * Analyzes content quality across sources and identifies problematic articles
 * Provides actionable insights for improving content generation success rate
 */

import db from './src/services/database.js';

async function monitorContentQuality() {
  try {
    console.log('📊 Content Quality Monitoring Report');
    console.log('='.repeat(80));
    console.log('');
    
    await db.initialize();
    
    // 1. Overall Quality Statistics
    console.log('🎯 OVERALL CONTENT QUALITY STATISTICS');
    console.log('-'.repeat(50));
    
    const overallStats = await db.query(`
      SELECT 
        COUNT(*) as total_articles,
        COUNT(CASE WHEN content_generation_eligible = TRUE THEN 1 END) as eligible_articles,
        COUNT(CASE WHEN content_quality_score >= 0.8 THEN 1 END) as excellent_articles,
        COUNT(CASE WHEN content_quality_score >= 0.5 AND content_quality_score < 0.8 THEN 1 END) as good_articles,
        COUNT(CASE WHEN content_quality_score >= 0.3 AND content_quality_score < 0.5 THEN 1 END) as adequate_articles,
        COUNT(CASE WHEN content_quality_score < 0.3 THEN 1 END) as poor_articles,
        ROUND(AVG(content_quality_score), 3) as avg_quality_score,
        ROUND(AVG(CHAR_LENGTH(COALESCE(full_text, ''))), 0) as avg_content_length,
        MIN(CHAR_LENGTH(COALESCE(full_text, ''))) as min_content_length,
        MAX(CHAR_LENGTH(COALESCE(full_text, ''))) as max_content_length
      FROM ssnews_scraped_articles
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    if (overallStats.length > 0) {
      const stats = overallStats[0];
      console.log(`📄 Total Articles (Last 30 Days): ${stats.total_articles}`);
      console.log(`✅ Eligible for Generation: ${stats.eligible_articles} (${Math.round(stats.eligible_articles/stats.total_articles*100)}%)`);
      console.log(`🌟 Excellent Quality (≥0.8): ${stats.excellent_articles} (${Math.round(stats.excellent_articles/stats.total_articles*100)}%)`);
      console.log(`👍 Good Quality (0.5-0.8): ${stats.good_articles} (${Math.round(stats.good_articles/stats.total_articles*100)}%)`);
      console.log(`⚠️ Adequate Quality (0.3-0.5): ${stats.adequate_articles} (${Math.round(stats.adequate_articles/stats.total_articles*100)}%)`);
      console.log(`❌ Poor Quality (<0.3): ${stats.poor_articles} (${Math.round(stats.poor_articles/stats.total_articles*100)}%)`);
      console.log(`📈 Average Quality Score: ${stats.avg_quality_score}`);
      console.log(`📏 Average Content Length: ${stats.avg_content_length} characters`);
      console.log(`📊 Content Length Range: ${stats.min_content_length} - ${stats.max_content_length} characters`);
    }
    
    // 2. Source Quality Analysis
    console.log('\n🔍 SOURCE QUALITY ANALYSIS');
    console.log('-'.repeat(50));
    
    const sourceQuality = await db.query(`
      SELECT 
        sa.source_id,
        ns.name as source_name,
        ns.url as source_url,
        COUNT(*) as total_articles,
        ROUND(AVG(CHAR_LENGTH(COALESCE(sa.full_text, ''))), 0) as avg_content_length,
        ROUND(AVG(sa.content_quality_score), 3) as avg_quality_score,
        COUNT(CASE WHEN sa.content_generation_eligible = TRUE THEN 1 END) as eligible_articles,
        COUNT(CASE WHEN CHAR_LENGTH(COALESCE(sa.full_text, '')) < 500 THEN 1 END) as short_articles,
        COUNT(CASE WHEN CHAR_LENGTH(COALESCE(sa.full_text, '')) < 100 THEN 1 END) as very_short_articles,
        ROUND((COUNT(CASE WHEN CHAR_LENGTH(COALESCE(sa.full_text, '')) < 500 THEN 1 END) / COUNT(*)) * 100, 1) as short_article_percentage,
        ROUND((COUNT(CASE WHEN sa.content_generation_eligible = TRUE THEN 1 END) / COUNT(*)) * 100, 1) as eligibility_percentage,
        MAX(sa.created_at) as last_article_date,
        COUNT(CASE WHEN sa.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as recent_articles
      FROM ssnews_scraped_articles sa
      LEFT JOIN ssnews_news_sources ns ON sa.source_id = ns.source_id
      WHERE sa.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY sa.source_id, ns.name, ns.url
      HAVING total_articles >= 3
      ORDER BY short_article_percentage DESC, avg_quality_score ASC
    `);
    
    if (sourceQuality.length > 0) {
      console.log(`\n📊 Found ${sourceQuality.length} sources with 3+ articles:\n`);
      
      // Problematic sources (>80% short articles)
      const problematicSources = sourceQuality.filter(source => source.short_article_percentage > 80);
      if (problematicSources.length > 0) {
        console.log('🚨 PROBLEMATIC SOURCES (>80% short articles):');
        problematicSources.forEach(source => {
          console.log(`   ❌ ${source.source_name}`);
          console.log(`      - ${source.total_articles} articles, ${source.short_article_percentage}% short`);
          console.log(`      - ${source.eligibility_percentage}% eligible for generation`);
          console.log(`      - Avg quality: ${source.avg_quality_score}, Avg length: ${source.avg_content_length} chars`);
          console.log(`      - URL: ${source.source_url}\n`);
        });
      }
      
      // Good sources (>50% eligible)
      const goodSources = sourceQuality.filter(source => source.eligibility_percentage > 50);
      if (goodSources.length > 0) {
        console.log('✅ HIGH-QUALITY SOURCES (>50% eligible):');
        goodSources.forEach(source => {
          console.log(`   ✅ ${source.source_name}`);
          console.log(`      - ${source.total_articles} articles, ${source.eligibility_percentage}% eligible`);
          console.log(`      - Avg quality: ${source.avg_quality_score}, Avg length: ${source.avg_content_length} chars`);
          console.log(`      - Recent activity: ${source.recent_articles} articles in last 7 days\n`);
        });
      }
    }
    
    // 3. Recent Failures Analysis
    console.log('\n💥 RECENT CONTENT GENERATION FAILURES');
    console.log('-'.repeat(50));
    
    const recentFailures = await db.query(`
      SELECT 
        ga.gen_article_id,
        ga.title,
        ga.based_on_scraped_article_id,
        sa.content_quality_score,
        sa.content_generation_eligible,
        CHAR_LENGTH(COALESCE(sa.full_text, '')) as source_content_length,
        COUNT(gc.content_id) as generated_content_pieces,
        ga.created_at
      FROM ssnews_generated_articles ga
      LEFT JOIN ssnews_scraped_articles sa ON ga.based_on_scraped_article_id = sa.article_id
      LEFT JOIN ssnews_generated_content gc ON ga.gen_article_id = gc.based_on_gen_article_id
      WHERE ga.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND (sa.content_generation_eligible = FALSE OR sa.content_quality_score < 0.3)
      GROUP BY ga.gen_article_id, ga.title, ga.based_on_scraped_article_id, sa.content_quality_score, sa.content_generation_eligible, source_content_length, ga.created_at
      ORDER BY ga.created_at DESC
      LIMIT 10
    `);
    
    if (recentFailures.length > 0) {
      console.log(`Found ${recentFailures.length} recent content generation attempts with poor source quality:\n`);
      recentFailures.forEach((failure, index) => {
        console.log(`${index + 1}. Gen#${failure.gen_article_id}: "${failure.title}"`);
        console.log(`   - Source Article #${failure.based_on_scraped_article_id}`);
        console.log(`   - Quality Score: ${failure.content_quality_score || 'N/A'}`);
        console.log(`   - Source Length: ${failure.source_content_length} chars`);
        console.log(`   - Generation Eligible: ${failure.content_generation_eligible ? 'Yes' : 'No'}`);
        console.log(`   - Content Pieces Generated: ${failure.generated_content_pieces}`);
        console.log(`   - Created: ${failure.created_at}\n`);
      });
    } else {
      console.log('✅ No recent content generation attempts with poor source quality found.');
    }
    
    // 4. Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(50));
    
    const totalEligible = overallStats[0]?.eligible_articles || 0;
    const totalArticles = overallStats[0]?.total_articles || 1;
    const eligibilityRate = (totalEligible / totalArticles) * 100;
    
    if (eligibilityRate < 20) {
      console.log('🚨 CRITICAL: Very low content generation eligibility rate (<20%)');
      console.log('   - Review scraping processes for all sources');
      console.log('   - Consider switching to sources with better content extraction');
      console.log('   - Implement content extraction improvements');
    } else if (eligibilityRate < 50) {
      console.log('⚠️ WARNING: Low content generation eligibility rate (<50%)');
      console.log('   - Focus on improving top 5 sources with poor quality');
      console.log('   - Review content extraction methods');
    } else {
      console.log('✅ Good overall content quality for generation');
    }
    
         const problematicSourcesList = sourceQuality?.filter(source => source.short_article_percentage > 80) || [];
     if (problematicSourcesList.length > 0) {
       console.log(`\n🔧 Specific Actions Required:`);
       console.log(`   - Review scraping configuration for ${problematicSourcesList.length} problematic sources`);
       console.log(`   - Consider disabling automatic generation for sources with <20% eligibility`);
       console.log(`   - Implement manual content review workflow for low-quality sources`);
     }
    
    // 5. Article #365 Specific Check
    console.log('\n🔍 ARTICLE #365 STATUS CHECK');
    console.log('-'.repeat(50));
    
    const article365Check = await db.query(`
      SELECT 
        article_id,
        title,
        CHAR_LENGTH(COALESCE(full_text, '')) as content_length,
        content_quality_score,
        content_generation_eligible,
        min_content_length_met,
        created_at
      FROM ssnews_scraped_articles 
      WHERE article_id = 365
    `);
    
    if (article365Check.length > 0) {
      const article = article365Check[0];
      console.log(`✅ Article #365 Quality Assessment:`);
      console.log(`   - Title: "${article.title}"`);
      console.log(`   - Content Length: ${article.content_length} characters`);
      console.log(`   - Quality Score: ${article.content_quality_score}`);
      console.log(`   - Generation Eligible: ${article.content_generation_eligible ? 'Yes' : 'No'}`);
      console.log(`   - Meets Min Length: ${article.min_content_length_met ? 'Yes' : 'No'}`);
      console.log(`   - Status: ${article.content_generation_eligible ? '✅ System will block generation' : '❌ Would be blocked (correct behavior)'}`);
    } else {
      console.log('❌ Article #365 not found');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 Content Quality Monitoring Complete');
    console.log('💡 Use this data to improve scraping quality and source selection');
    console.log('🚀 System now prevents generation on low-quality articles automatically');
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Content quality monitoring failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

monitorContentQuality(); 