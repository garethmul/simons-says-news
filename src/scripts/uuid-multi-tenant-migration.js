import db from '../services/database.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting accounts-level multi-tenant migration...');
    console.log('📋 Working with existing UUID-based organization system');
    
    // Initialize database connection
    await db.initialize();
    connection = await db.pool.getConnection();
    
    console.log('🔍 Checking current state...');
    
    // Check current state
    const state = await checkCurrentState(connection);
    console.log('📊 Current state:', state);
    
    // Phase 1: Create accounts table
    if (!state.hasAccounts) {
      console.log('📊 Phase 1: Creating accounts table...');
      await createAccountsTable(connection);
    } else {
      console.log('✅ Phase 1: Accounts table already exists');
    }
    
    // Phase 2: Create user accounts association table
    if (!state.hasUserAccounts) {
      console.log('📊 Phase 2: Creating user accounts table...');
      await createUserAccountsTable(connection);
    } else {
      console.log('✅ Phase 2: User accounts table already exists');
    }
    
    // Phase 3: Add account_id columns to all tables that need them
    console.log('🔧 Phase 3: Adding account_id columns...');
    await addAccountIdColumns(connection);
    
    // Phase 4: Create default accounts for each organization
    console.log('🏢 Phase 4: Creating default accounts for organizations...');
    await createDefaultAccounts(connection);
    
    // Phase 5: Migrate existing data to default accounts
    console.log('🔄 Phase 5: Migrating existing data...');
    await migrateExistingData(connection);
    
    // Phase 6: Add indexes
    console.log('📋 Phase 6: Adding indexes...');
    await addIndexes(connection);
    
    // Phase 7: Add foreign key constraints
    console.log('🔗 Phase 7: Adding foreign key constraints...');
    await addForeignKeys(connection);
    
    // Phase 8: Make account_id columns NOT NULL (except system_logs)
    console.log('🔧 Phase 8: Making account_id columns NOT NULL...');
    await makeColumnsNotNull(connection);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    await verifyMigration(connection);
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await db.close();
  }
}

