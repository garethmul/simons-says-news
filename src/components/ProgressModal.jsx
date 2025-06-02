import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader2,
  FileText,
  TrendingUp,
  BookOpen,
  X
} from 'lucide-react';
import { useAccount } from '../contexts/AccountContext';

const ProgressModal = ({ isOpen, onClose, onComplete, onReset }) => {
  const { withAccountContext } = useAccount();
  const [progress, setProgress] = useState({
    isRunning: false,
    currentStep: '',
    progress: 0,
    totalSteps: 3,
    stepDetails: '',
    startTime: null,
    results: {}
  });

  useEffect(() => {
    if (!isOpen) return;

    let intervalId;

    const fetchProgress = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const accountOptions = withAccountContext({
          method: 'GET'
        });
        
        const response = await fetch(`${baseUrl}/api/eden/automate/progress`, accountOptions);
        
        if (response.ok) {
          const progressData = await response.json();
          setProgress(progressData);
          
          // If automation is complete and successful, notify parent
          if (!progressData.isRunning && progressData.progress === 100) {
            clearInterval(intervalId);
            setTimeout(() => {
              onComplete?.(progressData.results);
            }, 2000);
          }
        } else {
          console.error('Failed to fetch progress:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    };

    // Fetch immediately, then every 3 seconds (instead of 1 second for less aggressive polling)
    fetchProgress();
    intervalId = setInterval(fetchProgress, 3000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOpen, onComplete, withAccountContext]);

  if (!isOpen) return null;

  const getStepIcon = (stepName, currentStep, progress) => {
    const isCurrentStep = currentStep === stepName;
    const isCompleted = progress === 100 || (
      (stepName === 'Aggregating News' && progress > 33) ||
      (stepName === 'Analyzing Articles' && progress > 66) ||
      (stepName === 'Generating Content' && progress > 90)
    );
    const isError = currentStep === 'Error';

    if (isError) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    
    if (isCompleted) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    
    if (isCurrentStep) {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getStepStatus = (stepName, currentStep, progress) => {
    const isCurrentStep = currentStep === stepName;
    const isCompleted = progress === 100 || (
      (stepName === 'Aggregating News' && progress > 33) ||
      (stepName === 'Analyzing Articles' && progress > 66) ||
      (stepName === 'Generating Content' && progress > 90)
    );
    const isError = currentStep === 'Error';

    if (isError) return 'error';
    if (isCompleted) return 'completed';
    if (isCurrentStep) return 'running';
    return 'pending';
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '';
    const duration = Math.floor((new Date() - new Date(startTime)) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const steps = [
    {
      name: 'Aggregating News',
      description: 'Fetching articles from news sources',
      icon: FileText
    },
    {
      name: 'Analyzing Articles',
      description: 'Running AI analysis for relevance scoring',
      icon: TrendingUp
    },
    {
      name: 'Generating Content',
      description: 'Creating blog posts, social content, and video scripts',
      icon: BookOpen
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Backdrop overlay to disable page interaction */}
      <div className="absolute inset-0 bg-black bg-opacity-30" />
      
      <Card className="w-full max-w-2xl mx-4 relative z-10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className={`w-5 h-5 ${progress.isRunning ? 'animate-spin text-blue-500' : 'text-gray-400'}`} />
                Project Eden Automation
              </CardTitle>
              <CardDescription>
                {progress.isRunning ? 'Running full automation cycle...' : 'Automation cycle status'}
                {progress.startTime && (
                  <span className="ml-2 text-sm">
                    • Duration: {formatDuration(progress.startTime)}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              disabled={progress.isRunning}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} className="h-3" />
            {progress.stepDetails && (
              <p className="text-sm text-gray-600">{progress.stepDetails}</p>
            )}
          </div>

          {/* Step Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Steps</h4>
            {steps.map((step, index) => {
              const status = getStepStatus(step.name, progress.currentStep, progress.progress);
              const StepIcon = step.icon;
              
              return (
                <div key={step.name} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-shrink-0">
                    {getStepIcon(step.name, progress.currentStep, progress.progress)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StepIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{step.name}</span>
                      <Badge 
                        variant={
                          status === 'completed' ? 'default' :
                          status === 'running' ? 'secondary' :
                          status === 'error' ? 'destructive' : 'outline'
                        }
                        className="text-xs"
                      >
                        {status === 'completed' ? 'Complete' :
                         status === 'running' ? 'Running' :
                         status === 'error' ? 'Error' : 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Results Summary */}
          {Object.keys(progress.results).length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Results</h4>
              <div className="grid grid-cols-3 gap-4">
                {progress.results.articlesAggregated !== undefined && (
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {progress.results.articlesAggregated}
                    </div>
                    <div className="text-xs text-blue-600">Articles Aggregated</div>
                  </div>
                )}
                {progress.results.articlesAnalyzed !== undefined && (
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {progress.results.articlesAnalyzed}
                    </div>
                    <div className="text-xs text-green-600">Articles Analyzed</div>
                  </div>
                )}
                {progress.results.contentGenerated !== undefined && (
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {progress.results.contentGenerated}
                    </div>
                    <div className="text-xs text-purple-600">Content Generated</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {progress.progress === 100 && !progress.isRunning && (
              <Button onClick={onClose}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Close
              </Button>
            )}
            {progress.currentStep === 'Error' && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
            {progress.isRunning && onReset && (
              <Button variant="outline" onClick={onReset}>
                <X className="w-4 h-4 mr-2" />
                Reset & Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressModal; 