#!/usr/bin/env node

import db from './src/services/database.js';
import dotenv from 'dotenv';

dotenv.config();

const newPromptContent = `You are an AI assistant that is an expert at writing image generation prompts. Based on the following article and analysis, write a single, detailed, and evocative paragraph that can be used as a prompt for an AI image generator like Ideogram.

**Article:**
{article_content}

**Analysis:**
{analysis_output}

**Instructions:**
- Write only the prompt itself.
- Do not include any preamble, instructions, or extra text like "Here is a prompt:".
- The prompt should describe a visually rich scene, including details about the subject, setting, lighting, color, and mood.
- The prompt should be a single paragraph.

**Example of a good prompt:**
A lone, weathered lighthouse stands firm against a stormy sea, its powerful beam cutting through the dark clouds, symbolizing hope and steadfastness in times of trial. The waves crash against the rocks below, sending a salty spray high into the air. The overall mood is one of resilience and unwavering faith.`;

const newSystemMessage = `You are an expert image prompt writer for Eden.co.uk. Your prompts create visually stunning, thematically relevant images for a Christian audience.`;

async function forceUpdateImagePrompt() {
  try {
    console.log('🔥 Force-updating the image generation prompt in the database...');
    await db.initialize();

    const templates = await db.query(`
      SELECT template_id FROM ssnews_prompt_templates 
      WHERE category = 'image_generation' AND account_id = '56a17e9b-2274-40cc-8c83-4979e8df671a'
    `);

    if (!templates || templates.length === 0) {
      throw new Error('Image generation template not found for the account.');
    }

    const templateId = templates[0].template_id;
    console.log(`✅ Found template with ID: ${templateId}`);

    // Create a new version
    const result = await db.query(`
      INSERT INTO ssnews_prompt_versions (template_id, version_number, prompt_content, system_message, notes)
      SELECT ?, COALESCE(MAX(version_number), 0) + 1, ?, ?, 'Forcibly updated to fix generation issues'
      FROM ssnews_prompt_versions WHERE template_id = ?
    `, [templateId, newPromptContent, newSystemMessage, templateId]);
    
    const newVersionId = result.insertId;
    console.log(`✅ Created new prompt version with ID: ${newVersionId}`);
    
    // Set the new version as current
    await db.query(`UPDATE ssnews_prompt_versions SET is_current = FALSE WHERE template_id = ?`, [templateId]);
    await db.query(`UPDATE ssnews_prompt_versions SET is_current = TRUE WHERE version_id = ?`, [newVersionId]);

    console.log(`✅✅✅ Successfully updated the image generation prompt to version ${newVersionId} and set it as current!`);

  } catch (error) {
    console.error('❌❌❌ Failed to update image prompt:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

forceUpdateImagePrompt(); 