async function checkCurrentState(connection) {
  const state = {};
  
  // Check tables
  const [tables] = await connection.execute(`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
  `);
  
  const tableNames = tables.map(t => t.TABLE_NAME);
  
  state.hasOrganizations = tableNames.includes('ssnews_organizations');
  state.hasAccounts = tableNames.includes('ssnews_accounts');
  state.hasUserOrganizations = tableNames.includes('ssnews_user_organizations');
  state.hasUserAccounts = tableNames.includes('ssnews_user_accounts');
  
  // Check if tables have account_id columns
  const tablesToCheck = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_generated_social_posts',
    'ssnews_generated_video_scripts',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs',
    'ssnews_evergreen_content_ideas',
    'ssnews_image_assets',
    'ssnews_system_logs'
  ];
  
  state.accountIdColumns = {};
  
  for (const tableName of tablesToCheck) {
    if (tableNames.includes(tableName)) {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = 'account_id'
      `, [tableName]);
      
      state.accountIdColumns[tableName] = columns.length > 0;
    }
  }
  
  return state;
}

async function createAccountsTable(connection) {
  try {
    await connection.execute(`
      CREATE TABLE ssnews_accounts (
        account_id VARCHAR(36) PRIMARY KEY,
        organization_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        settings JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES ssnews_organizations(organization_id) ON DELETE CASCADE,
        UNIQUE KEY unique_org_slug (organization_id, slug),
        INDEX idx_organization (organization_id),
        INDEX idx_slug (slug),
        INDEX idx_active (is_active)
      )
    `);
    console.log('✅ Created ssnews_accounts table');
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  Table ssnews_accounts already exists');
    } else {
      throw error;
    }
  }
}

async function createUserAccountsTable(connection) {
  try {
    await connection.execute(`
      CREATE TABLE ssnews_user_accounts (
        user_account_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        account_id VARCHAR(36) NOT NULL,
        role ENUM('owner', 'admin', 'member') DEFAULT NULL,
        permissions JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_account (user_id, account_id),
        INDEX idx_user_id (user_id),
        INDEX idx_account_id (account_id)
      )
    `);
    console.log('✅ Created ssnews_user_accounts table');
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  Table ssnews_user_accounts already exists');
    } else {
      throw error;
    }
  }
}

async function addAccountIdColumns(connection) {
  const tables = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_generated_social_posts',
    'ssnews_generated_video_scripts',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs',
    'ssnews_evergreen_content_ideas',
    'ssnews_image_assets',
    'ssnews_system_logs'
  ];
  
  for (const tableName of tables) {
    try {
      // Check if column already exists
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = 'account_id'
      `, [tableName]);
      
      if (columns.length === 0) {
        // Add account_id column after organization_id
        await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN account_id VARCHAR(36) NULL AFTER organization_id`);
        console.log(`✅ Added account_id column to ${tableName}`);
      } else {
        console.log(`⚠️  Column account_id already exists in ${tableName}`);
      }
    } catch (error) {
      console.error(`❌ Error adding account_id to ${tableName}:`, error.message);
      // Continue with other tables
    }
  }
}

async function createDefaultAccounts(connection) {
  try {
    // Get all organizations
    const [organizations] = await connection.execute('SELECT organization_id, name, slug FROM ssnews_organizations');
    
    console.log(`📋 Found ${organizations.length} organizations`);
    
    for (const org of organizations) {
      // Check if default account already exists
      const [existingAccounts] = await connection.execute(
        'SELECT account_id FROM ssnews_accounts WHERE organization_id = ? AND slug = ?',
        [org.organization_id, 'main']
      );
      
      if (existingAccounts.length === 0) {
        const accountId = uuidv4();
        
        await connection.execute(`
          INSERT INTO ssnews_accounts (account_id, organization_id, name, slug, is_active) 
          VALUES (?, ?, ?, ?, ?)
        `, [accountId, org.organization_id, 'Main Account', 'main', true]);
        
        console.log(`✅ Created default account for organization: ${org.name} (${accountId})`);
      } else {
        console.log(`⚠️  Default account already exists for organization: ${org.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating default accounts:', error.message);
    throw error;
  }
}

async function migrateExistingData(connection) {
  try {
    const tables = [
      'ssnews_news_sources',
      'ssnews_scraped_articles',
      'ssnews_generated_articles',
      'ssnews_generated_social_posts',
      'ssnews_generated_video_scripts',
      'ssnews_prompt_templates',
      'ssnews_user_bookmarks',
      'ssnews_jobs',
      'ssnews_evergreen_content_ideas',
      'ssnews_image_assets',
      'ssnews_system_logs'
    ];
    
    for (const tableName of tables) {
      try {
        // Update account_id based on organization_id
        const result = await connection.execute(`
          UPDATE ${tableName} t
          SET t.account_id = (
            SELECT a.account_id 
            FROM ssnews_accounts a 
            WHERE a.organization_id = t.organization_id 
            AND a.slug = 'main' 
            LIMIT 1
          )
          WHERE t.account_id IS NULL
        `);
        
        console.log(`✅ Migrated ${result[0].affectedRows} records in ${tableName}`);
      } catch (error) {
        console.error(`❌ Error migrating ${tableName}:`, error.message);
        // Continue with other tables
      }
    }
  } catch (error) {
    console.error('❌ Error migrating data:', error.message);
    throw error;
  }
}

async function addIndexes(connection) {
  const tables = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_generated_social_posts',
    'ssnews_generated_video_scripts',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs',
    'ssnews_evergreen_content_ideas',
    'ssnews_image_assets',
    'ssnews_system_logs'
  ];
  
  for (const tableName of tables) {
    try {
      // Check if index already exists
      const [indexes] = await connection.execute(`
        SELECT INDEX_NAME 
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND INDEX_NAME = 'idx_account_id'
      `, [tableName]);
      
      if (indexes.length === 0) {
        await connection.execute(`ALTER TABLE ${tableName} ADD INDEX idx_account_id (account_id)`);
        console.log(`✅ Added index to ${tableName}`);
      } else {
        console.log(`⚠️  Index already exists on ${tableName}`);
      }
    } catch (error) {
      console.error(`❌ Error adding index to ${tableName}:`, error.message);
      // Continue with other tables
    }
  }
}

