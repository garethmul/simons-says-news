import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import LoadingState from '../ui/loading-state';
import ErrorBoundary from '../ui/error-boundary';
import { 
  Check, 
  Play, 
  FileText, 
  TrendingUp,
  Clock,
  BookOpen,
  Eye,
  Edit,
  Zap,
  Users
} from 'lucide-react';

/**
 * Dashboard Tab Component
 * Displays system overview, status, and quick actions
 */
const DashboardTab = ({
  stats,
  workerStatus,
  loading,
  onRunFullCycle,
  onTabChange,
  onStartWorker,
  isActionLoading
}) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LoadingState message="Loading dashboard statistics..." count={4} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>
            Project Eden automation status and recent activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
              <div className="space-y-3">
                <StatusCard
                  icon={<Check className="w-5 h-5 text-green-600" />}
                  title="News Aggregation"
                  status="Active"
                  variant="success"
                />
                <StatusCard
                  icon={<Check className="w-5 h-5 text-green-600" />}
                  title="AI Analysis"
                  status="Active"
                  variant="success"
                />
                <StatusCard
                  icon={<Check className="w-5 h-5 text-green-600" />}
                  title="Content Generation"
                  status="Active"
                  variant="success"
                />
                <StatusCard
                  icon={<Play className="w-5 h-5 text-blue-600" />}
                  title="Job Worker"
                  status={workerStatus.isRunning ? 'Running' : 'Stopped'}
                  variant={workerStatus.isRunning ? 'success' : 'secondary'}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              <div className="space-y-3">
                <ActionButton
                  icon={<Zap className="w-4 h-4 mr-2" />}
                  text="Run Full Automation Cycle"
                  onClick={onRunFullCycle}
                  disabled={loading || isActionLoading('full-cycle')}
                  loading={isActionLoading('full-cycle')}
                  variant="default"
                />
                <ActionButton
                  icon={<TrendingUp className="w-4 h-4 mr-2" />}
                  text={`View Stories (${stats.articlesAnalyzed})`}
                  onClick={() => onTabChange('stories')}
                  variant="outline"
                />
                <ActionButton
                  icon={<Eye className="w-4 h-4 mr-2" />}
                  text={`Review Content (${stats.pendingReview})`}
                  onClick={() => onTabChange('review')}
                  variant="outline"
                />
                <ActionButton
                  icon={<Clock className="w-4 h-4 mr-2" />}
                  text={`Monitor Jobs (${stats.totalJobs || 0})`}
                  onClick={() => onTabChange('jobs')}
                  variant="outline"
                />
                <ActionButton
                  icon={<Edit className="w-4 h-4 mr-2" />}
                  text="Manage Prompts"
                  onClick={() => onTabChange('prompts')}
                  variant="outline"
                />
                <ActionButton
                  icon={<Users className="w-4 h-4 mr-2" />}
                  text="Manage Users"
                  onClick={() => onTabChange('users')}
                  variant="outline"
                />
                {!workerStatus.isRunning && (
                  <ActionButton
                    icon={<Play className="w-4 h-4 mr-2" />}
                    text="Start Job Worker"
                    onClick={onStartWorker}
                    variant="outline"
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {stats.articlesAggregated > 0 && (
                <ActivityCard
                  icon={<FileText className="w-5 h-5 text-blue-600" />}
                  text={`${stats.articlesAggregated} articles aggregated from ${stats.activeSources} news sources`}
                  bgColor="bg-blue-50"
                  borderColor="border-blue-200"
                  textColor="text-blue-800"
                />
              )}
              {stats.articlesAnalyzed > 0 && (
                <ActivityCard
                  icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                  text={`${stats.articlesAnalyzed} articles analyzed for relevance`}
                  bgColor="bg-purple-50"
                  borderColor="border-purple-200"
                  textColor="text-purple-800"
                />
              )}
              {stats.contentGenerated > 0 && (
                <ActivityCard
                  icon={<BookOpen className="w-5 h-5 text-green-600" />}
                  text={`${stats.contentGenerated} content pieces generated`}
                  bgColor="bg-green-50"
                  borderColor="border-green-200"
                  textColor="text-green-800"
                />
              )}
              {stats.pendingReview > 0 && (
                <ActivityCard
                  icon={<Eye className="w-5 h-5 text-orange-600" />}
                  text={`${stats.pendingReview} content pieces awaiting review`}
                  bgColor="bg-orange-50"
                  borderColor="border-orange-200"
                  textColor="text-orange-800"
                />
              )}
              {(stats.articlesAggregated === 0 && stats.articlesAnalyzed === 0 && stats.contentGenerated === 0) && (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-sm">No recent activity</div>
                  <div className="text-xs mt-1">Run the full cycle to start processing content</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

/**
 * Status Card Component
 */
const StatusCard = ({ icon, title, status, variant }) => (
  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
    <div className="flex items-center">
      {icon}
      <span className="font-medium text-green-800 ml-2">{title}</span>
    </div>
    <Badge variant={variant}>{status}</Badge>
  </div>
);

/**
 * Action Button Component
 */
const ActionButton = ({ 
  icon, 
  text, 
  onClick, 
  disabled = false, 
  loading = false, 
  variant = "outline", 
  className = "" 
}) => (
  <Button 
    onClick={onClick} 
    className={`w-full justify-start ${className}`} 
    disabled={disabled || loading}
    variant={variant}
  >
    {loading ? (
      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
    ) : (
      icon
    )}
    {text}
  </Button>
);

/**
 * Activity Card Component
 */
const ActivityCard = ({ icon, text, bgColor, borderColor, textColor }) => (
  <div className={`flex items-center p-3 ${bgColor} rounded-lg border ${borderColor}`}>
    {icon}
    <span className={`${textColor} ml-3`}>{text}</span>
  </div>
);

export default DashboardTab; 