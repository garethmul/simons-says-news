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
    category: '',
    media_type: 'text',
    parsing_method: 'generic',
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

  // Media types for functional routing (required)
  const mediaTypes = [
    { id: 'text', name: 'Text Content', icon: '📝', description: 'Written content of any type' },
    { id: 'video', name: 'Video Content', icon: '🎥', description: 'Video scripts and visual content' },
    { id: 'audio', name: 'Audio Content', icon: '🎵', description: 'Audio scripts and sound content' },
    { id: 'image', name: 'Image Content', icon: '🖼️', description: 'Visual content and image generation' }
  ];

  // Parsing methods for content structure (optional)
  const parsingMethods = [
    { id: 'generic', name: 'Generic Text', description: 'Simple text parsing (default)' },
    { id: 'structured', name: 'Structured Content', description: 'Section-based parsing' },
    { id: 'json', name: 'JSON Format', description: 'Structured JSON parsing' },
    { id: 'social_media', name: 'Social Media Posts', description: 'Multi-platform social content' },
    { id: 'video_script', name: 'Video Script', description: 'Script with timing and visuals' },
    { id: 'prayer_points', name: 'Prayer Points', description: 'Thematic prayer content' }
  ];

  // Suggested content types (examples, but user can enter anything)
  const suggestedContentTypes = [
    'blog-post', 'social-media', 'video-script', 'thank-you-letter', 'product-description',
    'meeting-agenda', 'recipe', 'technical-docs', 'email-newsletter', 'prayer-points',
    'sermon-outline', 'devotional', 'press-release', 'job-description', 'course-outline'
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

  const selectedMediaType = mediaTypes.find(type => type.id === templateData.media_type);
  const selectedParsingMethod = parsingMethods.find(method => method.id === templateData.parsing_method);

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
                    <Label htmlFor="category">Content Type *</Label>
                    <Input
                      id="category"
                      placeholder="e.g., thank-you-letter, product-description, blog-post"
                      value={templateData.category}
                      onChange={(e) => updateTemplate('category', e.target.value)}
                      className={validationErrors.category ? 'border-red-500' : ''}
                      list="suggested-content-types"
                    />
                    <datalist id="suggested-content-types">
                      {suggestedContentTypes.map(type => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                    <p className="text-xs text-muted-foreground">
                      Enter any content type you want - you're not limited to predefined categories!
                    </p>
                    {validationErrors.category && (
                      <p className="text-sm text-red-500">{validationErrors.category}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="media_type">Media Type *</Label>
                    <select
                      id="media_type"
                      value={templateData.media_type}
                      onChange={(e) => updateTemplate('media_type', e.target.value)}
                      className="w-full p-2 border border-input rounded-md bg-background"
                    >
                      {mediaTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.icon} {type.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {selectedMediaType?.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parsing_method">Parsing Method</Label>
                    <select
                      id="parsing_method"
                      value={templateData.parsing_method}
                      onChange={(e) => updateTemplate('parsing_method', e.target.value)}
                      className="w-full p-2 border border-input rounded-md bg-background"
                    >
                      {parsingMethods.map(method => (
                        <option key={method.id} value={method.id}>
                          {method.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {selectedParsingMethod?.description}
                    </p>
                  </div>

                  {templateData.category && (
                    <div className="p-3 bg-accent/50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{selectedMediaType?.icon}</span>
                        <span className="font-medium">{templateData.category}</span>
                        <Badge variant="secondary">
                          {templateData.media_type}
                        </Badge>
                        <Badge variant="outline">
                          {templateData.parsing_method}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This template will generate {templateData.media_type} content for "{templateData.category}" using {templateData.parsing_method} parsing.
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
                      {selectedMediaType?.icon} {templateData.name || 'Untitled Template'}
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