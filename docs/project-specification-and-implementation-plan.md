Okay, this is a fantastic and detailed vision! Here's a comprehensive briefing document, architecture, and implementation plan designed for another AI (or a development team led by an AI) to follow.

## Project Eden: AI Content Automation - Briefing Document

**Version:** 1.0
**Date:** October 26, 2023
**Prepared For:** AI Development System
**Prepared By:** User via AI Assistant

**1. Project Vision & Executive Summary**

Project Eden aims to create an AI-powered content generation and marketing assistant for `eden.co.uk`. The system will automate the creation of blog content, PR articles, social media posts, and short video scripts by:
1.  Aggregating and analyzing top news stories from specified Christian news websites daily.
2.  Comparing these stories against Eden's existing website content, product catalog, and social media presence to identify relevant angles and opportunities.
3.  Generating new, original content (articles, social posts, video scripts) aligned with Eden's brand viewpoint, tone of voice, and product offerings.
4.  Sourcing appropriate, royalty-free imagery to accompany the generated textual content.

The ultimate goal is to increase Eden's content output, enhance SEO, drive engagement, and subtly promote relevant Eden products in a timely and contextually appropriate manner, while maintaining brand integrity and theological soundness.

**2. Core Goals & Objectives**

*   **Automate Content Ideation & Creation:** Significantly reduce manual effort in identifying trending topics and drafting initial content.
*   **Increase Content Velocity:** Publish relevant, timely content more frequently across blog and social channels.
*   **Enhance SEO & Discoverability:** Produce keyword-rich content aligned with current Christian news and discussions.
*   **Drive Engagement:** Create shareable content that resonates with the target Christian audience.
*   **Promote Products Contextually:** Naturally integrate Eden's products (books, Bibles, devotionals) into relevant content.
*   **Maintain Brand Voice & Values:** Ensure all AI-generated content is warm, encouraging, hopeful, rooted in Christian faith, and adheres to specified theological and ethical guidelines.
*   **Optimize for Multiple Platforms:** Generate content in formats suitable for blog, PR, Instagram, Facebook, and short-form video.

