import React, { useState } from 'react';
import { useAccountSettings } from '../../hooks/useAccountSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Alert, AlertDescription } from '../ui/alert';
import { Settings, Zap, Image, FileText, RotateCcw, Save, AlertTriangle } from 'lucide-react';

const AccountSettings = ({ accountId }) => {
  const { settings, loading, error, updateSettings } = useAccountSettings(accountId);
  const [activeTab, setActiveTab] = useState('content-quality');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState(null);

  // Initialize local settings when account settings load
  React.useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
    }
  }, [settings, localSettings]);

  const handleSettingChange = (category, section, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [section]: {
          ...prev[category][section],
          [key]: value
        }
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!localSettings || !hasUnsavedChanges) return;

    setSaving(true);
    try {
      // Save each category separately
      const categoryMap = {
        'content-quality': 'contentQuality',
        'image-generation': 'imageGeneration',
        'prompt-templates': 'promptTemplates'
      };

      const category = categoryMap[activeTab];
      if (category && localSettings[category]) {
        const success = await updateSettings(activeTab, localSettings[category]);
        if (success) {
          setHasUnsavedChanges(false);
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
      setHasUnsavedChanges(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Settings className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading account settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading account settings: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!localSettings) {
    return null;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Account Settings</h1>
      <p>Configure your account settings here. Account ID: {accountId}</p>
      <div className="mt-4 p-4 bg-blue-50 rounded">
        <p className="text-blue-800">Settings interface will be implemented here for:</p>
        <ul className="list-disc list-inside mt-2 text-blue-700">
          <li>Content Quality Thresholds</li>
          <li>Image Generation Settings</li>
          <li>Prompt Template Configuration</li>
        </ul>
      </div>
    </div>
  );
};

const ContentQualitySettings = ({ settings, onChange }) => {
  if (!settings) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Length Thresholds</CardTitle>
          <CardDescription>
            Configure minimum content length requirements for article generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min-content-length">Minimum Content Length (chars)</Label>
              <Input
                id="min-content-length"
                type="number"
                value={settings.thresholds?.min_content_length || 500}
                onChange={(e) => onChange('thresholds', 'min_content_length', parseInt(e.target.value))}
                min="100"
                max="2000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Articles shorter than this will be blocked from generation
              </p>
            </div>
            <div>
              <Label htmlFor="good-content-length">Good Content Length (chars)</Label>
              <Input
                id="good-content-length"
                type="number"
                value={settings.thresholds?.good_content_length || 1000}
                onChange={(e) => onChange('thresholds', 'good_content_length', parseInt(e.target.value))}
                min="500"
                max="3000"
              />
            </div>
            <div>
              <Label htmlFor="excellent-content-length">Excellent Content Length (chars)</Label>
              <Input
                id="excellent-content-length"
                type="number"
                value={settings.thresholds?.excellent_content_length || 2000}
                onChange={(e) => onChange('thresholds', 'excellent_content_length', parseInt(e.target.value))}
                min="1000"
                max="5000"
              />
            </div>
            <div>
              <Label htmlFor="min-quality-score">Minimum Quality Score</Label>
              <div className="space-y-2">
                <Slider
                  value={[settings.thresholds?.min_quality_score || 0.3]}
                  onValueChange={([value]) => onChange('thresholds', 'min_quality_score', value)}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">
                  {((settings.thresholds?.min_quality_score || 0.3) * 100).toFixed(0)}% - Articles below this score will be blocked
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation Rules</CardTitle>
          <CardDescription>
            Configure what types of content should be blocked from generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="block-title-only">Block Title-Only Articles</Label>
              <p className="text-xs text-gray-500">Prevent generation on articles that appear to contain only the title</p>
            </div>
            <Switch
              id="block-title-only"
              checked={settings.generationRules?.block_title_only ?? true}
              onCheckedChange={(checked) => onChange('generationRules', 'block_title_only', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="block-no-content">Block No-Content Articles</Label>
              <p className="text-xs text-gray-500">Prevent generation on articles with no extractable content</p>
            </div>
            <Switch
              id="block-no-content"
              checked={settings.generationRules?.block_no_content ?? true}
              onCheckedChange={(checked) => onChange('generationRules', 'block_no_content', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="warn-short-content">Warn on Short Content</Label>
              <p className="text-xs text-gray-500">Show warnings for articles with short but adequate content</p>
            </div>
            <Switch
              id="warn-short-content"
              checked={settings.generationRules?.warn_short_content ?? true}
              onCheckedChange={(checked) => onChange('generationRules', 'warn_short_content', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>UI Display Options</CardTitle>
          <CardDescription>
            Configure what quality information is shown in the interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-quality-warnings">Show Quality Warnings</Label>
              <p className="text-xs text-gray-500">Display content quality warnings on content cards</p>
            </div>
            <Switch
              id="show-quality-warnings"
              checked={settings.uiDisplay?.show_quality_warnings ?? true}
              onCheckedChange={(checked) => onChange('uiDisplay', 'show_quality_warnings', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-content-length">Show Content Length</Label>
              <p className="text-xs text-gray-500">Display character count on content cards</p>
            </div>
            <Switch
              id="show-content-length"
              checked={settings.uiDisplay?.show_content_length ?? true}
              onCheckedChange={(checked) => onChange('uiDisplay', 'show_content_length', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-quality-score">Show Quality Score</Label>
              <p className="text-xs text-gray-500">Display quality percentage and tier on content cards</p>
            </div>
            <Switch
              id="show-quality-score"
              checked={settings.uiDisplay?.show_quality_score ?? true}
              onCheckedChange={(checked) => onChange('uiDisplay', 'show_quality_score', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="disable-regenerate">Disable Regenerate on Poor Quality</Label>
              <p className="text-xs text-gray-500">Disable regenerate button for articles with poor content quality</p>
            </div>
            <Switch
              id="disable-regenerate"
              checked={settings.uiDisplay?.disable_regenerate_on_poor_quality ?? true}
              onCheckedChange={(checked) => onChange('uiDisplay', 'disable_regenerate_on_poor_quality', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ImageGenerationSettings = ({ settings, onChange }) => {
  if (!settings) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default Image Settings</CardTitle>
          <CardDescription>
            Configure default settings for image generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="aspect-ratio">Default Aspect Ratio</Label>
              <select 
                id="aspect-ratio"
                className="w-full p-2 border rounded"
                value={settings.defaults?.aspectRatio || '16:9'}
                onChange={(e) => onChange('defaults', 'aspectRatio', e.target.value)}
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="4:3">4:3 (Standard)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="style-type">Default Style</Label>
              <select 
                id="style-type"
                className="w-full p-2 border rounded"
                value={settings.defaults?.styleType || 'GENERAL'}
                onChange={(e) => onChange('defaults', 'styleType', e.target.value)}
              >
                <option value="GENERAL">General</option>
                <option value="REALISTIC">Realistic</option>
                <option value="DESIGN">Design</option>
                <option value="RENDER_3D">3D Render</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quality Requirements</CardTitle>
          <CardDescription>
            Set minimum quality requirements for automatic image generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="min-source-content">Minimum Source Content Length</Label>
            <Input
              id="min-source-content"
              type="number"
              value={settings.qualityRequirements?.min_source_content_length || 200}
              onChange={(e) => onChange('qualityRequirements', 'min_source_content_length', parseInt(e.target.value))}
              min="50"
              max="1000"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="require-quality-check">Require Content Quality Check</Label>
              <p className="text-xs text-gray-500">Only generate images for articles that pass quality assessment</p>
            </div>
            <Switch
              id="require-quality-check"
              checked={settings.qualityRequirements?.require_content_quality_check ?? true}
              onCheckedChange={(checked) => onChange('qualityRequirements', 'require_content_quality_check', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const PromptTemplateSettings = ({ settings, onChange }) => {
  if (!settings) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Template Preferences</CardTitle>
          <CardDescription>
            Configure default settings for AI prompt templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="default-temperature">Default Temperature</Label>
              <div className="space-y-2">
                <Slider
                  value={[settings.templatePreferences?.default_temperature || 0.7]}
                  onValueChange={([value]) => onChange('templatePreferences', 'default_temperature', value)}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">
                  {settings.templatePreferences?.default_temperature || 0.7} - Controls creativity (0 = focused, 1 = creative)
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="default-max-tokens">Default Max Tokens</Label>
              <Input
                id="default-max-tokens"
                type="number"
                value={settings.templatePreferences?.default_max_tokens || 2000}
                onChange={(e) => onChange('templatePreferences', 'default_max_tokens', parseInt(e.target.value))}
                min="500"
                max="4000"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-workflow-chaining">Enable Workflow Chaining</Label>
              <p className="text-xs text-gray-500">Allow templates to chain together for complex workflows</p>
            </div>
            <Switch
              id="enable-workflow-chaining"
              checked={settings.templatePreferences?.enable_workflow_chaining ?? true}
              onCheckedChange={(checked) => onChange('templatePreferences', 'enable_workflow_chaining', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Requirements</CardTitle>
          <CardDescription>
            Set quality requirements for prompt template usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="min-source-quality">Minimum Source Quality for Templates</Label>
            <div className="space-y-2">
              <Slider
                value={[settings.contentRequirements?.min_source_quality_for_templates || 0.3]}
                onValueChange={([value]) => onChange('contentRequirements', 'min_source_quality_for_templates', value)}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-gray-500">
                {((settings.contentRequirements?.min_source_quality_for_templates || 0.3) * 100).toFixed(0)}% minimum quality score
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-quality-override">Enable Quality Override</Label>
              <p className="text-xs text-gray-500">Allow manual override of quality requirements</p>
            </div>
            <Switch
              id="enable-quality-override"
              checked={settings.contentRequirements?.enable_quality_override ?? true}
              onCheckedChange={(checked) => onChange('contentRequirements', 'enable_quality_override', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings; 