async function addForeignKeys(connection) {
  const tables = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_generated_social_posts',
    'ssnews_generated_video_scripts',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs',
    'ssnews_evergreen_content_ideas',
    'ssnews_image_assets',
    'ssnews_system_logs'
  ];
  
  for (const tableName of tables) {
    try {
      const constraintName = `fk_${tableName}_account`;
      
      // Check if constraint already exists
      const [constraints] = await connection.execute(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND CONSTRAINT_NAME = ?
      `, [tableName, constraintName]);
      
      if (constraints.length === 0) {
        await connection.execute(`
          ALTER TABLE ${tableName} 
          ADD CONSTRAINT ${constraintName} 
          FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE
        `);
        console.log(`✅ Added foreign key to ${tableName}`);
      } else {
        console.log(`⚠️  Foreign key already exists on ${tableName}`);
      }
    } catch (error) {
      console.error(`❌ Error adding foreign key to ${tableName}:`, error.message);
      // Continue with other tables
    }
  }
}

async function makeColumnsNotNull(connection) {
  const tables = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_generated_social_posts',
    'ssnews_generated_video_scripts',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs',
    'ssnews_evergreen_content_ideas',
    'ssnews_image_assets'
    // Note: excluding ssnews_system_logs to keep it nullable
  ];
  
  for (const tableName of tables) {
    try {
      await connection.execute(`ALTER TABLE ${tableName} MODIFY account_id VARCHAR(36) NOT NULL`);
      console.log(`✅ Made account_id NOT NULL in ${tableName}`);
    } catch (error) {
      console.error(`❌ Error modifying column in ${tableName}:`, error.message);
      // Continue with other tables
    }
  }
}

async function verifyMigration(connection) {
  // Check accounts table
  const [accountsTable] = await connection.execute(
    'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    ['ssnews_accounts']
  );
  
  if (accountsTable[0].count > 0) {
    console.log('✅ ssnews_accounts table exists');
    
    // Check accounts created
    const [accounts] = await connection.execute('SELECT COUNT(*) as count FROM ssnews_accounts');
    console.log(`✅ ${accounts[0].count} accounts created`);
  } else {
    console.log('❌ ssnews_accounts table missing');
  }
  
  // Check user accounts table
  const [userAccountsTable] = await connection.execute(
    'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    ['ssnews_user_accounts']
  );
  
  if (userAccountsTable[0].count > 0) {
    console.log('✅ ssnews_user_accounts table exists');
  } else {
    console.log('❌ ssnews_user_accounts table missing');
  }
  
  // Check account_id columns
  const tablesToCheck = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs'
  ];
  
  for (const table of tablesToCheck) {
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
      [table, 'account_id']
    );
    
    if (rows[0].count > 0) {
      console.log(`✅ Column account_id exists in ${table}`);
      
      // Check if data was migrated
      const [dataRows] = await connection.execute(
        `SELECT COUNT(*) as total, COUNT(account_id) as with_account FROM ${table}`
      );
      
      console.log(`   📊 ${dataRows[0].with_account}/${dataRows[0].total} records have account_id`);
    } else {
      console.log(`❌ Column account_id missing in ${table}`);
    }
  }
}

// Rollback function
async function rollbackMigration() {
  try {
    console.log('🔄 Starting rollback...');
    
    await db.initialize();
    const connection = await db.pool.getConnection();
    
    await connection.beginTransaction();
    
    try {
      // Remove foreign key constraints first
      const tables = [
        'ssnews_news_sources',
        'ssnews_scraped_articles',
        'ssnews_generated_articles',
        'ssnews_generated_social_posts',
        'ssnews_generated_video_scripts',
        'ssnews_prompt_templates',
        'ssnews_user_bookmarks',
        'ssnews_jobs',
        'ssnews_evergreen_content_ideas',
        'ssnews_image_assets',
        'ssnews_system_logs'
      ];
      
      for (const table of tables) {
        try {
          // Get foreign key name
          const [fkRows] = await connection.execute(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ? 
            AND COLUMN_NAME = 'account_id' 
            AND REFERENCED_TABLE_NAME = 'ssnews_accounts'
          `, [table]);
          
          if (fkRows.length > 0) {
            await connection.execute(`ALTER TABLE ${table} DROP FOREIGN KEY ${fkRows[0].CONSTRAINT_NAME}`);
            console.log(`🔧 Dropped foreign key from ${table}`);
          }
          
          // Drop column
          await connection.execute(`ALTER TABLE ${table} DROP COLUMN account_id`);
          console.log(`🔧 Dropped account_id from ${table}`);
        } catch (error) {
          console.log(`⚠️  Could not modify ${table}: ${error.message}`);
        }
      }
      
      // Drop new tables
      await connection.execute('DROP TABLE IF EXISTS ssnews_user_accounts');
      await connection.execute('DROP TABLE IF EXISTS ssnews_accounts');
      
      console.log('🗑️  Dropped accounts tables');
      
      await connection.commit();
      console.log('✅ Rollback completed successfully!');
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('❌ Rollback error:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'rollback') {
  rollbackMigration();
} else {
  runMigration();
} 
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting accounts-level multi-tenant migration...');
    console.log('📋 Working with existing UUID-based organization system');
    
    // Initialize database connection
    await db.initialize();
    connection = await db.pool.getConnection();
    
    console.log('🔍 Checking current state...');
    
    // Check current state
    const state = await checkCurrentState(connection);
    console.log('📊 Current state:', state);
    
    // Phase 1: Create accounts table
    if (!state.hasAccounts) {
      console.log('📊 Phase 1: Creating accounts table...');
      await createAccountsTable(connection);
    } else {
      console.log('✅ Phase 1: Accounts table already exists');
    }
    
    // Phase 2: Create user accounts association table
    if (!state.hasUserAccounts) {
      console.log('📊 Phase 2: Creating user accounts table...');
      await createUserAccountsTable(connection);
    } else {
      console.log('✅ Phase 2: User accounts table already exists');
    }
    
    // Phase 3: Add account_id columns to all tables that need them
    console.log('🔧 Phase 3: Adding account_id columns...');
    await addAccountIdColumns(connection);
    
    // Phase 4: Create default accounts for each organization
    console.log('🏢 Phase 4: Creating default accounts for organizations...');
    await createDefaultAccounts(connection);
    
    // Phase 5: Migrate existing data to default accounts
    console.log('🔄 Phase 5: Migrating existing data...');
    await migrateExistingData(connection);
    
    // Phase 6: Add indexes
    console.log('📋 Phase 6: Adding indexes...');
    await addIndexes(connection);
    
    // Phase 7: Add foreign key constraints
    console.log('🔗 Phase 7: Adding foreign key constraints...');
    await addForeignKeys(connection);
    
    // Phase 8: Make account_id columns NOT NULL (except system_logs)
    console.log('🔧 Phase 8: Making account_id columns NOT NULL...');
    await makeColumnsNotNull(connection);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    await verifyMigration(connection);
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await db.close();
  }
}

