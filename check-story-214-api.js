#!/usr/bin/env node

/**
 * CHECK STORY 214 VIA API
 * Investigate the truncation issue using the application's API
 */

async function checkStory214API() {
  try {
    console.log('🔍 Investigating Story #214 via API...');
    
    // Get the content for story 214
    const response = await fetch('http://localhost:5576/api/eden/content/story/214/all');
    
    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n📊 API Response Overview:');
    console.log('Success:', data.success);
    console.log('Story ID:', data.storyId);
    console.log('Total Content Items:', data.totalItems);
    console.log('Categories Available:', data.categories);
    
    // Focus on social media content
    const socialMediaContent = data.content.filter(item => item.prompt_category === 'social_media');
    
    console.log('\n📱 Social Media Content Analysis:');
    console.log(`Found ${socialMediaContent.length} social media content item(s)`);
    
    socialMediaContent.forEach((item, index) => {
      console.log(`\n--- Social Media Item #${index + 1} ---`);
      console.log('Content ID:', item.content_id);
      console.log('Status:', item.status);
      console.log('Created At:', item.created_at);
      
      // Check the content_data structure
      console.log('\n📊 Content Data Analysis:');
      if (typeof item.content_data === 'string') {
        console.log('Content data is stored as string');
        console.log('Length:', item.content_data.length);
        console.log('Starts with:', item.content_data.substring(0, 50));
        console.log('Ends with:', item.content_data.substring(item.content_data.length - 50));
        console.log('Ends with quote?', item.content_data.endsWith('"'));
        console.log('Contains ```json?', item.content_data.includes('```json'));
        console.log('Contains ...?', item.content_data.includes('...'));
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(item.content_data);
          console.log('\n✅ Successfully parsed as JSON:');
          console.log(JSON.stringify(parsed, null, 2));
        } catch (error) {
          console.log('\n❌ Failed to parse as JSON:', error.message);
          console.log('Raw content:');
          console.log('='.repeat(80));
          console.log(item.content_data);
          console.log('='.repeat(80));
        }
      } else if (typeof item.content_data === 'object') {
        console.log('Content data is already parsed as object');
        console.log(JSON.stringify(item.content_data, null, 2));
      } else {
        console.log('Content data type:', typeof item.content_data);
        console.log('Content data:', item.content_data);
      }
      
      // Check metadata
      if (item.metadata) {
        console.log('\n📝 Metadata:');
        console.log(JSON.stringify(item.metadata, null, 2));
      }
    });
    
    // Check how the UI would interpret this data
    console.log('\n🖥️ UI Interpretation Analysis:');
    
    socialMediaContent.forEach((item, index) => {
      console.log(`\n--- UI Analysis for Item #${index + 1} ---`);
      
      // Simulate the UI parsing logic
      let contentData = item.content_data;
      if (typeof contentData === 'string') {
        try {
          contentData = JSON.parse(contentData);
        } catch (error) {
          console.log('❌ UI would fail to parse JSON');
        }
      }
      
      if (Array.isArray(contentData)) {
        console.log('Content would be rendered as array with', contentData.length, 'items');
        contentData.forEach((socialItem, socialIndex) => {
          const text = socialItem.text || socialItem.content;
          if (text) {
            console.log(`\nSocial Item ${socialIndex + 1}:`);
            console.log('Text length:', text.length);
            console.log('Text ends with quote?', text.endsWith('"'));
            console.log('Text contains ```json?', text.includes('```json'));
            console.log('Text contains ...?', text.includes('...'));
            
            // Check if this would trigger truncation warning
            const wouldShowWarning = text.includes('```json') || text.includes('...') || text.endsWith('"') === false;
            console.log('Would show truncation warning?', wouldShowWarning);
            
            if (wouldShowWarning) {
              console.log('🚨 TRUNCATION WARNING TRIGGER FOUND!');
              if (text.includes('```json')) console.log('  - Triggered by: contains ```json');
              if (text.includes('...')) console.log('  - Triggered by: contains ...');
              if (text.endsWith('"') === false) console.log('  - Triggered by: does not end with quote');
            }
          }
        });
      } else if (typeof contentData === 'object') {
        // Check each platform
        ['facebook', 'instagram', 'linkedin', 'twitter'].forEach(platform => {
          if (contentData[platform]) {
            const platformData = contentData[platform];
            const text = platformData.text || platformData;
            if (text) {
              console.log(`\n${platform} post:`);
              console.log('Text length:', text.length);
              console.log('Text ends with quote?', text.endsWith('"'));
              console.log('Text contains ```json?', text.includes('```json'));
              console.log('Text contains ...?', text.includes('...'));
              
              const wouldShowWarning = text.includes('```json') || text.includes('...') || text.endsWith('"') === false;
              console.log('Would show truncation warning?', wouldShowWarning);
              
              if (wouldShowWarning) {
                console.log('🚨 TRUNCATION WARNING TRIGGER FOUND!');
                if (text.includes('```json')) console.log('  - Triggered by: contains ```json');
                if (text.includes('...')) console.log('  - Triggered by: does not end with quote');
                if (text.endsWith('"') === false) console.log('  - Triggered by: does not end with quote');
              }
            }
          }
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error investigating story 214:', error.message);
  }
}

checkStory214API(); 