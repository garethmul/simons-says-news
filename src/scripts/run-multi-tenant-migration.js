import db from '../services/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILE = path.join(__dirname, 'multi-tenant-migration.sql');

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting multi-tenant migration...');
    
    // Initialize database connection
    await db.initialize();
    connection = await db.pool.getConnection();
    
    console.log('🔍 Checking current database state...');
    
    // Check current state
    const state = await checkCurrentState(connection);
    console.log('📊 Current state:', state);
    
    // Phase 1: Create multi-tenant tables
    if (!state.hasOrganizations || !state.hasAccounts || !state.hasUserOrganizations || !state.hasUserAccounts) {
      console.log('📊 Phase 1: Creating multi-tenant tables...');
      await createMultiTenantTables(connection);
    } else {
      console.log('✅ Phase 1: Multi-tenant tables already exist');
    }
    
    // Phase 2: Add account_id columns
    console.log('🔧 Phase 2: Adding account_id columns...');
    await addAccountIdColumns(connection);
    
    // Phase 3: Create default organization and account
    console.log('➕ Phase 3: Creating default organization and account...');
    await createDefaultOrgAndAccount(connection);
    
    // Phase 4: Migrate existing data
    console.log('🔄 Phase 4: Migrating existing data...');
    await migrateExistingData(connection);
    
    // Phase 5: Add indexes
    console.log('📋 Phase 5: Adding indexes...');
    await addIndexes(connection);
    
    // Phase 6: Add foreign key constraints
    console.log('🔗 Phase 6: Adding foreign key constraints...');
    await addForeignKeys(connection);
    
    // Phase 7: Make columns NOT NULL
    console.log('🔧 Phase 7: Making account_id columns NOT NULL...');
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
  
  // Check if existing tables have account_id columns
  const tablesToCheck = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs'
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

async function createMultiTenantTables(connection) {
  const tables = [
    {
      name: 'ssnews_organizations',
      sql: `CREATE TABLE IF NOT EXISTS ssnews_organizations (
        organization_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        settings JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_active (is_active)
      )`
    },
    {
      name: 'ssnews_accounts',
      sql: `CREATE TABLE IF NOT EXISTS ssnews_accounts (
        account_id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
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
      )`
    },
    {
      name: 'ssnews_user_organizations',
      sql: `CREATE TABLE IF NOT EXISTS ssnews_user_organizations (
        user_org_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        organization_id INT NOT NULL,
        role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES ssnews_organizations(organization_id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_org (user_id, organization_id),
        INDEX idx_user_id (user_id),
        INDEX idx_organization_id (organization_id),
        INDEX idx_role (role)
      )`
    },
    {
      name: 'ssnews_user_accounts',
      sql: `CREATE TABLE IF NOT EXISTS ssnews_user_accounts (
        user_account_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        account_id INT NOT NULL,
        role ENUM('owner', 'admin', 'member') DEFAULT NULL,
        permissions JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_account (user_id, account_id),
        INDEX idx_user_id (user_id),
        INDEX idx_account_id (account_id)
      )`
    }
  ];
  
  for (const table of tables) {
    try {
      await connection.execute(table.sql);
      console.log(`✅ Created table: ${table.name}`);
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`⚠️  Table ${table.name} already exists`);
      } else {
        throw error;
      }
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
        // Get the primary key column to add account_id after it
        const [pkColumns] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          ORDER BY ORDINAL_POSITION
          LIMIT 1
        `, [tableName]);
        
        const afterColumn = pkColumns[0]?.COLUMN_NAME || 'id';
        
        await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN account_id INT NULL AFTER ${afterColumn}`);
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

async function createDefaultOrgAndAccount(connection) {
  try {
    // Insert default organization
    await connection.execute(`INSERT IGNORE INTO ssnews_organizations (name, slug) VALUES ('Default Organization', 'default')`);
    console.log('✅ Created default organization');
    
    // Insert default account
    await connection.execute(`
      INSERT IGNORE INTO ssnews_accounts (organization_id, name, slug) 
      SELECT organization_id, 'Default Account', 'default' 
      FROM ssnews_organizations 
      WHERE slug = 'default' 
      LIMIT 1
    `);
    console.log('✅ Created default account');
  } catch (error) {
    console.error('❌ Error creating default org/account:', error.message);
    throw error;
  }
}

