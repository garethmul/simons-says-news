import db from './database.js';

class JobManager {
  constructor() {
    this.workerId = `worker-${process.pid}-${Date.now()}`;
  }

  // Create a new job
  async createJob(jobType, payload, priority = 0, createdBy = 'system') {
    try {
      console.log(`📋 Creating ${jobType} job with payload:`, payload);
      
      // Ensure payload is properly handled for MySQL JSON column
      const jobData = {
        job_type: jobType,
        status: 'queued',
        priority,
        payload: payload, // MySQL will handle the JSON conversion
        created_by: createdBy,
        progress_percentage: 0
      };

      const jobId = await db.insert('ssnews_jobs', jobData);
      console.log(`✅ Job created with ID: ${jobId}`);
      
      return jobId;
    } catch (error) {
      console.error('❌ Error creating job:', error.message);
      throw error;
    }
  }

  // Get next job to process (highest priority, oldest first)
  async getNextJob() {
    try {
      const jobs = await db.query(`
        SELECT * FROM ssnews_jobs 
        WHERE status = 'queued' 
        ORDER BY priority DESC, created_at ASC 
        LIMIT 1
      `);

      return jobs.length > 0 ? jobs[0] : null;
    } catch (error) {
      console.error('❌ Error getting next job:', error.message);
      throw error;
    }
  }

  // Claim a job for processing
  async claimJob(jobId) {
    try {
      const result = await db.query(`
        UPDATE ssnews_jobs 
        SET status = 'processing', 
            worker_id = ?, 
            started_at = NOW(),
            updated_at = NOW()
        WHERE job_id = ? AND status = 'queued'
      `, [this.workerId, jobId]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Error claiming job:', error.message);
      throw error;
    }
  }

  // Update job progress
  async updateJobProgress(jobId, percentage, details = null) {
    try {
      const updateData = {
        progress_percentage: percentage,
        updated_at: new Date()
      };

      if (details) {
        updateData.progress_details = details;
      }

      await db.update('ssnews_jobs', updateData, 'job_id = ?', [jobId]);
      console.log(`📊 Job ${jobId} progress: ${percentage}% - ${details || ''}`);
    } catch (error) {
      console.error('❌ Error updating job progress:', error.message);
      throw error;
    }
  }

  // Complete a job successfully
  async completeJob(jobId, results = null) {
    try {
      const updateData = {
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date(),
        updated_at: new Date()
      };

      if (results) {
        updateData.results = results; // MySQL will handle the JSON conversion
      }

      await db.update('ssnews_jobs', updateData, 'job_id = ?', [jobId]);
      console.log(`✅ Job ${jobId} completed successfully`);
    } catch (error) {
      console.error('❌ Error completing job:', error.message);
      throw error;
    }
  }

  // Fail a job
  async failJob(jobId, errorMessage) {
    try {
      const updateData = {
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date(),
        updated_at: new Date()
      };

      await db.update('ssnews_jobs', updateData, 'job_id = ?', [jobId]);
      console.log(`❌ Job ${jobId} failed: ${errorMessage}`);
    } catch (error) {
      console.error('❌ Error failing job:', error.message);
      throw error;
    }
  }

  // Get job by ID
  async getJob(jobId) {
    try {
      const job = await db.findOne('ssnews_jobs', 'job_id = ?', [jobId]);
      if (!job) return null;
      
      // MySQL JSON columns return objects directly, no parsing needed
      // Just ensure they exist
      if (!job.payload) {
        job.payload = {};
      }
      
      if (!job.results) {
        job.results = null;
      }
      
      return job;
    } catch (error) {
      console.error('❌ Error getting job:', error.message);
      throw error;
    }
  }

  // Get jobs by status
  async getJobsByStatus(status, limit = 50) {
    try {
      const jobs = await db.query(`
        SELECT * FROM ssnews_jobs 
        WHERE status = ? 
        ORDER BY created_at DESC 
        LIMIT ${parseInt(limit)}
      `, [status]);

      // MySQL JSON columns return objects directly, no parsing needed
      return jobs.map(job => ({
        ...job,
        payload: job.payload || {},
        results: job.results || null
      }));
    } catch (error) {
      console.error('❌ Error getting jobs by status:', error.message);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      const stats = await db.query(`
        SELECT 
          status,
          job_type,
          COUNT(*) as count,
          AVG(progress_percentage) as avg_progress
        FROM ssnews_jobs 
        WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY status, job_type
        ORDER BY status, job_type
      `);

      const summary = await db.query(`
        SELECT 
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM ssnews_jobs 
        WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);

      return {
        summary: summary[0] || {
          total_jobs: 0,
          queued: 0,
          processing: 0,
          completed: 0,
          failed: 0
        },
        details: stats
      };
    } catch (error) {
      console.error('❌ Error getting queue stats:', error.message);
      throw error;
    }
  }

  // Get recent jobs (for UI)
  async getRecentJobs(limit = 20) {
    try {
      const jobs = await db.query(`
        SELECT 
          job_id,
          job_type,
          status,
          priority,
          payload,
          results,
          error_message,
          progress_percentage,
          progress_details,
          created_at,
          started_at,
          completed_at,
          created_by
        FROM ssnews_jobs 
        ORDER BY created_at DESC 
        LIMIT ${parseInt(limit)}
      `);

      // MySQL JSON columns return objects directly, no parsing needed
      return jobs.map(job => ({
        ...job,
        payload: job.payload || {},
        results: job.results || null,
        duration: job.started_at && job.completed_at 
          ? Math.round((new Date(job.completed_at) - new Date(job.started_at)) / 1000)
          : null
      }));
    } catch (error) {
      console.error('❌ Error getting recent jobs:', error.message);
      throw error;
    }
  }

  // Cancel a job
  async cancelJob(jobId) {
    try {
      const updateData = {
        status: 'cancelled',
        completed_at: new Date(),
        updated_at: new Date()
      };

      await db.update('ssnews_jobs', updateData, 'job_id = ? AND status IN ("queued", "processing")', [jobId]);
      console.log(`🚫 Job ${jobId} cancelled`);
    } catch (error) {
      console.error('❌ Error cancelling job:', error.message);
      throw error;
    }
  }

  // Retry a failed job
  async retryJob(jobId) {
    try {
      const job = await this.getJob(jobId);
      if (!job || job.status !== 'failed') {
        throw new Error('Job not found or not in failed status');
      }

      if (job.retry_count >= job.max_retries) {
        throw new Error('Maximum retries exceeded');
      }

      const updateData = {
        status: 'queued',
        retry_count: job.retry_count + 1,
        error_message: null,
        worker_id: null,
        started_at: null,
        completed_at: null,
        progress_percentage: 0,
        progress_details: null,
        updated_at: new Date()
      };

      await db.update('ssnews_jobs', updateData, 'job_id = ?', [jobId]);
      console.log(`🔄 Job ${jobId} queued for retry (attempt ${job.retry_count + 1})`);
    } catch (error) {
      console.error('❌ Error retrying job:', error.message);
      throw error;
    }
  }

  // Clean up old completed/failed jobs
  async cleanupOldJobs(daysOld = 7) {
    try {
      const result = await db.query(`
        DELETE FROM ssnews_jobs 
        WHERE status IN ('completed', 'failed', 'cancelled') 
        AND completed_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [daysOld]);

      console.log(`🧹 Cleaned up ${result.affectedRows} old jobs`);
      return result.affectedRows;
    } catch (error) {
      console.error('❌ Error cleaning up old jobs:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const jobManager = new JobManager();

export default jobManager; 