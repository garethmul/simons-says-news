-- Update system logs table to add job_id and account_id columns
-- Run this manually if the schema migration didn't apply

-- Add job_id column if it doesn't exist
ALTER TABLE ssnews_system_logs 
ADD COLUMN IF NOT EXISTS job_id INT NULL;

-- Add account_id column if it doesn't exist  
ALTER TABLE ssnews_system_logs 
ADD COLUMN IF NOT EXISTS account_id VARCHAR(64) NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_id ON ssnews_system_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_account_id ON ssnews_system_logs(account_id);

-- Add foreign key constraint if it doesn't exist
-- Note: This may fail if there are existing logs with invalid job_id references
-- In that case, clean up orphaned logs first
-- ALTER TABLE ssnews_system_logs 
-- ADD CONSTRAINT fk_logs_job_id FOREIGN KEY (job_id) REFERENCES ssnews_jobs(job_id) ON DELETE CASCADE;

-- Add organization_id and account_id to jobs table if missing
ALTER TABLE ssnews_jobs 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) NULL;

ALTER TABLE ssnews_jobs 
ADD COLUMN IF NOT EXISTS account_id VARCHAR(64) NULL;

-- Add index for account_id on jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_account_id ON ssnews_jobs(account_id); 