async function migrateExistingData(connection) {
  try {
    // Get default account ID
    const [accounts] = await connection.execute(`SELECT account_id FROM ssnews_accounts WHERE slug = 'default' LIMIT 1`);
    
    if (accounts.length === 0) {
      throw new Error('Default account not found');
    }
    
    const defaultAccountId = accounts[0].account_id;
    console.log(`📋 Using default account ID: ${defaultAccountId}`);
    
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
        const result = await connection.execute(`UPDATE ${tableName} SET account_id = ? WHERE account_id IS NULL`, [defaultAccountId]);
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
      await connection.execute(`ALTER TABLE ${tableName} MODIFY account_id INT NOT NULL`);
      console.log(`✅ Made account_id NOT NULL in ${tableName}`);
    } catch (error) {
      console.error(`❌ Error modifying column in ${tableName}:`, error.message);
      // Continue with other tables
    }
  }
}

async function verifyMigration(connection) {
  // Check new tables
  const newTables = [
    'ssnews_organizations',
    'ssnews_accounts', 
    'ssnews_user_organizations',
    'ssnews_user_accounts'
  ];
  
  for (const table of newTables) {
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      [table]
    );
    
    if (rows[0].count > 0) {
      console.log(`✅ Table ${table} exists`);
    } else {
      console.log(`❌ Table ${table} missing`);
    }
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
    } else {
      console.log(`❌ Column account_id missing in ${table}`);
    }
  }
  
  // Check default organization and account
  const [orgRows] = await connection.execute(
    'SELECT * FROM ssnews_organizations WHERE slug = ?',
    ['default']
  );
  
  if (orgRows.length > 0) {
    console.log(`✅ Default organization created (ID: ${orgRows[0].organization_id})`);
    
    const [accRows] = await connection.execute(
      'SELECT * FROM ssnews_accounts WHERE slug = ? AND organization_id = ?',
      ['default', orgRows[0].organization_id]
    );
    
    if (accRows.length > 0) {
      console.log(`✅ Default account created (ID: ${accRows[0].account_id})`);
      
      // Check if data was migrated
      const [countRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM ssnews_news_sources WHERE account_id = ?',
        [accRows[0].account_id]
      );
      
      console.log(`✅ Migrated ${countRows[0].count} news sources to default account`);
    }
  }
}

