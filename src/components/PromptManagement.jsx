import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Edit, 
  Save, 
  History, 
  TestTube, 
  BarChart3, 
  Plus, 
  Check, 
  X, 
  Eye,
  Clock,
  User,
  FileText,
  MessageSquare,
  Video,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Play,
  Image,
  Heart,
  BookOpen,
  Users
} from 'lucide-react';

const PromptManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [versions, setVersions] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVersion, setEditingVersion] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [expandedVersions, setExpandedVersions] = useState({});

  // Form states
  const [newPromptContent, setNewPromptContent] = useState('');
  const [newSystemMessage, setNewSystemMessage] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [testVariables, setTestVariables] = useState('{"article_content": "Sample news article content here..."}');

  // New template creation states
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplatePrompt, setNewTemplatePrompt] = useState('');
  const [newTemplateSystemMessage, setNewTemplateSystemMessage] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      fetchTemplateDetails(selectedTemplate.template_id);
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/eden/prompts/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
        if (data.templates.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data.templates[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateDetails = async (templateId) => {
    try {
      const [versionsRes, historyRes, statsRes] = await Promise.all([
        fetch(`/api/eden/prompts/templates/${templateId}/versions`),
        fetch(`/api/eden/prompts/templates/${templateId}/history`),
        fetch(`/api/eden/prompts/templates/${templateId}/stats`)
      ]);

      const [versionsData, historyData, statsData] = await Promise.all([
        versionsRes.json(),
        historyRes.json(),
        statsRes.json()
      ]);

      if (versionsData.success) setVersions(versionsData.versions);
      if (historyData.success) setHistory(historyData.history);
      if (statsData.success) setStats(statsData.stats);
    } catch (error) {
      console.error('Error fetching template details:', error);
    }
  };

  const createNewVersion = async () => {
    if (!newPromptContent.trim()) return;

    try {
      const response = await fetch(`/api/eden/prompts/templates/${selectedTemplate.template_id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptContent: newPromptContent,
          systemMessage: newSystemMessage,
          notes: newNotes,
          createdBy: 'user'
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewPromptContent('');
        setNewSystemMessage('');
        setNewNotes('');
        setEditingVersion(null);
        fetchTemplateDetails(selectedTemplate.template_id);
        fetchTemplates(); // Refresh to get updated current version
      }
    } catch (error) {
      console.error('Error creating new version:', error);
    }
  };

  const createNewTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateCategory.trim() || !newTemplatePrompt.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/eden/prompts/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          category: newTemplateCategory.toLowerCase().replace(/\s+/g, '_'),
          description: newTemplateDescription,
          promptContent: newTemplatePrompt,
          systemMessage: newTemplateSystemMessage,
          createdBy: 'user'
        })
      });

      const data = await response.json();
      if (data.success) {
        // Reset form
        setNewTemplateName('');
        setNewTemplateCategory('');
        setNewTemplateDescription('');
        setNewTemplatePrompt('');
        setNewTemplateSystemMessage('');
        setShowNewTemplateForm(false);
        
        // Refresh templates and select the new one
        await fetchTemplates();
        const newTemplate = templates.find(t => t.template_id === data.templateId);
        if (newTemplate) {
          setSelectedTemplate(newTemplate);
        }
      }
    } catch (error) {
      console.error('Error creating new template:', error);
    }
  };

  const setCurrentVersion = async (versionId) => {
    try {
      const response = await fetch(`/api/eden/prompts/templates/${selectedTemplate.template_id}/versions/${versionId}/current`, {
        method: 'PUT'
      });

      const data = await response.json();
      if (data.success) {
        fetchTemplateDetails(selectedTemplate.template_id);
        fetchTemplates(); // Refresh to get updated current version
      }
    } catch (error) {
      console.error('Error setting current version:', error);
    }
  };

  const testPrompt = async (versionId) => {
    try {
      const variables = JSON.parse(testVariables);
      const response = await fetch(`/api/eden/prompts/templates/${selectedTemplate.template_id}/versions/${versionId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testVariables: variables })
      });

      const data = await response.json();
      if (data.success) {
        setTestResult(data.result);
      }
    } catch (error) {
      console.error('Error testing prompt:', error);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'blog_post': return <FileText className="w-4 h-4" />;
      case 'social_media': return <MessageSquare className="w-4 h-4" />;
      case 'video_script': return <Video className="w-4 h-4" />;
      case 'analysis': return <TrendingUp className="w-4 h-4" />;
      case 'image_generation': return <Image className="w-4 h-4" />;
      case 'prayer': return <Heart className="w-4 h-4" />;
      case 'devotional': return <BookOpen className="w-4 h-4" />;
      case 'newsletter': return <MessageSquare className="w-4 h-4" />;
      case 'sermon': return <Users className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'blog_post': return 'bg-blue-100 text-blue-800';
      case 'social_media': return 'bg-green-100 text-green-800';
      case 'video_script': return 'bg-purple-100 text-purple-800';
      case 'analysis': return 'bg-orange-100 text-orange-800';
      case 'image_generation': return 'bg-pink-100 text-pink-800';
      case 'prayer': return 'bg-red-100 text-red-800';
      case 'devotional': return 'bg-yellow-100 text-yellow-800';
      case 'newsletter': return 'bg-teal-100 text-teal-800';
      case 'sermon': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleVersionExpansion = (versionId) => {
    setExpandedVersions(prev => ({
      ...prev,
      [versionId]: !prev[versionId]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading prompt management...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Prompt Management</h1>
          <p className="text-lg text-gray-600">Configure and manage AI prompts for content generation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Prompt Templates
                </CardTitle>
                <CardDescription>Select a template to manage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="mb-4">
                  <Button 
                    onClick={() => setShowNewTemplateForm(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Template
                  </Button>
                </div>

                {showNewTemplateForm && (
                  <Card className="mb-4 border-2 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">New Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label htmlFor="template-name">Template Name *</Label>
                        <Input
                          id="template-name"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="e.g., Prayer Generation"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="template-category">Category *</Label>
                        <Input
                          id="template-category"
                          value={newTemplateCategory}
                          onChange={(e) => setNewTemplateCategory(e.target.value)}
                          placeholder="e.g., Prayer, Image Generation, Devotional"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="template-description">Description</Label>
                        <Input
                          id="template-description"
                          value={newTemplateDescription}
                          onChange={(e) => setNewTemplateDescription(e.target.value)}
                          placeholder="Brief description of this template"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="template-prompt">Initial Prompt *</Label>
                        <Textarea
                          id="template-prompt"
                          value={newTemplatePrompt}
                          onChange={(e) => setNewTemplatePrompt(e.target.value)}
                          rows={4}
                          placeholder="Enter the initial prompt content..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="template-system">System Message</Label>
                        <Textarea
                          id="template-system"
                          value={newTemplateSystemMessage}
                          onChange={(e) => setNewTemplateSystemMessage(e.target.value)}
                          rows={2}
                          placeholder="Optional system message..."
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={createNewTemplate} size="sm">
                          <Save className="w-4 h-4 mr-1" />
                          Create
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setShowNewTemplateForm(false);
                            setNewTemplateName('');
                            setNewTemplateCategory('');
                            setNewTemplateDescription('');
                            setNewTemplatePrompt('');
                            setNewTemplateSystemMessage('');
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {templates.map((template) => (
                  <div
                    key={template.template_id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate?.template_id === template.template_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(template.category)}
                        <span className="font-medium">{template.name}</span>
                      </div>
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>v{template.current_version}</span>
                      <span>•</span>
                      <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Template Details */}
          <div className="lg:col-span-2">
            {selectedTemplate && (
              <Tabs defaultValue="current" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="current">Current Version</TabsTrigger>
                  <TabsTrigger value="versions">All Versions</TabsTrigger>
                  <TabsTrigger value="history">Usage History</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>

                {/* Current Version Tab */}
                <TabsContent value="current" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {getCategoryIcon(selectedTemplate.category)}
                            {selectedTemplate.name}
                          </CardTitle>
                          <CardDescription>
                            Current version: v{selectedTemplate.current_version} • 
                            Created by {selectedTemplate.current_version_created_by}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={() => {
                            setEditingVersion('new');
                            setNewPromptContent(selectedTemplate.current_prompt || '');
                            setNewSystemMessage(selectedTemplate.current_system_message || '');
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Prompt
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {editingVersion === 'new' ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="prompt-content">Prompt Content</Label>
                            <Textarea
                              id="prompt-content"
                              value={newPromptContent}
                              onChange={(e) => setNewPromptContent(e.target.value)}
                              rows={10}
                              className="mt-1"
                              placeholder="Enter the prompt content..."
                            />
                          </div>
                          <div>
                            <Label htmlFor="system-message">System Message</Label>
                            <Textarea
                              id="system-message"
                              value={newSystemMessage}
                              onChange={(e) => setNewSystemMessage(e.target.value)}
                              rows={3}
                              className="mt-1"
                              placeholder="Enter the system message..."
                            />
                          </div>
                          <div>
                            <Label htmlFor="notes">Version Notes</Label>
                            <Input
                              id="notes"
                              value={newNotes}
                              onChange={(e) => setNewNotes(e.target.value)}
                              className="mt-1"
                              placeholder="Describe the changes in this version..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={createNewVersion}>
                              <Save className="w-4 h-4 mr-2" />
                              Save New Version
                            </Button>
                            <Button variant="outline" onClick={() => setEditingVersion(null)}>
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label>Current Prompt Content</Label>
                            <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                              <pre className="whitespace-pre-wrap text-sm">{selectedTemplate.current_prompt}</pre>
                            </div>
                          </div>
                          {selectedTemplate.current_system_message && (
                            <div>
                              <Label>System Message</Label>
                              <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                                <pre className="whitespace-pre-wrap text-sm">{selectedTemplate.current_system_message}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Test Prompt */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TestTube className="w-5 h-5" />
                        Test Current Prompt
                      </CardTitle>
                      <CardDescription>Test the prompt with sample variables</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="test-variables">Test Variables (JSON)</Label>
                        <Textarea
                          id="test-variables"
                          value={testVariables}
                          onChange={(e) => setTestVariables(e.target.value)}
                          rows={3}
                          className="mt-1"
                          placeholder='{"article_content": "Sample content..."}'
                        />
                      </div>
                      <Button onClick={() => testPrompt(selectedTemplate.current_version_id)}>
                        <Play className="w-4 h-4 mr-2" />
                        Test Prompt
                      </Button>
                      {testResult && (
                        <div className="space-y-2">
                          <Label>Test Result</Label>
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="mb-2">
                              <strong>Final Prompt:</strong>
                              <pre className="whitespace-pre-wrap text-sm mt-1">{testResult.prompt}</pre>
                            </div>
                            {testResult.systemMessage && (
                              <div>
                                <strong>System Message:</strong>
                                <pre className="whitespace-pre-wrap text-sm mt-1">{testResult.systemMessage}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* All Versions Tab */}
                <TabsContent value="versions" className="space-y-4">
                  {versions.map((version) => (
                    <Card key={version.version_id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleVersionExpansion(version.version_id)}
                            >
                              {expandedVersions[version.version_id] ? 
                                <ChevronDown className="w-4 h-4" /> : 
                                <ChevronRight className="w-4 h-4" />
                              }
                            </Button>
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                Version {version.version_number}
                                {version.is_current && (
                                  <Badge className="bg-green-100 text-green-800">Current</Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {version.created_by}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(version.created_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <BarChart3 className="w-3 h-3" />
                                  {version.usage_count} uses
                                </span>
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!version.is_current && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentVersion(version.version_id)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Set Current
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testPrompt(version.version_id)}
                            >
                              <TestTube className="w-4 h-4 mr-1" />
                              Test
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {expandedVersions[version.version_id] && (
                        <CardContent className="space-y-4">
                          {version.notes && (
                            <div>
                              <Label>Version Notes</Label>
                              <p className="text-sm text-gray-600 mt-1">{version.notes}</p>
                            </div>
                          )}
                          <div>
                            <Label>Prompt Content</Label>
                            <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                              <pre className="whitespace-pre-wrap text-sm">{version.prompt_content}</pre>
                            </div>
                          </div>
                          {version.system_message && (
                            <div>
                              <Label>System Message</Label>
                              <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                                <pre className="whitespace-pre-wrap text-sm">{version.system_message}</pre>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </TabsContent>

                {/* Usage History Tab */}
                <TabsContent value="history" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Recent Usage History
                      </CardTitle>
                      <CardDescription>Recent content generated using this template</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {history.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No usage history yet</p>
                      ) : (
                        <div className="space-y-3">
                          {history.map((entry) => (
                            <div key={entry.log_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium">{entry.content_title || 'Untitled Content'}</div>
                                <div className="text-sm text-gray-600">
                                  Version {entry.version_number} • {entry.ai_service} • {entry.model_used}
                                </div>
                              </div>
                              <div className="text-right text-sm text-gray-500">
                                <div>{new Date(entry.created_at).toLocaleDateString()}</div>
                                <div>{entry.tokens_used} tokens • {entry.generation_time_ms}ms</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Statistics Tab */}
                <TabsContent value="stats" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Usage Statistics
                      </CardTitle>
                      <CardDescription>Performance metrics for each version</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stats.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No statistics available yet</p>
                      ) : (
                        <div className="space-y-4">
                          {stats.map((stat) => (
                            <div key={stat.version_number} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Version {stat.version_number}</h4>
                                <span className="text-sm text-gray-500">
                                  Created {new Date(stat.version_created).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-600">Total Uses</div>
                                  <div className="font-medium">{stat.total_uses}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Success Rate</div>
                                  <div className="font-medium">
                                    {stat.total_uses > 0 ? Math.round((stat.successful_uses / stat.total_uses) * 100) : 0}%
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Avg. Time</div>
                                  <div className="font-medium">{Math.round(stat.avg_generation_time || 0)}ms</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Avg. Tokens</div>
                                  <div className="font-medium">{Math.round(stat.avg_tokens_used || 0)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptManagement; 