async function checkCurrentState(connection) {
  const state = {};
  
  // Check tables
  const [tables] = await connection.execute(`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
  `);
  
  const tableNames = tables.map(t => t.TABLE_NAME);
  
  state.hasOrganizations = tableNames.includes('ssnews_organizations');
  state.hasAccounts = tableNames.includes('ssnews_accounts');
  state.hasUserOrganizations = tableNames.includes('ssnews_user_organizations');
  state.hasUserAccounts = tableNames.includes('ssnews_user_accounts');
  
  // Check if tables have account_id columns
  const tablesToCheck = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_generated_social_posts',
    'ssnews_generated_video_scripts',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs',
    'ssnews_evergreen_content_ideas',
    'ssnews_image_assets',
    'ssnews_system_logs'
  ];
  
  state.accountIdColumns = {};
  
  for (const tableName of tablesToCheck) {
    if (tableNames.includes(tableName)) {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = 'account_id'
      `, [tableName]);
      
      state.accountIdColumns[tableName] = columns.length > 0;
    }
  }
  
  return state;
}

async function createAccountsTable(connection) {
  try {
    await connection.execute(`
      CREATE TABLE ssnews_accounts (
        account_id VARCHAR(36) PRIMARY KEY,
        organization_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        settings JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES ssnews_organizations(organization_id) ON DELETE CASCADE,
        UNIQUE KEY unique_org_slug (organization_id, slug),
        INDEX idx_organization (organization_id),
        INDEX idx_slug (slug),
        INDEX idx_active (is_active)
      )
    `);
    console.log('✅ Created ssnews_accounts table');
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  Table ssnews_accounts already exists');
    } else {
      throw error;
    }
  }
}

async function createUserAccountsTable(connection) {
  try {
    await connection.execute(`
      CREATE TABLE ssnews_user_accounts (
        user_account_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        account_id VARCHAR(36) NOT NULL,
        role ENUM('owner', 'admin', 'member') DEFAULT NULL,
        permissions JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_account (user_id, account_id),
        INDEX idx_user_id (user_id),
        INDEX idx_account_id (account_id)
      )
    `);
    console.log('✅ Created ssnews_user_accounts table');
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  Table ssnews_user_accounts already exists');
    } else {
      throw error;
    }
  }
}

async function addAccountIdColumns(connection) {
  const tables = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_generated_social_posts',
    'ssnews_generated_video_scripts',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs',
    'ssnews_evergreen_content_ideas',
    'ssnews_image_assets',
    'ssnews_system_logs'
  ];
  
  for (const tableName of tables) {
    try {
      // Check if column already exists
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = 'account_id'
      `, [tableName]);
      
      if (columns.length === 0) {
        // Add account_id column after organization_id
        await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN account_id VARCHAR(36) NULL AFTER organization_id`);
        console.log(`✅ Added account_id column to ${tableName}`);
      } else {
        console.log(`⚠️  Column account_id already exists in ${tableName}`);
      }
    } catch (error) {
      console.error(`❌ Error adding account_id to ${tableName}:`, error.message);
      // Continue with other tables
    }
  }
}

async function createDefaultAccounts(connection) {
  try {
    // Get all organizations
    const [organizations] = await connection.execute('SELECT organization_id, name, slug FROM ssnews_organizations');
    
    console.log(`📋 Found ${organizations.length} organizations`);
    
    for (const org of organizations) {
      // Check if default account already exists
      const [existingAccounts] = await connection.execute(
        'SELECT account_id FROM ssnews_accounts WHERE organization_id = ? AND slug = ?',
        [org.organization_id, 'main']
      );
      
      if (existingAccounts.length === 0) {
        const accountId = uuidv4();
        
        await connection.execute(`
          INSERT INTO ssnews_accounts (account_id, organization_id, name, slug, is_active) 
          VALUES (?, ?, ?, ?, ?)
        `, [accountId, org.organization_id, 'Main Account', 'main', true]);
        
        console.log(`✅ Created default account for organization: ${org.name} (${accountId})`);
      } else {
        console.log(`⚠️  Default account already exists for organization: ${org.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating default accounts:', error.message);
    throw error;
  }
}

async function migrateExistingData(connection) {
  try {
    const tables = [
      'ssnews_news_sources',
      'ssnews_scraped_articles',
      'ssnews_generated_articles',
      'ssnews_generated_social_posts',
      'ssnews_generated_video_scripts',
      'ssnews_prompt_templates',
      'ssnews_user_bookmarks',
      'ssnews_jobs',
      'ssnews_evergreen_content_ideas',
      'ssnews_image_assets',
      'ssnews_system_logs'
    ];
    
    for (const tableName of tables) {
      try {
        // Update account_id based on organization_id
        const result = await connection.execute(`
          UPDATE ${tableName} t
          SET t.account_id = (
            SELECT a.account_id 
            FROM ssnews_accounts a 
            WHERE a.organization_id = t.organization_id 
            AND a.slug = 'main' 
            LIMIT 1
          )
          WHERE t.account_id IS NULL
        `);
        
        console.log(`✅ Migrated ${result[0].affectedRows} records in ${tableName}`);
      } catch (error) {
        console.error(`❌ Error migrating ${tableName}:`, error.message);
        // Continue with other tables
      }
    }
  } catch (error) {
    console.error('❌ Error migrating data:', error.message);
    throw error;
  }
}

async function addIndexes(connection) {
  const tables = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_generated_social_posts',
    'ssnews_generated_video_scripts',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs',
    'ssnews_evergreen_content_ideas',
    'ssnews_image_assets',
    'ssnews_system_logs'
  ];
  
  for (const tableName of tables) {
    try {
      // Check if index already exists
      const [indexes] = await connection.execute(`
        SELECT INDEX_NAME 
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND INDEX_NAME = 'idx_account_id'
      `, [tableName]);
      
      if (indexes.length === 0) {
        await connection.execute(`ALTER TABLE ${tableName} ADD INDEX idx_account_id (account_id)`);
        console.log(`✅ Added index to ${tableName}`);
      } else {
        console.log(`⚠️  Index already exists on ${tableName}`);
      }
    } catch (error) {
      console.error(`❌ Error adding index to ${tableName}:`, error.message);
      // Continue with other tables
    }
  }
}