// Add rollback function
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
      await connection.execute('DROP TABLE IF EXISTS ssnews_user_organizations');
      await connection.execute('DROP TABLE IF EXISTS ssnews_accounts');
      await connection.execute('DROP TABLE IF EXISTS ssnews_organizations');
      
      console.log('🗑️  Dropped multi-tenant tables');
      
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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILE = path.join(__dirname, 'multi-tenant-migration.sql');

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting multi-tenant migration...');
    
    // Initialize database connection
    await db.initialize();
    connection = await db.pool.getConnection();
    
    console.log('🔍 Checking current database state...');
    
    // Check current state
    const state = await checkCurrentState(connection);
    console.log('📊 Current state:', state);
    
    // Phase 1: Create multi-tenant tables
    if (!state.hasOrganizations || !state.hasAccounts || !state.hasUserOrganizations || !state.hasUserAccounts) {
      console.log('📊 Phase 1: Creating multi-tenant tables...');
      await createMultiTenantTables(connection);
    } else {
      console.log('✅ Phase 1: Multi-tenant tables already exist');
    }
    
    // Phase 2: Add account_id columns
    console.log('🔧 Phase 2: Adding account_id columns...');
    await addAccountIdColumns(connection);
    
    // Phase 3: Create default organization and account
    console.log('➕ Phase 3: Creating default organization and account...');
    await createDefaultOrgAndAccount(connection);
    
    // Phase 4: Migrate existing data
    console.log('🔄 Phase 4: Migrating existing data...');
    await migrateExistingData(connection);
    
    // Phase 5: Add indexes
    console.log('📋 Phase 5: Adding indexes...');
    await addIndexes(connection);
    
    // Phase 6: Add foreign key constraints
    console.log('🔗 Phase 6: Adding foreign key constraints...');
    await addForeignKeys(connection);
    
    // Phase 7: Make columns NOT NULL
    console.log('🔧 Phase 7: Making account_id columns NOT NULL...');
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
  
  // Check if existing tables have account_id columns
  const tablesToCheck = [
    'ssnews_news_sources',
    'ssnews_scraped_articles',
    'ssnews_generated_articles',
    'ssnews_prompt_templates',
    'ssnews_user_bookmarks',
    'ssnews_jobs'
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

async function createMultiTenantTables(connection) {
  const tables = [
    {
      name: 'ssnews_organizations',
      sql: `CREATE TABLE IF NOT EXISTS ssnews_organizations (
        organization_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        settings JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_active (is_active)
      )`
    },
    {
      name: 'ssnews_accounts',
      sql: `CREATE TABLE IF NOT EXISTS ssnews_accounts (
        account_id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
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
      )`
    },
    {
      name: 'ssnews_user_organizations',
      sql: `CREATE TABLE IF NOT EXISTS ssnews_user_organizations (
        user_org_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        organization_id INT NOT NULL,
        role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES ssnews_organizations(organization_id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_org (user_id, organization_id),
        INDEX idx_user_id (user_id),
        INDEX idx_organization_id (organization_id),
        INDEX idx_role (role)
      )`
    },
    {
      name: 'ssnews_user_accounts',
      sql: `CREATE TABLE IF NOT EXISTS ssnews_user_accounts (
        user_account_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        account_id INT NOT NULL,
        role ENUM('owner', 'admin', 'member') DEFAULT NULL,
        permissions JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES ssnews_accounts(account_id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_account (user_id, account_id),
        INDEX idx_user_id (user_id),
        INDEX idx_account_id (account_id)
      )`
    }
  ];
  
  for (const table of tables) {
    try {
      await connection.execute(table.sql);
      console.log(`✅ Created table: ${table.name}`);
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`⚠️  Table ${table.name} already exists`);
      } else {
        throw error;
      }
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
        // Get the primary key column to add account_id after it
        const [pkColumns] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          ORDER BY ORDINAL_POSITION
          LIMIT 1
        `, [tableName]);
        
        const afterColumn = pkColumns[0]?.COLUMN_NAME || 'id';
        
        await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN account_id INT NULL AFTER ${afterColumn}`);
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

async function createDefaultOrgAndAccount(connection) {
  try {
    // Insert default organization
    await connection.execute(`INSERT IGNORE INTO ssnews_organizations (name, slug) VALUES ('Default Organization', 'default')`);
    console.log('✅ Created default organization');
    
    // Insert default account
    await connection.execute(`
      INSERT IGNORE INTO ssnews_accounts (organization_id, name, slug) 
      SELECT organization_id, 'Default Account', 'default' 
      FROM ssnews_organizations 
      WHERE slug = 'default' 
      LIMIT 1
    `);
    console.log('✅ Created default account');
  } catch (error) {
    console.error('❌ Error creating default org/account:', error.message);
    throw error;
  }
}

async function migrateExistingData(connection) {
  try {
    // Get default account ID
    const [accounts] = await connection.execute(`SELECT account_id FROM ssnews_accounts WHERE slug = 'default' LIMIT 1`);
    
    if (accounts.length === 0) {
      throw new Error('Default account not found');
    }
    
    const defaultAccountId = accounts[0].account_id;
    console.log(`📋 Using default account ID: ${defaultAccountId}`);
    
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
        const result = await connection.execute(`UPDATE ${tableName} SET account_id = ? WHERE account_id IS NULL`, [defaultAccountId]);
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
      await connection.execute(`ALTER TABLE ${tableName} MODIFY account_id INT NOT NULL`);
      console.log(`✅ Made account_id NOT NULL in ${tableName}`);
    } catch (error) {
      console.error(`❌ Error modifying column in ${tableName}:`, error.message);
      // Continue with other tables
    }
  }
}

async function verifyMigration(connection) {
  // Check new tables
  const newTables = [
    'ssnews_organizations',
    'ssnews_accounts', 
    'ssnews_user_organizations',
    'ssnews_user_accounts'
  ];
  
  for (const table of newTables) {
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      [table]
    );
    
    if (rows[0].count > 0) {
      console.log(`✅ Table ${table} exists`);
    } else {
      console.log(`❌ Table ${table} missing`);
    }
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
    } else {
      console.log(`❌ Column account_id missing in ${table}`);
    }
  }
  
  // Check default organization and account
  const [orgRows] = await connection.execute(
    'SELECT * FROM ssnews_organizations WHERE slug = ?',
    ['default']
  );
  
  if (orgRows.length > 0) {
    console.log(`✅ Default organization created (ID: ${orgRows[0].organization_id})`);
    
    const [accRows] = await connection.execute(
      'SELECT * FROM ssnews_accounts WHERE slug = ? AND organization_id = ?',
      ['default', orgRows[0].organization_id]
    );
    
    if (accRows.length > 0) {
      console.log(`✅ Default account created (ID: ${accRows[0].account_id})`);
      
      // Check if data was migrated
      const [countRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM ssnews_news_sources WHERE account_id = ?',
        [accRows[0].account_id]
      );
      
      console.log(`✅ Migrated ${countRows[0].count} news sources to default account`);
    }
  }
}

// Add rollback function
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
      await connection.execute('DROP TABLE IF EXISTS ssnews_user_organizations');
      await connection.execute('DROP TABLE IF EXISTS ssnews_accounts');
      await connection.execute('DROP TABLE IF EXISTS ssnews_organizations');
      
      console.log('🗑️  Dropped multi-tenant tables');
      
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