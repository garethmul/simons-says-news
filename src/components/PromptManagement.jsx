import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAccount } from '../contexts/AccountContext';
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
  Users,
  Share2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Workflow,
  Wand2
} from 'lucide-react';
import HelpSection from './common/HelpSection';

/**
 * Sample Template Card Component
 */
const SampleTemplateCard = ({ title, category, description, icon, prompt, systemMessage, onCreateTemplate }) => {
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreateTemplate({
        title,
        category,
        description,
        prompt,
        systemMessage
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Preview
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Prompt Content Preview</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border text-xs">
              <pre className="whitespace-pre-wrap text-gray-700">
                {prompt.length > 300 ? `${prompt.substring(0, 300)}...` : prompt}
              </pre>
            </div>
          </div>
          {systemMessage && (
            <div>
              <Label className="text-sm font-medium">System Message</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg border text-xs">
                <pre className="whitespace-pre-wrap text-gray-700">{systemMessage}</pre>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const PromptManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [versions, setVersions] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
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

  // Prompt ordering and chaining states
  const [showWorkflowView, setShowWorkflowView] = useState(false);
  const [templateOrder, setTemplateOrder] = useState([]);
  const [dragging, setDragging] = useState(null);

  const { selectedAccount, selectedOrganization, withAccountContext } = useAccount();

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Re-fetch templates when account changes
  useEffect(() => {
    if (selectedAccount) {
      console.log(`🔄 Account changed to: ${selectedAccount.name} (${selectedAccount.account_id})`);
      // Clear selected template when switching accounts
      setSelectedTemplate(null);
      setVersions([]);
      setHistory([]);
      setStats([]);
      // Fetch new templates for this account
      fetchTemplates();
    }
  }, [selectedAccount?.account_id]);

  useEffect(() => {
    if (selectedTemplate) {
      fetchTemplateDetails(selectedTemplate.template_id);
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      // Don't fetch if no account is selected
      if (!selectedAccount) {
        setTemplates([]);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/prompts/templates', withAccountContext());
      const data = await response.json();
      
      if (data.success) {
        // Sort templates by execution order (for workflow view)
        const sortedTemplates = data.templates.sort((a, b) => 
          (a.execution_order || 999) - (b.execution_order || 999)
        );
        setTemplates(sortedTemplates);
        setTemplateOrder(sortedTemplates.map(t => t.template_id));
        console.log(`📋 Loaded ${data.templates.length} templates for ${selectedAccount.name}`);
      } else {
        throw new Error(data.error || 'Failed to fetch templates');
      }
    } catch (error) {
      setError('Failed to load prompt templates');
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateDetails = async (templateId) => {
    try {
      setLoadingDetails(true);
      
      if (!selectedAccount) {
        return;
      }

      const [versionsRes, historyRes, statsRes] = await Promise.all([
        fetch(`/api/prompts/templates/${templateId}/versions`, withAccountContext()),
        fetch(`/api/prompts/templates/${templateId}/history`, withAccountContext()),
        fetch(`/api/prompts/templates/${templateId}/stats`, withAccountContext())
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
    } finally {
      setLoadingDetails(false);
    }
  };

  const createNewVersion = async () => {
    if (!newPromptContent.trim() || !selectedAccount) return;

    try {
      const response = await fetch(`/api/prompts/templates/${selectedTemplate.template_id}/versions`, {
        ...withAccountContext({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptContent: newPromptContent,
          systemMessage: newSystemMessage,
          notes: newNotes,
          createdBy: 'user'
          })
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
    if (!newTemplateName.trim() || !newTemplateCategory.trim() || !newTemplatePrompt.trim() || !selectedAccount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/prompts/templates', {
        ...withAccountContext({
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

  const createSampleTemplate = async (sampleTemplate) => {
    if (!selectedAccount) return;
    
    try {
      const response = await fetch('/api/prompts/templates', {
        ...withAccountContext({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: sampleTemplate.title,
            category: sampleTemplate.category,
            description: sampleTemplate.description,
            promptContent: sampleTemplate.prompt,
            systemMessage: sampleTemplate.systemMessage,
            createdBy: 'sample-template'
          })
        })
      });

      const data = await response.json();
      if (data.success) {
        // Refresh templates and select the new one
        await fetchTemplates();
        const newTemplate = await new Promise(resolve => {
          setTimeout(() => {
            const found = templates.find(t => t.template_id === data.templateId);
            resolve(found);
          }, 100);
        });
        
        if (newTemplate) {
          setSelectedTemplate(newTemplate);
        }
        
        console.log(`✅ Created sample template: ${sampleTemplate.title} for ${selectedAccount.name}`);
      }
    } catch (error) {
      console.error('Error creating sample template:', error);
    }
  };

  const createDefaultTemplates = async () => {
    if (!selectedAccount) return;
    
    try {
      setLoading(true);
      console.log(`🔧 Creating default templates for ${selectedAccount.name}`);
      
      const defaultTemplates = [
        {
          name: 'Article Analyzer',
          category: 'analysis',
          description: 'Analyzes articles for relevance and generates summaries',
          promptContent: `Analyze this news article for relevance to Christian audiences and Eden.co.uk's mission. Provide a relevance score and detailed analysis.

News Article:
{article_content}

Please provide:
1. Relevance score (0.0 to 1.0)
2. Summary (2-3 sentences)
3. Key themes
4. Potential Christian perspectives
5. Recommended content approach

Focus on stories that relate to faith, values, social issues, or topics that would interest Christian readers.`,
          systemMessage: 'You are an AI analyst specializing in Christian content curation. Evaluate content for its relevance and potential impact on Christian audiences.'
        },
        {
          name: 'Social Media Post',
          category: 'social_media',
          description: 'Creates social media content for various platforms',
          promptContent: `Create social media content based on this news article. Generate posts for different platforms that are engaging and reflect Christian values.

News Article:
{article_content}

Analysis Output:
{analysis_output}

Generate JSON with:
{
  "facebook": {
    "text": "150-200 words Facebook post",
    "hashtags": ["#Christian", "#Faith"]
  },
  "instagram": {
    "text": "100-150 words Instagram caption", 
    "hashtags": ["#Christian", "#Faith", "#Hope"]
  },
  "linkedin": {
    "text": "Professional LinkedIn post",
    "hashtags": ["#Christian", "#Leadership"]
  }
}

Each post should be encouraging, include relevant scripture if appropriate, and maintain Eden.co.uk's hopeful tone.`,
          systemMessage: 'You are a social media manager for Eden.co.uk. Create engaging, encouraging Christian content that inspires and uplifts followers.'
        },
        {
          name: 'Blog Post Generator',
          category: 'blog_post',
          description: 'Generates engaging blog posts from news articles',
          promptContent: `Create an engaging blog post based on this news article. The blog post should be warm, encouraging, and reflect Christian values.

News Article:
{article_content}

Analysis Output:
{analysis_output}

Please write a blog post that:
- Has an engaging title
- Is 800-1200 words long
- Includes 2-3 relevant Bible verses
- Maintains Eden.co.uk's warm, encouraging tone
- Ends with a call to action or reflection question`,
          systemMessage: 'You are a Christian content writer for Eden.co.uk, a platform that shares encouraging Christian content. Your writing should be warm, hopeful, and biblically grounded.'
        },
        {
          name: 'Video Script Creator',
          category: 'video_script',
          description: 'Generates video scripts for different durations',
          promptContent: `Create a video script based on this news article. The script should be engaging, encouraging, and suitable for Christian audiences.

News Article:
{article_content}

Analysis Output:
{analysis_output}

Social Media Output:
{social_media_output}

Script Requirements:
- Duration: 60 seconds
- Include introduction, main content, and conclusion
- Maintain conversational, warm tone
- Include relevant Bible verses where appropriate
- End with encouragement or call to action

Return JSON format:
{
  "title": "Video title",
  "script": "Full script with scene directions in [brackets]",
  "duration": 60,
  "visualSuggestions": ["Visual suggestion 1", "Visual suggestion 2"]
}`,
          systemMessage: 'You are a video script writer for Eden.co.uk. Create engaging, biblically-grounded content that encourages and inspires viewers.'
        },
        {
          name: 'Prayer Points Generator',
          category: 'prayer',
          description: 'Creates prayer points based on news articles and current events',
          promptContent: `Create 5 prayer points based on this news article. Each prayer point should be 15-25 words and cover different aspects: people affected, healing, guidance, hope, and justice.

News Article:
{article_content}

Analysis Output:
{analysis_output}

Format each prayer point as a separate paragraph. Make them specific to the article content while maintaining a hopeful, faith-filled tone.`,
          systemMessage: 'You are a prayer coordinator for Eden.co.uk. Create thoughtful, biblically-grounded prayer points that help people pray meaningfully about current events.'
        },
        {
          name: 'Image Generation Prompts',
          category: 'image_generation',
          description: 'Generates a prompt for AI image creation',
          promptContent: `You are an AI assistant that is an expert at writing image generation prompts. Based on the following article and analysis, write a single, detailed, and evocative paragraph that can be used as a prompt for an AI image generator like Ideogram.

**Article:**
{article_content}

**Analysis:**
{analysis_output}

**Instructions:**
- Write only the prompt itself.
- Do not include any preamble, instructions, or extra text like "Here is a prompt:".
- The prompt should describe a visually rich scene, including details about the subject, setting, lighting, color, and mood.
- The prompt should be a single paragraph.

**Example of a good prompt:**
A lone, weathered lighthouse stands firm against a stormy sea, its powerful beam cutting through the dark clouds, symbolizing hope and steadfastness in times of trial. The waves crash against the rocks below, sending a salty spray high into the air. The overall mood is one of resilience and unwavering faith.`,
          systemMessage: 'You are an expert image prompt writer for Eden.co.uk. Your prompts create visually stunning, thematically relevant images for a Christian audience.'
        }
      ];

      let successCount = 0;
      
      for (let i = 0; i < defaultTemplates.length; i++) {
        const template = defaultTemplates[i];
        try {
          const response = await fetch('/api/prompts/templates', {
            ...withAccountContext({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: template.name,
                category: template.category,
                description: template.description,
                promptContent: template.promptContent,
                systemMessage: template.systemMessage,
                createdBy: 'default-setup'
              })
            })
          });

          const data = await response.json();
          if (data.success) {
            successCount++;
            console.log(`✅ Created template: ${template.name}`);
          } else {
            console.error(`❌ Failed to create ${template.name}:`, data.error);
          }
        } catch (error) {
          console.error(`❌ Error creating ${template.name}:`, error);
        }
      }
      
      if (successCount > 0) {
        alert(`✅ Successfully created ${successCount} default templates! Content generation is now ready.`);
        await fetchTemplates(); // Refresh the templates list
      } else {
        alert('❌ Failed to create default templates. Please check the console for errors.');
      }
      
    } catch (error) {
      console.error('❌ Error creating default templates:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentVersion = async (versionId) => {
    if (!selectedAccount) return;
    
    try {
      const response = await fetch(`/api/prompts/templates/${selectedTemplate.template_id}/versions/${versionId}/current`, {
        ...withAccountContext({
        method: 'PUT'
        })
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
    if (!selectedAccount) return;
    
    try {
      const variables = JSON.parse(testVariables);
      const response = await fetch(`/api/prompts/templates/${selectedTemplate.template_id}/versions/${versionId}/test`, {
        ...withAccountContext({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testVariables: variables })
        })
      });

      const data = await response.json();
      if (data.success) {
        setTestResult(data.result);
      }
    } catch (error) {
      console.error('Error testing prompt:', error);
    }
  };

  // Prompt ordering and workflow functions
  const moveTemplate = async (templateId, direction) => {
    if (!selectedAccount) return;
    
    const currentIndex = templateOrder.indexOf(templateId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= templateOrder.length) return;
    
    const newOrder = [...templateOrder];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    
    setTemplateOrder(newOrder);
    await updateTemplateOrder(newOrder);
  };

  const updateTemplateOrder = async (newOrder) => {
    if (!selectedAccount) return;
    
    try {
      const orderUpdates = newOrder.map((templateId, index) => ({
        templateId,
        executionOrder: index + 1
      }));

      const response = await fetch('/api/prompts/templates/reorder', {
        ...withAccountContext({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: orderUpdates })
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchTemplates(); // Refresh to get updated order
        console.log('✅ Template order updated successfully');
      }
    } catch (error) {
      console.error('Error updating template order:', error);
    }
  };

  const handleDragStart = (e, templateId) => {
    setDragging(templateId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetTemplateId) => {
    e.preventDefault();
    
    if (!dragging || dragging === targetTemplateId) {
      setDragging(null);
      return;
    }
    
    const dragIndex = templateOrder.indexOf(dragging);
    const dropIndex = templateOrder.indexOf(targetTemplateId);
    
    const newOrder = [...templateOrder];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, dragging);
    
    setTemplateOrder(newOrder);
    updateTemplateOrder(newOrder);
    setDragging(null);
  };

  const getAvailablePlaceholders = (currentTemplateId) => {
    const currentIndex = templateOrder.indexOf(currentTemplateId);
    const previousTemplates = templateOrder.slice(0, currentIndex);
    
    return previousTemplates.map(templateId => {
      const template = templates.find(t => t.template_id === templateId);
      return {
        id: templateId,
        name: template?.name || 'Unknown',
        category: template?.category || 'unknown',
        placeholder: `{${template?.category || 'output'}_output}`
      };
    });
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

  // Show message if no account is selected
  if (!selectedAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Prompt Management</h1>
            <p className="text-lg text-gray-600">Configure and manage AI prompts for content generation</p>
          </div>
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Account Selected</h3>
                <p className="text-gray-600">Please select an account from the header to view and manage prompt templates.</p>
              </div>
            </CardContent>
          </Card>
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
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <span>Currently viewing:</span>
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              {selectedOrganization?.name}
            </Badge>
            <span>•</span>
            <Badge variant="outline" className="text-green-600 border-green-200">
              {selectedAccount?.name}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Prompt Templates
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWorkflowView(!showWorkflowView)}
                    className={showWorkflowView ? 'bg-blue-100 text-blue-600' : ''}
                  >
                    <Workflow className="w-4 h-4" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  {showWorkflowView ? 'Workflow view - drag to reorder execution' : 'Select a template to manage'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="mb-4 space-y-2">
                  <Button 
                    onClick={() => setShowNewTemplateForm(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Template
                  </Button>
                  
                  {/* Show initialization button if no templates exist */}
                  {templates.length === 0 && (
                    <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-3">
                        🚀 No prompt templates found! Content generation requires templates to work.
                      </p>
                      <Button 
                        onClick={() => {
                          if (confirm('This will create 6 default prompt templates (Article Analyzer, Social Media, Blog Post, Video Script, Prayer Points, and Image Generation). Continue?')) {
                            createDefaultTemplates();
                          }
                        }}
                        className="w-full"
                        variant="default"
                        size="sm"
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Create Default Templates
                      </Button>
                    </div>
                  )}
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

                {showWorkflowView ? (
                  /* Workflow View - Draggable with order indicators */
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 mb-3 p-2 bg-blue-50 rounded">
                      💡 Templates execute in this order. Drag to reorder, or use ↑↓ buttons.
                    </div>
                    {templateOrder.map((templateId, index) => {
                      const template = templates.find(t => t.template_id === templateId);
                      if (!template) return null;
                      
                      return (
                        <div
                          key={template.template_id}
                          className={`p-3 rounded-lg border transition-all ${
                            selectedTemplate?.template_id === template.template_id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${dragging === template.template_id ? 'opacity-50' : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, template.template_id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, template.template_id)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex flex-col">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 p-0 text-gray-400 hover:text-gray-600"
                                onClick={() => moveTemplate(template.template_id, 'up')}
                                disabled={index === 0}
                              >
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 p-0 text-gray-400 hover:text-gray-600"
                                onClick={() => moveTemplate(template.template_id, 'down')}
                                disabled={index === templateOrder.length - 1}
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            </div>
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                            <div className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                              {index + 1}
                            </div>
                            <div className="flex-1" onClick={() => setSelectedTemplate(template)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getCategoryIcon(template.category)}
                                  <span className="font-medium">{template.name}</span>
                                </div>
                                <Badge className={getCategoryColor(template.category)}>
                                  {template.category.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                              {/* Show available inputs for this step */}
                              {index > 0 && (
                                <div className="mt-2 text-xs text-green-600">
                                  📎 Can use: {getAvailablePlaceholders(template.template_id).map(p => p.placeholder).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Normal View - Simple list */
                  templates.map((template) => (
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
                      <div className="text-sm text-gray-600 mb-2">{template.description}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>v{template.current_version}</span>
                        <span>•</span>
                        <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Template Details */}
          <div className="lg:col-span-2">
            {selectedTemplate ? (
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
                            {showWorkflowView && (
                              <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="text-sm font-medium text-yellow-800 mb-2">💡 Available Placeholders:</div>
                                <div className="space-y-1 text-xs">
                                  <div className="text-yellow-700">
                                    <code className="bg-yellow-100 px-1 rounded">{`{article_content}`}</code> - Original article content
                                  </div>
                                  {getAvailablePlaceholders(selectedTemplate.template_id).map((placeholder, index) => (
                                    <div key={index} className="text-green-700">
                                      <code 
                                        className="bg-green-100 px-1 rounded cursor-pointer hover:bg-green-200"
                                        onClick={() => {
                                          const cursorPos = document.getElementById('prompt-content').selectionStart;
                                          const beforeCursor = newPromptContent.substring(0, cursorPos);
                                          const afterCursor = newPromptContent.substring(cursorPos);
                                          setNewPromptContent(beforeCursor + placeholder.placeholder + afterCursor);
                                        }}
                                      >
                                        {placeholder.placeholder}
                                      </code> - Output from {placeholder.name}
                                    </div>
                                  ))}
                                </div>
                                <div className="text-xs text-yellow-600 mt-2">
                                  💡 Click a placeholder to insert it at cursor position
                                </div>
                              </div>
                            )}
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
                              <div className="text-sm text-gray-600 mt-1">{version.notes}</div>
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
                        <div className="text-gray-500 text-center py-8">No usage history yet</div>
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
                        <div className="text-gray-500 text-center py-8">No statistics available yet</div>
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
            ) : (
              /* Welcome Screen for New Users */
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-6 h-6" />
                      Welcome to Prompt Management
                    </CardTitle>
                    <CardDescription>
                      Create and manage AI prompts to generate consistent, high-quality content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none text-sm text-gray-600">
                      <div>
                        Prompt templates allow you to standardise how your AI generates different types of content. 
                        Each template defines the instructions, tone, and structure for specific content types like 
                        blog posts, social media, videos, and more.
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {templates.length === 0 ? (
                  /* Quick Start for Empty Account */
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>🚀 Quick Start - Sample Templates</CardTitle>
                        <CardDescription>
                          Get started quickly with these popular prompt templates. Click "Create Template" to add them to your account.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          
                          {/* Blog Post Template */}
                          <SampleTemplateCard
                            title="Blog Post Generator"
                            category="blog_post"
                            description="Generates engaging blog posts from news articles"
                            icon={<FileText className="w-5 h-5" />}
                            prompt={`Create an engaging blog post based on the following news article:

Article: {{article_content}}

Requirements:
- Write a compelling headline that captures attention
- Create an engaging introduction that hooks the reader
- Develop the main content with clear sections and subheadings
- Include relevant quotes from the original article
- Add a thought-provoking conclusion
- Target word count: 800-1200 words
- Tone: Professional yet accessible
- Include a call-to-action at the end

Format the output as clean HTML with appropriate headings (h1, h2, h3) and paragraph tags.`}
                            systemMessage="You are a professional content writer specialising in creating engaging blog posts from news content. Focus on clarity, engagement, and providing value to readers."
                            onCreateTemplate={(template) => createSampleTemplate(template)}
                          />

                          {/* Social Media Template */}
                          <SampleTemplateCard
                            title="Social Media Post"
                            category="social_media"
                            description="Creates engaging social media content for various platforms"
                            icon={<Share2 className="w-5 h-5" />}
                            prompt={`Create social media posts based on this article:

Article: {{article_content}}

Create 4 different posts:
1. LinkedIn (professional, 150-200 words)
2. Twitter/X (engaging, max 280 characters, include hashtags)
3. Facebook (conversational, 100-150 words)
4. Instagram (visual-focused caption, 50-100 words, include emoji)

Each post should:
- Capture the key message from the article
- Include relevant hashtags (2-5 per post)
- Have an engaging hook in the first line
- Include a call-to-action when appropriate
- Be platform-appropriate in tone and style

Format each post clearly with platform labels.`}
                            systemMessage="You are a social media expert who creates engaging, platform-specific content that drives engagement and shares."
                            onCreateTemplate={(template) => createSampleTemplate(template)}
                          />

                          {/* Prayer Points Template */}
                          <SampleTemplateCard
                            title="Prayer Points"
                            category="prayer"
                            description="Generates meaningful prayer points from current events"
                            icon={<Heart className="w-5 h-5" />}
                            prompt={`Based on this news article, create thoughtful prayer points:

Article: {{article_content}}

Create 5-7 prayer points that:
- Address the specific issues or people mentioned in the article
- Show compassion and empathy for those affected
- Seek wisdom and guidance for leaders and decision-makers
- Pray for positive outcomes and healing where needed
- Include thanksgiving for any positive developments
- Are specific rather than general
- Are appropriate for a Christian audience

Format each prayer point as a separate paragraph, starting with a brief context and followed by the prayer focus.`}
                            systemMessage="You are a compassionate pastoral assistant helping people pray meaningfully about current events, always focusing on love, hope, and God's will."
                            onCreateTemplate={(template) => createSampleTemplate(template)}
                          />

                          {/* Video Script Template */}
                          <SampleTemplateCard
                            title="Video Script Creator"
                            category="video_script"
                            description="Generates scripts for different video durations"
                            icon={<Video className="w-5 h-5" />}
                            prompt={`Create a video script based on this article:

Article: {{article_content}}
Duration: {{duration}} minutes (default: 3-5 minutes)

Script structure:
1. HOOK (0-15 seconds): Compelling opening question or statement
2. INTRODUCTION (15-30 seconds): Brief context and what viewers will learn
3. MAIN CONTENT (70% of video): Key points broken into digestible segments
4. CONCLUSION (last 20-30 seconds): Summary and call-to-action

Format:
- Include timing cues [0:00]
- Note visual suggestions in [VISUAL: description]
- Mark emphasis and tone changes
- Include natural pauses and transitions
- Add engagement prompts (like, subscribe, comment)

Keep language conversational and engaging for video format.`}
                            systemMessage="You are a video content creator who specialises in making informative, engaging scripts that keep viewers watching and encourage interaction."
                            onCreateTemplate={(template) => createSampleTemplate(template)}
                          />

                        </div>
                      </CardContent>
                    </Card>

                    {/* Best Practices */}
                    <HelpSection 
                      title="💡 Best Practices for Prompt Templates"
                      bgColor="bg-amber-50"
                      borderColor="border-amber-200"
                      textColor="text-amber-800"
                      headingColor="text-amber-900"
                    >
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium text-amber-900 mb-2">📝 Writing Effective Prompts</h4>
                          <ul className="space-y-1 text-amber-800">
                            <li>• Be specific about the desired output format</li>
                            <li>• Include clear examples when possible</li>
                            <li>• Define the tone and style you want</li>
                            <li>• Use variables like {`{{article_content}}`} for dynamic content</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-amber-900 mb-2">🔧 Template Management</h4>
                          <ul className="space-y-1 text-amber-800">
                            <li>• Test prompts before setting them as current</li>
                            <li>• Keep track of changes with version notes</li>
                            <li>• Monitor usage statistics to optimise performance</li>
                            <li>• Use categories to organise your templates</li>
                          </ul>
                        </div>
                      </div>
                    </HelpSection>
                  </div>
                ) : (
                  /* Getting Started for Accounts with Templates */
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Select a Template
                      </CardTitle>
                      <CardDescription>
                        Choose a prompt template from the left panel to view and edit its details
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <div className="text-gray-600 mb-4">
                          You have {templates.length} prompt template{templates.length !== 1 ? 's' : ''} in your account.
                        </div>
                        <div className="text-sm text-gray-500">
                          Click on any template from the left to view its current version, edit prompts, 
                          manage versions, and view usage statistics.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptManagement; 