async function addForeignKeys(connection) {
  const tables = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_generated_social_posts',
    'ssnews_generated_video_scripts',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs',
    'ssnews_evergreen_content_ideas',
    'ssnews_image_assets',
    'ssnews_system_logs'
  ];
  
  for (const tableName of tables) {
    try {
      const constraintName = `fk_${tableName}_account`;
      
      // Check if constraint already exists
      const [constraints] = await connection.execute(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND CONSTRAINT_NAME = ?
      `, [tableName, constraintName]);
      
      if (constraints.length === 0) {
        await connection.execute(`
          ALTER TABLE ${tableName} 
          ADD CONSTRAINT ${constraintName} 
          FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE
        `);
        console.log(`✅ Added foreign key to ${tableName}`);
      } else {
        console.log(`⚠️  Foreign key already exists on ${tableName}`);
      }
    } catch (error) {
      console.error(`❌ Error adding foreign key to ${tableName}:`, error.message);
      // Continue with other tables
    }
  }
}

async function makeColumnsNotNull(connection) {
  const tables = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_generated_social_posts',
    'ssnews_generated_video_scripts',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs',
    'ssnews_evergreen_content_ideas',
    'ssnews_image_assets'
    // Note: excluding ssnews_system_logs to keep it nullable
  ];
  
  for (const tableName of tables) {
    try {
      await connection.execute(`ALTER TABLE ${tableName} MODIFY account_id VARCHAR(36) NOT NULL`);
      console.log(`✅ Made account_id NOT NULL in ${tableName}`);
    } catch (error) {
      console.error(`❌ Error modifying column in ${tableName}:`, error.message);
      // Continue with other tables
    }
  }
}

async function verifyMigration(connection) {
  // Check accounts table
  const [accountsTable] = await connection.execute(
    'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    ['ssnews_accounts']
  );
  
  if (accountsTable[0].count > 0) {
    console.log('✅ ssnews_accounts table exists');
    
    // Check accounts created
    const [accounts] = await connection.execute('SELECT COUNT(*) as count FROM ssnews_accounts');
    console.log(`✅ ${accounts[0].count} accounts created`);
  } else {
    console.log('❌ ssnews_accounts table missing');
  }
  
  // Check user accounts table
  const [userAccountsTable] = await connection.execute(
    'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    ['ssnews_user_accounts']
  );
  
  if (userAccountsTable[0].count > 0) {
    console.log('✅ ssnews_user_accounts table exists');
  } else {
    console.log('❌ ssnews_user_accounts table missing');
  }
  
  // Check account_id columns
  const tablesToCheck = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs'
  ];
  
  for (const table of tablesToCheck) {
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
      [table, 'account_id']
    );
    
    if (rows[0].count > 0) {
      console.log(`✅ Column account_id exists in ${table}`);
      
      // Check if data was migrated
      const [dataRows] = await connection.execute(
        `SELECT COUNT(*) as total, COUNT(account_id) as with_account FROM ${table}`
      );
      
      console.log(`   📊 ${dataRows[0].with_account}/${dataRows[0].total} records have account_id`);
    } else {
      console.log(`❌ Column account_id missing in ${table}`);
    }
  }
}

// Rollback function
async function rollbackMigration() {
  try {
    console.log('🔄 Starting rollback...');
    
    await db.initialize();
    const connection = await db.pool.getConnection();
    
    await connection.beginTransaction();
    
    try {
      // Remove foreign key constraints first
      const tables = [
        'ssnews_news_sources',
        'ssnews_scraped_articles',
        'ssnews_generated_articles',
        'ssnews_generated_social_posts',
        'ssnews_generated_video_scripts',
        'ssnews_prompt_templates',
        'ssnews_user_bookmarks',
        'ssnews_jobs',
        'ssnews_evergreen_content_ideas',
        'ssnews_image_assets',
        'ssnews_system_logs'
      ];
      
      for (const table of tables) {
        try {
          // Get foreign key name
          const [fkRows] = await connection.execute(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ? 
            AND COLUMN_NAME = 'account_id' 
            AND REFERENCED_TABLE_NAME = 'ssnews_accounts'
          `, [table]);
          
          if (fkRows.length > 0) {
            await connection.execute(`ALTER TABLE ${table} DROP FOREIGN KEY ${fkRows[0].CONSTRAINT_NAME}`);
            console.log(`🔧 Dropped foreign key from ${table}`);
          }
          
          // Drop column
          await connection.execute(`ALTER TABLE ${table} DROP COLUMN account_id`);
          console.log(`🔧 Dropped account_id from ${table}`);
        } catch (error) {
          console.log(`⚠️  Could not modify ${table}: ${error.message}`);
        }
      }
      
      // Drop new tables
      await connection.execute('DROP TABLE IF EXISTS ssnews_user_accounts');
      await connection.execute('DROP TABLE IF EXISTS ssnews_accounts');
      
      console.log('🗑️  Dropped accounts tables');
      
      await connection.commit();
      console.log('✅ Rollback completed successfully!');
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('❌ Rollback error:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'rollback') {
  rollbackMigration();
} else {
  runMigration();
} 