**3. Target Audience (for Eden's Content)**

*   UK-based Christians across various denominations.
*   Individuals seeking spiritual growth, encouragement, Christian resources, and insights on faith in contemporary life.
*   Families, church leaders, and individuals interested in Christian books, Bibles, devotionals, and study guides.

**4. Core System Functionality & Workflow**

The system will operate through a series of interconnected modules:

**Module 1: News Aggregation & Curation**
*   **Action:** Daily scrape specified Christian news websites (see Section 6.1).
*   **Process:**
    *   Fetch articles from RSS feeds or by direct website scraping (respecting `robots.txt`).
    *   Extract key information: title, publication date, source, full text or summary, social share counts (if available via API or scraping).
    *   Store scraped data in the `ssnews_scraped_articles` database table.
*   **Output:** A collection of recent news articles.

**Module 2: News Analysis & Prioritization**
*   **Action:** Identify the top 3-5 most relevant/engaging news stories.
*   **Process:**
    *   Use NLP techniques (summarization, keyword extraction, sentiment analysis) on scraped articles.
    *   Prioritize based on:
        *   Social engagement metrics (shares, comments - if accessible).
        *   Relevance to "High-Engagement News Themes" (see Section 6.3.1).
        *   Alignment with Eden's brand and avoidance of "News Topics to Avoid" (see Section 6.3.2).
        *   Frequency of topic appearance across multiple sources.
    *   Utilize AI (e.g., Gemini/OpenAI) with prompts like: `Summarise the top 5 most shared or discussed Christian news stories today from the provided [list of scraped article summaries]. Focus on themes relevant to [Eden's approved themes list].`
*   **Output:** A ranked list of top news stories with summaries and extracted keywords.

**Module 3: Eden Content Contextualization**
*   **Action:** Compare top news stories with Eden's existing content landscape.
*   **Process:**
    *   Maintain an index of Eden's website content (blog posts, product descriptions - perhaps via sitemap or direct scrape initially, then CMS integration). Store in `ssnews_eden_content_index`.
    *   Index recent Eden social media posts (Facebook, Instagram) and email newsletter themes (if accessible via API or manual input).
    *   For each top news story, use AI (e.g., Gemini/OpenAI) to: `Compare this news story: [news summary] with existing Eden content themes: [list of Eden themes/keywords/product categories]. Identify overlaps, gaps, or opportunities to add a unique Eden perspective related to [Eden's products like Christian books, Bibles, devotionals].`
    *   Cross-reference news themes with Eden product categories (e.g., news on anxiety -> devotionals for anxiety; news on Bible literacy -> study Bibles).
*   **Output:** Prioritized news stories with suggested Eden-specific angles and relevant product categories/keywords.

**Module 4: Content Generation Engine**
*   **Action:** Generate various content formats based on prioritized news and Eden context.
*   **Process (using AI like Gemini/OpenAI for each sub-task):**

    *   **4.1 Blog/PR Article Generation:**
        *   **Prompt Example:** `Write a [600-800/approx. 500] word blog post [PR article] in Eden's tone of voice (warm, encouraging, hopeful, rooted in Christian faith). Reference the news story: [news summary/link]. Connect it to [identified Eden product categories/specific book types like devotionals, study guides]. Include [1-2] internal links to placeholder product pages like '/bibles/study-bibles' or '/books/devotionals-for-anxiety'. Include a subtle call-to-action related to exploring these resources. Avoid [list of forbidden topics].`
        *   Store in `ssnews_generated_articles`.

    *   **4.2 Social Media Post Generation:**
        *   **Prompt Example:** `Based on this blog post draft: [generated blog post text], create an Instagram/Facebook post of 150-250 words. Include an emotional hook suitable for a Christian audience. Briefly mention the core theme and a related resource type from Eden.`
        *   For LinkedIn (if applicable): `Create a LinkedIn article summary of 400-600 words from this blog post: [generated blog post text], maintaining an editorial and insightful tone.`
        *   Store in `ssnews_generated_social_posts`.

    *   **4.3 Short Video Script Generation:**
        *   **Prompt Example:** `Create a [30-60 second for Reels/Shorts OR up to 2-minute for Facebook/YouTube] social video script based on this blog post: [generated blog post text]. Highlight the key theme and a relevant Eden product type. Make it engaging, succinct, and visually descriptive (suggesting simple visuals like "hands opening a Bible," "person journaling," "sunrise over a hill"). Focus on a clear narrative. Ensure the tone is warm and encouraging.`
        *   Store in `ssnews_generated_video_scripts`.

*   **Output:** Drafts of blog posts, PR articles, social media posts, and video scripts.

**Module 5: Image Sourcing & Association**
*   **Action:** Find suitable royalty-free images for generated articles and social posts.
*   **Process:**
    *   Utilize Pexels API (and potentially Unsplash/Pixabay if direct APIs are available and integrated).
    *   Use AI (e.g., Gemini/OpenAI with function calling or structured output) to generate search queries for Pexels based on article content and image guidelines.
    *   **Prompt Example:** `For an article about [article summary/theme], suggest 3 Pexels search queries to find royalty-free images. Images should evoke warmth, hope, natural light. Show diverse people in natural expressions of reflection or study, or nature scenes, open Bibles. Avoid literal religious symbolism, Jesus' face, overly 'stocky' photos, or misused symbols. Prefer editorial lifestyle photography.`
    *   Fetch images based on AI-suggested queries.
    *   (Optional Advanced) Use an image analysis model (e.g., Google Vision AI, or multimodal capabilities of Gemini) to perform a final check against theological/brand guidelines if feasible.
    *   Upload selected images to Sirv CDN.
    *   Store image URLs (from Sirv) and metadata in `ssnews_image_assets` and associate with generated content.
*   **Output:** URLs of approved, CDN-hosted images linked to content pieces.

**Module 6: Human Review & Editing Interface**
*   **Action:** Present all generated content (text, image suggestions, video scripts) to a human editor for review, approval, and modification.
*   **Process:**
    *   A frontend application (React) will display:
        *   The original news source/summary.
        *   The generated Eden content (blog, social, video script).
        *   Suggested images.
        *   Option to edit text, select/reject/search for new images, and approve content for publishing.
        *   Option to add/edit product links.
*   **Output:** Approved and finalized content ready for scheduling/publishing.

**Module 7: Evergreen Content Management**
*   **Action:** Store, manage, and suggest evergreen content for strategic publishing.
*   **Process:**
    *   Pre-load the provided list of evergreen topics and the example calendar into `ssnews_evergreen_content_ideas` and `ssnews_evergreen_calendar` tables.
    *   The system can periodically suggest generating content for these topics, especially during news lulls or to align with the calendar.
    *   If a news story aligns with an evergreen theme, the system can propose adapting existing evergreen outlines or generating fresh content inspired by both.
*   **Output:** A library of evergreen content ideas and a schedule, with capabilities to generate or repurpose content.

**5. Content Guidelines**

**5.1. Tone of Voice & Brand Viewpoint:**
*   **Warm, encouraging, hopeful, and rooted in the Christian faith.**
*   Empathetic, understanding, and supportive.
*   Avoid overly academic, judgmental, or exclusive language.
*   Focus on practical application of faith and scripture.

**5.2. Content Formats & Lengths:**
*   **Blog Posts:** 600–800 words.
*   **PR Articles:** Approx. 500 words.
*   **Social Media (Instagram/Facebook):** 150–250 words with an emotional hook.
*   **Social Media (LinkedIn - if used):** 400–600 words, editorial tone.
*   **Short Video Scripts (Reels/TikTok/Shorts):** 30–60 seconds.
*   **Short Video Scripts (Facebook/YouTube longer):** Up to 2 minutes.

**5.3. Image Sourcing Guidelines:**
*   **Source:** Pexels API (primary), Unsplash, Pixabay (if APIs integrated), Eden's own brand media library (if accessible via API/upload), licensed platforms like Adobe Stock/Lightstock (if subscriptions and APIs are available). **Strictly no scraping from news sites or unauthorized Google Images.**
*   **Brand Tone:** Warm, welcoming, hopeful, natural light, soft colors. Modern but reverent. Editorial lifestyle. Avoid cheesy/stocky.
*   **Theological Appropriateness:**
    *   AVOID depictions of Jesus' face.
    *   AVOID mystical symbols or overly Catholic iconography (unless contextually appropriate for a specific topic).
    *   CAUTION with crosses, churches, Bible images that appear distorted, misused, or too abstract.
    *   PREFER symbols of hope, community, nature, light, the Bible (open, being read), hands in prayer, diverse families/individuals in study or reflection.
*   **People:**
    *   Diverse representation (ethnicity, age, gender, ability).
    *   Candid, natural expressions of worship, joy, reflection, study.
    *   AVOID overt emotional manipulation or over-posed shots.
    *   NO children without obvious parental permission cues or from verified safe stock libraries (Pexels generally good).
*   **AI Prompt for Image Search (Internal):** `Find 3 royalty-free images from Pexels to accompany this Christian article about [topic]. Use soft natural light, diverse people or hands in action, open Bibles, or reflective nature scenes. Avoid literal or abstract religious symbolism. Do not show Jesus' face. Ensure images are modern and hopeful, not cheesy.`

**5.4. Video Content Guidelines:**
*   Scripts should be visually descriptive, suggesting shots that align with the image guidelines.
*   Focus on one key message or theme.
*   Include a subtle call to action or point to a resource.
*   Ensure voiceover tone (if specified in script) matches Eden's brand voice.

**6. Data & Sources**

**6.1. News Sources for Aggregation (UK-based Christian):**
*   **Primary:**
    *   Premier Christian News (premierchristian.news)
    *   Christian Today (UK edition) (christiantoday.com/uk)
    *   Church Times (churchtimes.co.uk) - *Note: Anglican, weekly, good for theological developments.*
    *   Evangelical Alliance (eauk.org) - *Note: Excellent for in-depth perspectives, weekly.*
*   **Secondary/Supplementary:**
    *   Christian Concern (christianconcern.com) - *Use with discretion, activist tone.*
    *   Baptist Times (baptist.org.uk/news) - *Niche, monthly.*
    *   Catholic Herald (UK) (catholicherald.co.uk) - *Broader Christian culture, tone may vary.*
    *   Premier Gospel / Premier Christian Radio (premiergospel.org.uk / premierchristianradio.com) - *Interviews, human interest.*
    *   UCB (United Christian Broadcasters) (ucb.co.uk/news) - *Inspirational stories.*
*   **Bonus (Harder to automate, for human input or advanced scraping):**
    *   Faithfully Magazine (faithfullymagazine.com)
    *   Twitter/X, Threads, Facebook pages of UK Christian influencers (e.g., @NTWrightOnline, @JustinBrierley, @PremierRadio)
    *   RSS feeds from blogs/church networks (New Wine, Vineyard UK, 24-7 Prayer)

**6.2. Eden's Internal Content & Product Data:**
*   Website: `www.eden.co.uk` (sitemap for articles, product pages for linking).
*   Social Channels: Facebook, Instagram (API access for recent post themes if possible).
*   Email Newsletters: (Themes might need manual input or keyword extraction if content is accessible).
*   Product Catalogue: For linking (e.g., Bibles, devotionals, study guides, Christian books for different demographics). ISBNdb API can be used for enriching book data if ISBNs are available.

**6.3. Content Themes:**

    **6.3.1. High-Engagement News Themes to Comment On:**
    *   Persecution & global Christianity
    *   Celebrity faith journeys
    *   Church trends (revival, deconstruction, growth patterns)
    *   Faith and culture (Christianity in media/entertainment)
    *   Christian events calendar (Lent, Easter, Advent, Christmas)
    *   Bible literacy and discipleship (strongest product alignment)
    *   Data-driven: Christian mental health news (link to devotionals for anxiety), faith-based parenting (link to children’s Bibles).

    **6.3.2. News Topics to AVOID:**
    *   Highly political or partisan content (elections, government policy, Brexit/immigration).
    *   Theological controversies & Church splits (same-sex marriage in Church, women in ministry, denominational disputes).
    *   Scandal-based stories (moral failures, misconduct, abuse scandals).
    *   Unverified prophetic claims or speculation.
    *   Interfaith conflict narratives.
    *   Deaths and tragedies *without a clear pastoral context or message of hope that Eden can provide*.

**6.4. Evergreen Content:**
*   Utilize the extensive list of evergreen themes and the example calendar provided by the user. These will be pre-loaded into the system.
*   Topics cover: Christian Living & Spiritual Growth, Bible Literacy, Faith and Family, Church & Community Life, Christian Seasons, Faith in the Modern World, Book/Resource Guides, Encouragement & Testimony, Ministry & Missions.

**7. Technical Architecture & Implementation Plan**

This plan leverages the "Simon's Says News" existing tech stack and infrastructure.

**7.1. High-Level System Architecture (Conceptual):**

```mermaid
graph TD
    A[Scheduled Cron Job/Task] --> B{News Aggregation Module};
    B -- Raw News Data --> C[Database (ssnews_scraped_articles)];
    C --> D{News Analysis & Prioritization Module};
    D -- Top News Stories --> E{Eden Content Contextualization Module};
    F[Eden Content Index (ssnews_eden_content_index, Social Feeds, Product Data)] --> E;
    E -- News + Eden Angle --> G{AI Content Generation Engine};
    G -- Text Prompts --> H[OpenAI/Gemini APIs];
    H -- Generated Text --> G;
    G -- Blog/PR/Social/Video Scripts --> I[Database (ssnews_generated_*)];
    I --> J{Image Sourcing Module};
    J -- Image Search Prompts --> K[Pexels API];
    K -- Image Results --> J;
    J -- Selected Images --> L[Sirv CDN API];
    L -- Image URLs --> M[Database (ssnews_image_assets)];
    N[Evergreen Content DB (ssnews_evergreen_*)] --> G;
    I & M & N --> O{Human Review & Editing Interface (React Frontend)};
    O -- User Actions --> P[Backend API (Node.js/Express)];
    P -- Updates --> C;
    P -- Updates --> I;
    P -- Updates --> M;
    O -- Finalized Content --> Q[Publishing Queue/CMS Integration (Future)];

    subgraph "AI Core"
        H
    end
    subgraph "External APIs"
        K
        L
    end
    subgraph "Database (MySQL)"
        C
        F
        I
        M
        N
    end
    subgraph "User Interaction"
        O
    end
```

**7.2. Component Breakdown & Technology Mapping:**

*   **Backend Server (`server.js`):** Node.js, Express.js
    *   Orchestrates all modules.
    *   Serves the React frontend.
    *   Handles API requests from the frontend.
    *   Manages cron jobs for news aggregation.
*   **Frontend (`src/`):** React 18, Vite, Tailwind CSS
    *   Human Review & Editing Interface.
    *   Dashboard for monitoring.
*   **Database:** MySQL (via `mysql2` package)
    *   See Section 7.3 for schema.
*   **AI Integration (`src/services/aiService.js` or similar):**
    *   OpenAI API (GPT-4, DALL-E if needed for image *ideas* but not final images)
    *   Google Gemini API (Gemini 2.5 Flash/Pro)
    *   Wrappers for consistent prompting and response handling.
*   **News Scraping/Aggregation (`src/services/newsAggregator.js`):**
    *   Libraries like `axios` for HTTP requests, `cheerio` for HTML parsing (if RSS not available/sufficient).
    *   RSS feed parsers (e.g., `rss-parser`).
*   **Image Handling (`src/services/imageService.js`):**
    *   Pexels API client.
    *   Sirv API client for uploading and CDN management.
*   **Task Scheduling:** Node-cron or similar for daily aggregation. Could also be a Heroku Scheduler add-on.

**7.3. Database Schema (MySQL - `ssnews_` prefix for all tables):**

*   `ssnews_news_sources`:
    *   `source_id` (PK, INT, AUTO_INCREMENT)
    *   `name` (VARCHAR(255))
    *   `url` (VARCHAR(255))
    *   `rss_feed_url` (VARCHAR(255), NULLABLE)
    *   `last_scraped_at` (TIMESTAMP, NULLABLE)
    *   `is_active` (BOOLEAN, DEFAULT TRUE)

*   `ssnews_scraped_articles`:
    *   `article_id` (PK, INT, AUTO_INCREMENT)
    *   `source_id` (FK, INT, references `ssnews_news_sources`)
    *   `title` (TEXT)
    *   `url` (VARCHAR(512), UNIQUE)
    *   `publication_date` (DATETIME, NULLABLE)
    *   `scraped_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
    *   `full_text` (LONGTEXT, NULLABLE)
    *   `summary_ai` (TEXT, NULLABLE) -- AI-generated summary
    *   `keywords_ai` (TEXT, NULLABLE) -- AI-extracted keywords
    *   `social_shares` (INT, NULLABLE)
    *   `relevance_score` (FLOAT, NULLABLE) -- Score based on analysis
    *   `status` (ENUM('scraped', 'analyzed', 'processed'), DEFAULT 'scraped')

*   `ssnews_eden_content_index`: (For Eden's existing content)
    *   `content_id` (PK, INT, AUTO_INCREMENT)
    *   `url` (VARCHAR(512), UNIQUE)
    *   `title` (TEXT)
    *   `type` (ENUM('blog', 'product', 'social_post', 'newsletter_theme'))
    *   `content_summary` (TEXT)
    *   `keywords` (TEXT)
    *   `last_indexed_at` (TIMESTAMP)

*   `ssnews_generated_articles`:
    *   `gen_article_id` (PK, INT, AUTO_INCREMENT)
    *   `based_on_scraped_article_id` (FK, INT, references `ssnews_scraped_articles`, NULLABLE)
    *   `based_on_evergreen_id` (FK, INT, references `ssnews_evergreen_content_ideas`, NULLABLE)
    *   `title` (TEXT)
    *   `body_draft` (LONGTEXT)
    *   `body_final` (LONGTEXT, NULLABLE)
    *   `content_type` (ENUM('blog', 'pr_article', 'social_post_long'))
    *   `word_count` (INT)
    *   `tone_of_voice_alignment_score_ai` (FLOAT, NULLABLE)
    *   `suggested_eden_product_links` (TEXT) -- JSON array of {text: "link text", url: "/path"}
    *   `status` (ENUM('draft', 'review_pending', 'approved', 'published'), DEFAULT 'draft')
    *   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
    *   `updated_at` (TIMESTAMP)
    *   `reviewed_by_human_at` (TIMESTAMP, NULLABLE)

*   `ssnews_generated_social_posts`: (For short Instagram/Facebook posts)
    *   `gen_social_id` (PK, INT, AUTO_INCREMENT)
    *   `based_on_gen_article_id` (FK, INT, references `ssnews_generated_articles`, NULLABLE)
    *   `platform` (ENUM('instagram', 'facebook'))
    *   `text_draft` (TEXT)
    *   `text_final` (TEXT, NULLABLE)
    *   `emotional_hook_present_ai_check` (BOOLEAN, NULLABLE)
    *   `status` (ENUM('draft', 'review_pending', 'approved', 'published'), DEFAULT 'draft')
    *   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

*   `ssnews_generated_video_scripts`:
    *   `gen_video_script_id` (PK, INT, AUTO_INCREMENT)
    *   `based_on_gen_article_id` (FK, INT, references `ssnews_generated_articles`)
    *   `title` (VARCHAR(255))
    *   `duration_target_seconds` (INT) -- e.g., 30, 60, 120
    *   `script_draft` (TEXT)
    *   `script_final` (TEXT, NULLABLE)
    *   `visual_suggestions` (TEXT, NULLABLE)
    *   `status` (ENUM('draft', 'review_pending', 'approved'), DEFAULT 'draft')
    *   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

*   `ssnews_image_assets`:
    *   `image_id` (PK, INT, AUTO_INCREMENT)
    *   `associated_content_type` (ENUM('gen_article', 'gen_social_post'))
    *   `associated_content_id` (INT) -- FK to `ssnews_generated_articles.gen_article_id` or `ssnews_generated_social_posts.gen_social_id`
    *   `source_api` (ENUM('pexels', 'sirv_upload', 'eden_library'))
    *   `source_image_id_external` (VARCHAR(255), NULLABLE) -- e.g., Pexels ID
    *   `sirv_cdn_url` (VARCHAR(512), UNIQUE)
    *   `alt_text_suggestion_ai` (VARCHAR(255), NULLABLE)
    *   `uploaded_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
    *   `is_approved_human` (BOOLEAN, DEFAULT FALSE)

*   `ssnews_evergreen_content_ideas`:
    *   `evergreen_id` (PK, INT, AUTO_INCREMENT)
    *   `theme_category` (VARCHAR(255)) -- e.g., "Christian Living", "Bible Literacy"
    *   `title_idea` (TEXT)
    *   `brief_description` (TEXT)
    *   `target_keywords` (TEXT, NULLABLE)
    *   `relevant_product_types` (TEXT, NULLABLE) -- e.g., "devotionals", "study Bibles"

*   `ssnews_evergreen_calendar`:
    *   `calendar_entry_id` (PK, INT, AUTO_INCREMENT)
    *   `month` (VARCHAR(20)) -- e.g., "January", "February"
    *   `theme` (VARCHAR(255))
    *   `blog_article_idea_fk` (FK, INT, references `ssnews_evergreen_content_ideas`, NULLABLE) -- Link to a specific idea
    *   `social_post_summary_idea` (TEXT)
    *   `video_idea_summary` (TEXT)
    *   `suggested_product_link_category` (VARCHAR(255))

**7.4. API Integrations (Summary from provided list):**
*   **Core AI:** OpenAI (`OPENAI_API_KEY`), Google Gemini (`GEMINI_API_KEY`)
*   **Image Sourcing:** Pexels (`PEXELS_API_KEY`)
*   **Image Hosting/CDN:** Sirv (`SIRV_CLIENT_ID`, `SIRV_CLIENT_SECRET`, `SIRV_PUBLIC_URL`)
*   **Book Data (Optional Enrichment):** ISBNdb (`ISBNDB_COM_API_KEY`) - if products have ISBNs and this adds value.
*   *(Other APIs like YouTube, Brandfetch, Podcast Index, Google Maps, Freshsales are available but seem less directly applicable to the core content generation loop for Eden, unless specific features are planned that use them, e.g., linking to Eden's YouTube videos if relevant).*

**7.5. Development Workflow & Process:**
1.  **Setup Backend:** Initialize Node.js/Express project, configure MySQL connection with `mysql2` and SSL. Implement basic API structure.
2.  **Database Migration:** Create initial tables using SQL scripts.
3.  **Module Development (Iterative):**
    *   **News Aggregation:** Implement scrapers/RSS parsers for primary news sources. Schedule daily runs.
    *   **AI Service Wrappers:** Create reusable functions to call OpenAI/Gemini for summarization, analysis, and generation tasks.
    *   **Analysis & Prioritization:** Develop logic to score and rank news.
    *   **Content Contextualization:** Implement logic to compare news with (initially simplified) Eden themes.
    *   **Content Generation:** Implement AI prompting strategies for blogs, social posts, video scripts.
    *   **Image Sourcing:** Integrate Pexels API, then Sirv API for upload.
    *   **Evergreen Module:** Implement DB interactions for storing and retrieving evergreen ideas.
4.  **Frontend Development (React):** Build the Human Review Interface.
5.  **Integration & Testing:** Connect frontend to backend, test end-to-end flow.
6.  **Human Oversight Loop:** Critical. All generated content MUST go through the human review interface.
7.  **Deployment:** Utilize existing Heroku deployment (`simons-says-news`). Ensure all ENV variables are set on Heroku.

**7.6. Human Oversight & QA Process:**
*   **Mandatory Review:** NO content is auto-published. All drafts (text, image choices, video scripts) MUST be reviewed by a human editor via the React interface.
*   **Editor Checklist:**
    *   Tone and voice alignment.
    *   Theological soundness and accuracy.
    *   Adherence to "topics to avoid."
    *   Clarity, grammar, and readability.
    *   Appropriateness of product links.
    *   Image quality and relevance (meeting all guidelines).
    *   Video script feasibility and engagement.
*   **Feedback Loop:** (Future) Editors can rate AI output to help refine prompts or fine-tune models if that capability is pursued.

**8. Potential Challenges & Mitigation Strategies**

*   **Over-automation/Generic Content:**
    *   **Mitigation:** Robust human review. AI prompts engineered for specificity. Continuous refinement of prompts based on output quality.
*   **Copyright Risks (News):**
    *   **Mitigation:** System will SUMMARIZE and TRANSFORM news, never replicate. Always link to original sources. Focus on Eden's unique commentary.
*   **Voice Drift:**
    *   **Mitigation:** Detailed tone of voice guidelines in AI prompts. Human editors to correct and ensure consistency. Examples of "good" Eden content for AI to learn from (few-shot prompting).
*   **Platform Violations (e.g., misleading AI video):**
    *   **Mitigation:** Human review of all video scripts. Videos will be informational/inspirational, not deepfakes or fake endorsements. Focus on simple, illustrative visuals.
*   **SEO Cannibalization:**
    *   **Mitigation:** Vary keywords and angles. Focus on adding unique perspective rather than just reporting. Human SEO check during review.
*   **Scraping Reliability:**
    *   **Mitigation:** Prioritize RSS feeds. Build resilient scrapers with error handling. Monitor source website changes.
*   **AI Hallucinations/Inaccuracies:**
    *   **Mitigation:** Human review. Fact-checking for any specific claims referenced from news. Cross-reference information if possible.
*   **Image Guideline Complexity:**
    *   **Mitigation:** Detailed AI prompts for image search queries. Robust human review of image choices. Potentially use multimodal AI to pre-filter images if feasible.
*   **Maintaining Eden Product Knowledge:**
    *   **Mitigation:** Initial product category mapping. Future: API integration with Eden's e-commerce platform for real-time product data.

**9. Success Metrics (KPIs)**

*   **Content Output:** Number of blog posts, social posts, video scripts generated and approved per week/month.
*   **Time Savings:** Reduction in time spent by human staff on content ideation and drafting.
*   **Engagement Rates:** (Tracked post-publishing) Likes, shares, comments on AI-assisted content.
*   **Website Traffic:** Referrals from social media, organic search traffic to new blog posts.
*   **Product Link Click-Throughs:** Clicks on Eden product links within generated content.
*   **Human Editor Approval Rate:** Percentage of AI-generated drafts approved with minimal/no changes (indicates AI quality).
*   **Adherence to Guidelines:** Low rate of content rejection by human editors due to guideline violations.

**10. Next Steps (for the AI Development System)**

1.  **Confirm Understanding:** Parse this document and confirm all constraints and requirements are understood.
2.  **Prioritize Module Development:** Begin with core backend setup, database schema, and the news aggregation module.
3.  **Develop AI Prompt Library:** Start drafting and testing initial prompts for each content generation task based on the examples and guidelines.
4.  **Iterate & Test:** Develop modules iteratively, testing each component thoroughly.
5.  **Focus on Human Review Interface:** Ensure this is user-friendly and provides all necessary controls for the human editor.
6.  **Security & Compliance:** Adhere to data privacy best practices and ensure all API usage is within terms of service.

This briefing document provides a comprehensive plan. The AI development system should now have sufficient information to proceed with designing and building Project Eden.