import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select } from '../ui/select';
import { 
  Plus, 
  Save, 
  Play, 
  Settings, 
  Eye, 
  Trash2,
  ArrowDown,
  ArrowRight,
  GitBranch,
  Zap,
  Move,
  Copy
} from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * WORKFLOW BUILDER - ZAPIER-LIKE STEP CHAINING
 * 
 * Visual workflow builder for chaining templates together
 * with conditional logic and data flow management.
 */
export const WorkflowBuilder = ({
  workflow = null,
  templates = [],
  onSave,
  onTest,
  onCancel,
  isLoading = false,
  className,
  ...props
}) => {
  // Workflow state
  const [workflowData, setWorkflowData] = React.useState({
    name: '',
    description: '',
    steps: [],
    inputSources: ['news_article'],
    outputDestinations: ['database'],
    conditionalLogic: {},
    ...workflow
  });

  // UI state
  const [draggedStep, setDraggedStep] = React.useState(null);
  const [validationErrors, setValidationErrors] = React.useState({});

  // Step templates for building workflows
  const stepTemplates = templates.map(template => ({
    id: template.template_id,
    name: template.name,
    category: template.category,
    description: template.description,
    icon: getCategoryIcon(template.category),
    color: getCategoryColor(template.category),
    variables: template.variables || []
  }));

  // Update workflow data
  const updateWorkflow = (field, value) => {
    setWorkflowData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Add a new step to the workflow
  const addStep = (template) => {
    const newStep = {
      id: `step_${Date.now()}`,
      name: template.name.toLowerCase().replace(/\s+/g, '_'),
      displayName: template.name,
      templateId: template.id,
      category: template.category,
      order: workflowData.steps.length + 1,
      conditions: [],
      continueOnError: false,
      enabled: true
    };

    updateWorkflow('steps', [...workflowData.steps, newStep]);
  };

  // Remove a step from the workflow
  const removeStep = (stepId) => {
    const updatedSteps = workflowData.steps
      .filter(step => step.id !== stepId)
      .map((step, index) => ({ ...step, order: index + 1 }));
    
    updateWorkflow('steps', updatedSteps);
  };

  // Update a specific step
  const updateStep = (stepId, field, value) => {
    const updatedSteps = workflowData.steps.map(step =>
      step.id === stepId ? { ...step, [field]: value } : step
    );
    updateWorkflow('steps', updatedSteps);
  };

  // Reorder steps (drag and drop)
  const reorderSteps = (dragIndex, hoverIndex) => {
    const draggedStep = workflowData.steps[dragIndex];
    const updatedSteps = [...workflowData.steps];
    
    updatedSteps.splice(dragIndex, 1);
    updatedSteps.splice(hoverIndex, 0, draggedStep);
    
    // Update order numbers
    const reorderedSteps = updatedSteps.map((step, index) => ({
      ...step,
      order: index + 1
    }));
    
    updateWorkflow('steps', reorderedSteps);
  };

  // Add condition to a step
  const addCondition = (stepId) => {
    const newCondition = {
      id: `condition_${Date.now()}`,
      field: '',
      operator: 'exists',
      value: ''
    };

    updateStep(stepId, 'conditions', [
      ...(workflowData.steps.find(s => s.id === stepId)?.conditions || []),
      newCondition
    ]);
  };

  // Remove condition from a step
  const removeCondition = (stepId, conditionId) => {
    const step = workflowData.steps.find(s => s.id === stepId);
    const updatedConditions = step.conditions.filter(c => c.id !== conditionId);
    updateStep(stepId, 'conditions', updatedConditions);
  };

  // Update condition
  const updateCondition = (stepId, conditionId, field, value) => {
    const step = workflowData.steps.find(s => s.id === stepId);
    const updatedConditions = step.conditions.map(condition =>
      condition.id === conditionId ? { ...condition, [field]: value } : condition
    );
    updateStep(stepId, 'conditions', updatedConditions);
  };

  // Validate workflow
  const validateWorkflow = () => {
    const errors = {};

    if (!workflowData.name?.trim()) {
      errors.name = 'Workflow name is required';
    }

    if (workflowData.steps.length === 0) {
      errors.steps = 'At least one step is required';
    }

    // Validate each step
    workflowData.steps.forEach((step, index) => {
      if (!step.name?.trim()) {
        errors[`step_${index}_name`] = `Step ${index + 1} name is required`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateWorkflow()) {
      return;
    }

    onSave?.(workflowData);
  };

  // Handle test
  const handleTest = () => {
    if (!validateWorkflow()) {
      return;
    }

    onTest?.(workflowData);
  };

  // Get category icon
  function getCategoryIcon(category) {
    const icons = {
      'social_media': '📱',
      'video_script': '🎥',
      'blog_post': '📝',
      'email': '📧',
      'prayer_points': '🙏',
      'custom': '⚙️'
    };
    return icons[category] || '📄';
  }

  // Get category color
  function getCategoryColor(category) {
    const colors = {
      'social_media': '#1DA1F2',
      'video_script': '#FF0000',
      'blog_post': '#10B981',
      'email': '#6366F1',
      'prayer_points': '#8B5CF6',
      'custom': '#6B7280'
    };
    return colors[category] || '#6B7280';
  }

  return (
    <div className={cn('w-full max-w-7xl mx-auto', className)} {...props}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                {workflow ? 'Edit Workflow' : 'Create New Workflow'}
              </CardTitle>
              <CardDescription>
                Chain templates together to create powerful, automated content workflows
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={isLoading || workflowData.steps.length === 0}
              >
                <Play className="h-4 w-4 mr-1" />
                Test Run
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="min-w-[80px]"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Workflow Setup */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Complete Content Package"
                  value={workflowData.name}
                  onChange={(e) => updateWorkflow('name', e.target.value)}
                  className={validationErrors.name ? 'border-red-500' : ''}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-500">{validationErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of what this workflow does"
                  value={workflowData.description}
                  onChange={(e) => updateWorkflow('description', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Workflow Statistics</Label>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <div className="text-2xl font-bold">{workflowData.steps.length}</div>
                    <div className="text-sm text-muted-foreground">Steps</div>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {workflowData.steps.filter(s => s.conditions?.length > 0).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Conditional</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Library */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Available Templates</Label>
              <p className="text-sm text-muted-foreground">
                Drag and drop templates to build your workflow
              </p>
            </div>

            <div className="flex flex-wrap gap-2 p-4 bg-accent/30 rounded-lg border-2 border-dashed">
              {stepTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addStep(template)}
                  className={cn(
                    'flex items-center gap-2 transition-all duration-200',
                    'hover:scale-105 hover:shadow-md cursor-pointer'
                  )}
                  style={{ borderColor: template.color + '40' }}
                >
                  <span>{template.icon}</span>
                  <span>{template.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {template.category}
                  </Badge>
                </Button>
              ))}
              
              {stepTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground w-full">
                  <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No templates available</p>
                  <p className="text-sm">Create some templates first to build workflows</p>
                </div>
              )}
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Workflow Steps</Label>
              {workflowData.steps.length > 0 && (
                <Badge variant="outline">
                  {workflowData.steps.length} step{workflowData.steps.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {workflowData.steps.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No steps yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add templates from above to start building your workflow
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {workflowData.steps.map((step, index) => (
                  <Card key={step.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <span>{getCategoryIcon(step.category)}</span>
                              <Input
                                value={step.displayName}
                                onChange={(e) => updateStep(step.id, 'displayName', e.target.value)}
                                className="h-auto p-0 border-none bg-transparent text-base font-semibold"
                              />
                            </CardTitle>
                            <CardDescription>
                              {stepTemplates.find(t => t.id === step.templateId)?.description}
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary"
                            style={{ 
                              backgroundColor: getCategoryColor(step.category) + '20',
                              color: getCategoryColor(step.category)
                            }}
                          >
                            {step.category}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStep(step.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-4">
                        {/* Step Settings */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`continue-error-${step.id}`}
                              checked={step.continueOnError}
                              onChange={(e) => updateStep(step.id, 'continueOnError', e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor={`continue-error-${step.id}`} className="text-sm">
                              Continue on error
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`enabled-${step.id}`}
                              checked={step.enabled}
                              onChange={(e) => updateStep(step.id, 'enabled', e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor={`enabled-${step.id}`} className="text-sm">
                              Enabled
                            </Label>
                          </div>
                        </div>

                        {/* Conditions */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Conditions (Optional)</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addCondition(step.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Condition
                            </Button>
                          </div>

                          {step.conditions && step.conditions.length > 0 && (
                            <div className="space-y-2 p-3 bg-accent/30 rounded-lg">
                              {step.conditions.map((condition, condIndex) => (
                                <div key={condition.id} className="flex items-center gap-2">
                                  <Input
                                    placeholder="Field name"
                                    value={condition.field}
                                    onChange={(e) => updateCondition(step.id, condition.id, 'field', e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                  <select
                                    value={condition.operator}
                                    onChange={(e) => updateCondition(step.id, condition.id, 'operator', e.target.value)}
                                    className="h-8 px-2 border border-input rounded-md bg-background text-sm"
                                  >
                                    <option value="exists">Exists</option>
                                    <option value="not_exists">Not Exists</option>
                                    <option value="equals">Equals</option>
                                    <option value="not_equals">Not Equals</option>
                                    <option value="contains">Contains</option>
                                    <option value="not_contains">Not Contains</option>
                                  </select>
                                  <Input
                                    placeholder="Value"
                                    value={condition.value}
                                    onChange={(e) => updateCondition(step.id, condition.id, 'value', e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCondition(step.id, condition.id)}
                                    className="h-8 w-8 p-0 text-red-500"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    {/* Step connector */}
                    {index < workflowData.steps.length - 1 && (
                      <div className="flex justify-center py-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground">
                          <ArrowDown className="h-3 w-3" />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{workflowData.steps.length} steps</Badge>
              <Badge variant="outline">
                {workflowData.steps.filter(s => s.conditions?.length > 0).length} conditional
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Workflow'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 