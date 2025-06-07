import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select } from '../ui/select';
import { VariableTagInput, VariableTag } from '../ui/variable-tag';
import { 
  Plus, 
  Save, 
  Play, 
  Settings, 
  Eye, 
  Code, 
  Wand2,
  Copy
} from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * TEMPLATE BUILDER - MAIN COMPONENT
 * 
 * Zapier-like template builder with visual variable insertion,
 * live preview, and template management.
 */
export const TemplateBuilder = ({
  template = null,
  onSave,
  onTest,
  onCancel,
  availableVariables = [],
  categories = [],
  isLoading = false,
  className,
  ...props
}) => {
  // Template state
  const [templateData, setTemplateData] = React.useState({
    name: '',
    description: '',
    category: 'social_media',
    prompt: '',
    systemMessage: '',
    variables: [],
    inputSchema: { fields: [] },
    outputSchema: { fields: [] },
    uiConfig: { icon: 'wand2', color: '#3B82F6', category: 'general' },
    ...template
  });

  // UI state
  const [activeTab, setActiveTab] = React.useState('builder');
  const [validationErrors, setValidationErrors] = React.useState({});

  // Default available variables
  const defaultVariables = [
    { name: 'article.title', displayName: 'Article Title', type: 'input', category: 'Article' },
    { name: 'article.content', displayName: 'Article Content', type: 'input', category: 'Article' },
    { name: 'article.summary', displayName: 'Article Summary', type: 'input', category: 'Article' },
    { name: 'article.source', displayName: 'Article Source', type: 'input', category: 'Article' },
    { name: 'article.url', displayName: 'Article URL', type: 'input', category: 'Article' },
    { name: 'blog.id', displayName: 'Blog ID', type: 'input', category: 'Blog' },
    { name: 'account.id', displayName: 'Account ID', type: 'input', category: 'Account' },
    ...availableVariables
  ];

  // Template categories with icons and colors
  const templateCategories = [
    { id: 'social_media', name: 'Social Media', icon: '📱', color: '#1DA1F2' },
    { id: 'video_script', name: 'Video Script', icon: '🎥', color: '#FF0000' },
    { id: 'blog_post', name: 'Blog Post', icon: '📝', color: '#10B981' },
    { id: 'email', name: 'Email', icon: '📧', color: '#6366F1' },
    { id: 'prayer_points', name: 'Prayer Points', icon: '🙏', color: '#8B5CF6' },
    { id: 'custom', name: 'Custom', icon: '⚙️', color: '#6B7280' },
    ...categories
  ];

  // Update template data
  const updateTemplate = (field, value) => {
    setTemplateData(prev => ({
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

  // Handle variable insertion
  const handleVariableInsert = (variable) => {
    // Auto-update template variables list
    const existingVars = templateData.variables || [];
    if (!existingVars.find(v => v.name === variable.name)) {
      updateTemplate('variables', [...existingVars, variable]);
    }
  };

  // Validate template
  const validateTemplate = () => {
    const errors = {};

    if (!templateData.name?.trim()) {
      errors.name = 'Template name is required';
    }

    if (!templateData.category) {
      errors.category = 'Category is required';
    }

    if (!templateData.prompt?.trim()) {
      errors.prompt = 'Prompt is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateTemplate()) {
      return;
    }

    // Auto-extract variables from prompt
    const extractedVars = extractVariablesFromPrompt(templateData.prompt);
    const finalTemplate = {
      ...templateData,
      variables: extractedVars
    };

    onSave?.(finalTemplate);
  };

  // Extract variables from prompt
  const extractVariablesFromPrompt = (prompt) => {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const variables = [];
    const matches = prompt.matchAll(variablePattern);
    
    for (const match of matches) {
      const variableName = match[1].trim();
      const existingVar = defaultVariables.find(v => v.name === variableName);
      
      if (existingVar && !variables.find(v => v.name === variableName)) {
        variables.push(existingVar);
      }
    }

    return variables;
  };

  // Generate preview
  const generatePreview = () => {
    let preview = templateData.prompt;
    
    // Replace variables with sample data
    const sampleData = {
      'article.title': 'Breaking: Revolutionary AI Technology Announced',
      'article.content': 'Scientists at MIT have developed a groundbreaking artificial intelligence system...',
      'article.summary': 'MIT researchers unveil new AI technology with breakthrough capabilities.',
      'article.source': 'MIT Technology Review',
      'article.url': 'https://example.com/article',
      'blog.id': '123',
      'account.id': '456'
    };

    for (const [key, value] of Object.entries(sampleData)) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      preview = preview.replace(pattern, value);
    }

    return preview;
  };

  const selectedCategory = templateCategories.find(cat => cat.id === templateData.category);

  return (
    <div className={cn('w-full max-w-6xl mx-auto', className)} {...props}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                {template ? 'Edit Template' : 'Create New Template'}
              </CardTitle>
              <CardDescription>
                Build powerful content templates with visual variable insertion
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTest?.(templateData)}
                disabled={isLoading || !templateData.prompt}
              >
                <Play className="h-4 w-4 mr-1" />
                Test
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="builder">
                <Wand2 className="h-4 w-4 mr-1" />
                Builder
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code">
                <Code className="h-4 w-4 mr-1" />
                JSON
              </TabsTrigger>
            </TabsList>

            {/* BUILDER TAB */}
            <TabsContent value="builder" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Template Setup */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Engaging Social Media Post"
                      value={templateData.name}
                      onChange={(e) => updateTemplate('name', e.target.value)}
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
                      placeholder="Brief description of what this template does"
                      value={templateData.description}
                      onChange={(e) => updateTemplate('description', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      value={templateData.category}
                      onChange={(e) => updateTemplate('category', e.target.value)}
                      className="w-full p-2 border border-input rounded-md bg-background"
                    >
                      {templateCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.category && (
                      <p className="text-sm text-red-500">{validationErrors.category}</p>
                    )}
                  </div>

                  {selectedCategory && (
                    <div className="p-3 bg-accent/50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{selectedCategory.icon}</span>
                        <span className="font-medium">{selectedCategory.name}</span>
                        <Badge 
                          variant="secondary" 
                          style={{ backgroundColor: selectedCategory.color + '20', color: selectedCategory.color }}
                        >
                          {templateData.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This template will be optimised for {selectedCategory.name.toLowerCase()} content generation.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column - Available Variables */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Available Variables</Label>
                    <p className="text-sm text-muted-foreground">
                      Click to insert, or type @ or {{ in the prompt
                    </p>
                  </div>

                  <div className="max-h-80 overflow-y-auto border rounded-lg p-3 space-y-3">
                    {Object.entries(
                      defaultVariables.reduce((groups, variable) => {
                        const category = variable.category || 'Other';
                        if (!groups[category]) groups[category] = [];
                        groups[category].push(variable);
                        return groups;
                      }, {})
                    ).map(([category, variables]) => (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          {category}
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {variables.map((variable, index) => (
                            <VariableTag
                              key={`${variable.name}-${index}`}
                              variable={variable}
                              className="cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => {
                                const currentPrompt = templateData.prompt;
                                const newPrompt = currentPrompt + `{{${variable.name}}}`;
                                updateTemplate('prompt', newPrompt);
                                handleVariableInsert(variable);
                              }}
                              readOnly
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prompt Editor */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt Template *</Label>
                <p className="text-sm text-muted-foreground">
                  Write your prompt and insert variables using the tags above or by typing @ or {{
                </p>
                <VariableTagInput
                  value={templateData.prompt}
                  onChange={(value) => updateTemplate('prompt', value)}
                  availableVariables={defaultVariables}
                  onInsertVariable={handleVariableInsert}
                  placeholder="Write your prompt here... Use {{variable.name}} for dynamic content"
                  rows={8}
                  className={validationErrors.prompt ? 'border-red-500' : ''}
                />
                {validationErrors.prompt && (
                  <p className="text-sm text-red-500">{validationErrors.prompt}</p>
                )}
              </div>

              {/* System Message */}
              <div className="space-y-2">
                <Label htmlFor="systemMessage">System Message (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Set the AI's behaviour and context
                </p>
                <VariableTagInput
                  value={templateData.systemMessage}
                  onChange={(value) => updateTemplate('systemMessage', value)}
                  availableVariables={defaultVariables}
                  onInsertVariable={handleVariableInsert}
                  placeholder="You are a helpful assistant that..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* PREVIEW TAB */}
            <TabsContent value="preview" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Live Preview</h3>
                  <Badge variant="secondary">Sample Data</Badge>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedCategory?.icon} {templateData.name || 'Untitled Template'}
                    </CardTitle>
                    <CardDescription>{templateData.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Generated Prompt:</Label>
                        <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                          {generatePreview() || 'No prompt defined yet...'}
                        </div>
                      </div>
                      
                      {templateData.systemMessage && (
                        <div>
                          <Label className="text-sm font-medium">System Message:</Label>
                          <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                            {templateData.systemMessage}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* JSON TAB */}
            <TabsContent value="code" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Template JSON</h3>
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                
                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm">
                    {JSON.stringify(templateData, null, 2)}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{templateData.variables?.length || 0} variables</Badge>
              <Badge variant="outline">{templateData.prompt?.length || 0} characters</Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 