import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Settings, 
  Palette, 
  Type, 
  Wand2, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Heart,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { useAccount } from '../contexts/AccountContext';

/**
 * Image Generation Settings Component
 * Manages account-level settings for AI image generation
 */
const ImageGenerationSettings = () => {
  const { withAccountContext, selectedAccount, loading: accountLoading } = useAccount();
  const [settings, setSettings] = useState({
    promptPrefix: '',
    promptSuffix: '',
    brandColors: [],
    defaults: {
      modelVersion: 'v2',
      aspectRatio: '16:9',
      resolution: '',
      styleType: 'GENERAL',
      renderingSpeed: 'DEFAULT',
      magicPrompt: 'AUTO',
      negativePrompt: '',
      numImages: 1
    }
  });
  const [options, setOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [newColorSet, setNewColorSet] = useState({ name: '', colors: ['#000000'] });
  
  // Style Preferences State
  const [generatedImages, setGeneratedImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [preferredStyleCodes, setPreferredStyleCodes] = useState([]);

  // Load settings and options on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!selectedAccount || accountLoading) return;
      
      setIsLoading(true);
      setSaveStatus(null);
      
      try {
        // Load Ideogram options (we'll reload when model version changes)
        const optionsResponse = await fetch(`/api/eden/images/ideogram/options?modelVersion=${settings.defaults.modelVersion}`);
        if (optionsResponse.ok) {
          const optionsData = await optionsResponse.json();
          setOptions(optionsData.options);
        } else {
          console.warn('Failed to load Ideogram options');
        }

        // Load settings
        try {
          const settingsResponse = await fetch('/api/eden/settings/image-generation', withAccountContext());
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json();
            setSettings(settingsData.settings);
            
            // Apply account defaults to form
            if (settingsData.settings?.defaults) {
              const defaults = settingsData.settings.defaults;
              setSettings(prev => ({
                ...prev,
                defaults: {
                  ...prev.defaults,
                  modelVersion: defaults.modelVersion || prev.defaults.modelVersion,
                  aspectRatio: defaults.aspectRatio || prev.defaults.aspectRatio,
                  resolution: defaults.resolution || prev.defaults.resolution,
                  renderingSpeed: defaults.renderingSpeed || prev.defaults.renderingSpeed,
                  magicPrompt: defaults.magicPrompt || prev.defaults.magicPrompt,
                  styleType: defaults.styleType || prev.defaults.styleType,
                  negativePrompt: defaults.negativePrompt || prev.defaults.negativePrompt,
                  numImages: defaults.numImages || prev.defaults.numImages
                }
              }));
              
              // Reload options if model version changed
              if (defaults.modelVersion && defaults.modelVersion !== settings.defaults.modelVersion) {
                const newOptionsResponse = await fetch(`/api/eden/images/ideogram/options?modelVersion=${defaults.modelVersion}`);
                if (newOptionsResponse.ok) {
                  const newOptionsData = await newOptionsResponse.json();
                  setOptions(newOptionsData.options);
                }
              }
            }
            
            // Load preferred style codes
            if (settingsData.settings?.preferredStyleCodes) {
              setPreferredStyleCodes(settingsData.settings.preferredStyleCodes);
            }
            
            console.log('✅ Settings loaded successfully');
          } else {
            const errorData = await settingsResponse.json();
            console.error('❌ Failed to load settings:', errorData.error);
            setSaveStatus({ type: 'error', message: `Failed to load settings: ${errorData.error}` });
          }
        } catch (settingsError) {
          console.error('❌ Settings request failed:', settingsError.message);
          setSaveStatus({ type: 'error', message: `Failed to load settings: ${settingsError.message}` });
        }

        // Load generated images for style preferences
        setIsLoadingImages(true);
        try {
          const historyResponse = await fetch('/api/eden/images/generation-history', withAccountContext());
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            setGeneratedImages(historyData.history.slice(0, 20)); // Show last 20 generations
          }
        } catch (historyError) {
          console.warn('Failed to load generation history:', historyError.message);
        } finally {
          setIsLoadingImages(false);
        }
        
      } catch (error) {
        console.error('❌ Failed to load data:', error.message);
        setSaveStatus({ type: 'error', message: `Failed to load data: ${error.message}` });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedAccount, accountLoading, withAccountContext]);

  const handleSaveSettings = async () => {
    if (!selectedAccount) {
      setSaveStatus({ type: 'error', message: 'No account selected' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await fetch('/api/eden/settings/image-generation', withAccountContext({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      }));

      if (response.ok) {
        setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const error = await response.json();
        setSaveStatus({ type: 'error', message: error.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddColorSet = async () => {
    if (!selectedAccount) {
      setSaveStatus({ type: 'error', message: 'No account selected' });
      return;
    }

    if (!newColorSet.name.trim() || newColorSet.colors.length === 0) {
      setSaveStatus({ type: 'error', message: 'Please provide a name and at least one color' });
      return;
    }

    try {
      const response = await fetch('/api/eden/settings/brand-colors', withAccountContext({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newColorSet)
      }));

      if (response.ok) {
        const result = await response.json();
        setSettings(prev => ({
          ...prev,
          brandColors: result.brandColors
        }));
        setNewColorSet({ name: '', colors: ['#000000'] });
        setSaveStatus({ type: 'success', message: `Color set "${newColorSet.name}" added!` });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const error = await response.json();
        setSaveStatus({ type: 'error', message: error.error || 'Failed to add color set' });
      }
    } catch (error) {
      console.error('Add color set error:', error);
      setSaveStatus({ type: 'error', message: 'Failed to add color set' });
    }
  };

  const handleRemoveColorSet = async (index) => {
    if (!selectedAccount) {
      setSaveStatus({ type: 'error', message: 'No account selected' });
      return;
    }

    try {
      const response = await fetch(`/api/eden/settings/brand-colors/${index}`, withAccountContext({
        method: 'DELETE'
      }));

      if (response.ok) {
        const result = await response.json();
        setSettings(prev => ({
          ...prev,
          brandColors: result.brandColors
        }));
        setSaveStatus({ type: 'success', message: 'Color set removed!' });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const error = await response.json();
        setSaveStatus({ type: 'error', message: error.error || 'Failed to remove color set' });
      }
    } catch (error) {
      console.error('Remove color set error:', error);
      setSaveStatus({ type: 'error', message: 'Failed to remove color set' });
    }
  };

  const handleAddColor = () => {
    setNewColorSet(prev => ({
      ...prev,
      colors: [...prev.colors, '#000000']
    }));
  };

  const handleColorChange = (index, color) => {
    setNewColorSet(prev => ({
      ...prev,
      colors: prev.colors.map((c, i) => i === index ? color : c)
    }));
  };

  const handleRemoveColor = (index) => {
    if (newColorSet.colors.length > 1) {
      setNewColorSet(prev => ({
        ...prev,
        colors: prev.colors.filter((_, i) => i !== index)
      }));
    }
  };

  const resetToDefaults = () => {
    setSettings(prev => ({
      ...prev,
      defaults: {
        modelVersion: 'v2',
        aspectRatio: '16:9',
        resolution: '',
        styleType: 'GENERAL',
        renderingSpeed: 'DEFAULT',
        magicPrompt: 'AUTO',
        negativePrompt: '',
        numImages: 1
      }
    }));
  };

  // Toggle image selection for style preferences
  const toggleImageSelection = (imageId) => {
    setSelectedImages(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(imageId)) {
        newSelection.delete(imageId);
      } else {
        newSelection.add(imageId);
      }
      return newSelection;
    });
  };

  // Extract style codes from selected images
  const extractStyleCodesFromSelection = () => {
    const styleCodes = [];
    selectedImages.forEach(imageId => {
      const image = generatedImages.find(img => img.id === imageId);
      if (image?.parameters?.styleCodes) {
        styleCodes.push(...image.parameters.styleCodes);
      }
      // Also capture interesting seeds that could be used as style references
      if (image?.metadata?.seed) {
        styleCodes.push({
          type: 'seed',
          value: image.metadata.seed,
          source: 'generated_image',
          imageUrl: image.result.imageUrl,
          prompt: image.prompts.finalPrompt?.substring(0, 100)
        });
      }
    });
    return styleCodes;
  };

  // Save preferred style codes
  const savePreferredStyleCodes = async () => {
    if (!selectedAccount) {
      setSaveStatus({ type: 'error', message: 'No account selected' });
      return;
    }

    const extractedCodes = extractStyleCodesFromSelection();
    const updatedSettings = {
      ...settings,
      preferredStyleCodes: extractedCodes
    };

    try {
      const response = await fetch('/api/eden/settings/image-generation', withAccountContext({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      }));

      if (response.ok) {
        setPreferredStyleCodes(extractedCodes);
        setSettings(updatedSettings);
        setSaveStatus({ type: 'success', message: `Saved ${extractedCodes.length} preferred style codes!` });
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (error) {
      console.error('Failed to save style preferences:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save style preferences' });
    }
  };

  // Show loading state appropriately
  if (accountLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-gray-600">Loading account context...</span>
        </div>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Account Selected</h3>
          <p className="text-gray-600">
            Please select an account from the dropdown above to configure image generation settings.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading image generation settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Image Generation Settings</h1>
          <p className="text-gray-600 mt-1">Configure defaults and branding for AI image generation</p>
        </div>
        
        <div className="flex items-center gap-2">
          {saveStatus && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              saveStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {saveStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{saveStatus.message}</span>
            </div>
          )}
          
          <Button 
            onClick={handleSaveSettings} 
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="prompts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Prompt Customization
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Brand Colors
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Default Settings
          </TabsTrigger>
          <TabsTrigger value="styles" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Style Preferences
          </TabsTrigger>
        </TabsList>

        {/* Prompt Customization Tab */}
        <TabsContent value="prompts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Prompt Prefix & Suffix
              </CardTitle>
              <CardDescription>
                Add consistent text to the beginning and end of all image generation prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Prefix
                </label>
                <input
                  type="text"
                  value={settings.promptPrefix}
                  onChange={(e) => setSettings(prev => ({ ...prev, promptPrefix: e.target.value }))}
                  placeholder="e.g., 'Professional, high-quality,' or 'Brand-consistent,'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This text will be added at the beginning of every image prompt
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Suffix
                </label>
                <input
                  type="text"
                  value={settings.promptSuffix}
                  onChange={(e) => setSettings(prev => ({ ...prev, promptSuffix: e.target.value }))}
                  placeholder="e.g., 'professional lighting, high resolution' or 'editorial style'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This text will be added at the end of every image prompt
                </p>
              </div>

              {(settings.promptPrefix || settings.promptSuffix) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Preview Example:</h4>
                  <p className="text-sm text-blue-800 font-mono">
                    {settings.promptPrefix && `"${settings.promptPrefix} `}
                    <span className="text-blue-600">[User's prompt]</span>
                    {settings.promptSuffix && ` ${settings.promptSuffix}"`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Colors Tab */}
        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Color Sets
              </CardTitle>
              <CardDescription>
                Define color palettes that can be applied to image generation for brand consistency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Color Sets */}
              {settings.brandColors.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Your Brand Color Sets</h4>
                  {settings.brandColors.map((colorSet, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900">{colorSet.name}</h5>
                          <div className="flex gap-2 mt-2">
                            {colorSet.colors.map((color, colorIndex) => (
                              <div
                                key={colorIndex}
                                className="w-8 h-8 rounded border-2 border-gray-200"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {colorSet.colors.length} color{colorSet.colors.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveColorSet(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No brand color sets defined yet</p>
                  <p className="text-sm">Add your first color set below</p>
                </div>
              )}

              {/* Add New Color Set */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Add New Color Set</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color Set Name
                    </label>
                    <input
                      type="text"
                      value={newColorSet.name}
                      onChange={(e) => setNewColorSet(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., 'Primary Brand Colors' or 'Autumn Palette'"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Colors
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {newColorSet.colors.map((color, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => handleColorChange(index, e.target.value)}
                            className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={color}
                            onChange={(e) => handleColorChange(index, e.target.value)}
                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                          {newColorSet.colors.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveColor(index)}
                              className="w-8 h-8 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddColor}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Color
                      </Button>
                      <Button
                        onClick={handleAddColorSet}
                        disabled={!newColorSet.name.trim()}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Color Set
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Default Settings Tab */}
        <TabsContent value="defaults">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Default Generation Settings
              </CardTitle>
              <CardDescription>
                Set default values for Ideogram parameters that will be pre-filled in the generation form
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {options && (
                <>
                  {/* Model Version Selection */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🎨 Default Ideogram Model Version
                    </label>
                    <select
                      value={settings.defaults.modelVersion}
                      onChange={async (e) => {
                        const newModelVersion = e.target.value;
                        setSettings(prev => ({
                          ...prev,
                          defaults: { ...prev.defaults, modelVersion: newModelVersion }
                        }));
                        
                        // Reload options for the new model version
                        try {
                          const newOptionsResponse = await fetch(`/api/eden/images/ideogram/options?modelVersion=${newModelVersion}`);
                          if (newOptionsResponse.ok) {
                            const newOptionsData = await newOptionsResponse.json();
                            setOptions(newOptionsData.options);
                            
                            // Validate current style type against new model
                            const validStyleTypes = newOptionsData.options.styles?.map(s => s.value) || ['GENERAL'];
                            if (!validStyleTypes.includes(settings.defaults.styleType)) {
                              setSettings(prev => ({
                                ...prev,
                                defaults: { ...prev.defaults, styleType: 'GENERAL' }
                              }));
                            }
                          }
                        } catch (error) {
                          console.error('Failed to reload options:', error);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="v3">Version 3.0 (Latest, Best Quality) - 4 styles</option>
                      <option value="v2">Version 2.0/2a (ANIME + 3D) - 6 styles</option>
                      <option value="v1">Version 1.0 (Most Styles) - 20+ styles</option>
                    </select>
                    <p className="text-xs text-blue-700 mt-1">
                      {settings.defaults.modelVersion === 'v3' && 'Latest model with highest quality. Limited to 4 core styles.'}
                      {settings.defaults.modelVersion === 'v2' && 'Includes ANIME and 3D styles! Good balance of quality and options.'}
                      {settings.defaults.modelVersion === 'v1' && 'Widest style selection including Cinematic, Dark Fantasy, Graffiti, and more.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Aspect Ratio vs Resolution */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Aspect Ratio
                      </label>
                      <select
                        value={settings.defaults.aspectRatio}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          defaults: { ...prev.defaults, aspectRatio: e.target.value }
                        }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!!settings.defaults.resolution}
                      >
                        {options.aspectRatios.map(ratio => (
                          <option key={ratio.value} value={ratio.value}>
                            {ratio.label}
                          </option>
                        ))}
                      </select>
                      {settings.defaults.resolution && (
                        <p className="text-xs text-gray-500 mt-1">Disabled when using specific resolution</p>
                      )}
                    </div>

                    {/* Resolution Override */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Resolution (Optional)
                      </label>
                      <select
                        value={settings.defaults.resolution}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          defaults: { ...prev.defaults, resolution: e.target.value }
                        }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Use Aspect Ratio Instead</option>
                        {options.resolutions && options.resolutions.map(res => (
                          <option key={res.value} value={res.value}>
                            {res.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Override aspect ratio with exact pixel dimensions
                      </p>
                    </div>

                    {/* Style Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Style Type
                      </label>
                      <select
                        value={settings.defaults.styleType}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          defaults: { ...prev.defaults, styleType: e.target.value }
                        }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {options.styles.map(style => (
                          <option key={style.value} value={style.value}>
                            {style.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rendering Speed */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Rendering Speed
                      </label>
                      <select
                        value={settings.defaults.renderingSpeed}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          defaults: { ...prev.defaults, renderingSpeed: e.target.value }
                        }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {options.renderingSpeeds.map(speed => (
                          <option key={speed.value} value={speed.value}>
                            {speed.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Magic Prompt */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Magic Prompt
                      </label>
                      <select
                        value={settings.defaults.magicPrompt}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          defaults: { ...prev.defaults, magicPrompt: e.target.value }
                        }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {options.magicPromptOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Number of Images */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Number of Images
                      </label>
                      <select
                        value={settings.defaults.numImages}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          defaults: { ...prev.defaults, numImages: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {options.numImagesOptions.map(num => (
                          <option key={num} value={num}>
                            {num} image{num > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Default Negative Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Negative Prompt (Optional)
                    </label>
                    <input
                      type="text"
                      value={settings.defaults.negativePrompt}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        defaults: { ...prev.defaults, negativePrompt: e.target.value }
                      }))}
                      placeholder="Elements to exclude from all images..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be pre-filled in the negative prompt field for all generations
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={resetToDefaults}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset to System Defaults
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Style Preferences Tab */}
        <TabsContent value="styles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Style Preferences
              </CardTitle>
              <CardDescription>
                Select images you like to build a library of preferred style codes and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Preferred Styles */}
              {preferredStyleCodes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Your Preferred Style Codes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {preferredStyleCodes.map((styleCode, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {styleCode.type === 'seed' ? 'Seed' : 'Style Code'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newCodes = preferredStyleCodes.filter((_, i) => i !== index);
                              setPreferredStyleCodes(newCodes);
                            }}
                            className="w-6 h-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <code className="text-xs bg-white px-2 py-1 rounded font-mono">
                          {styleCode.value}
                        </code>
                        {styleCode.prompt && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            "{styleCode.prompt}..."
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadGeneratedImages}
                  disabled={isLoadingImages}
                  className="flex items-center gap-2"
                >
                  {isLoadingImages ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  {isLoadingImages ? 'Loading...' : 'Load Generated Images'}
                </Button>
                
                {selectedImages.size > 0 && (
                  <Button
                    onClick={savePreferredStyleCodes}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save {selectedImages.size} Selected Style{selectedImages.size !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>

              {/* Generated Images Gallery */}
              {isLoadingImages ? (
                <div className="text-center py-12 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading generated images...</p>
                </div>
              ) : generatedImages.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      Generated Images ({generatedImages.length})
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedImages.size} selected
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {generatedImages.map((image) => (
                      <div 
                        key={image.id} 
                        className={`relative group border rounded-lg overflow-hidden cursor-pointer transition-all ${
                          selectedImages.has(image.id) 
                            ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleImageSelection(image.id)}
                      >
                        {/* Selection Indicator */}
                        <div className="absolute top-2 left-2 z-10">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedImages.has(image.id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'bg-white border-gray-300 group-hover:border-gray-400'
                          }`}>
                            {selectedImages.has(image.id) && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Image */}
                        <div className="aspect-square">
                          <img
                            src={image.result.imageUrl}
                            alt={image.result.imageAltText || 'Generated Image'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Image Details */}
                        <div className="p-3 space-y-2">
                          <div className="text-xs text-gray-600 line-clamp-2">
                            <strong>Prompt:</strong> {image.prompts.finalPrompt?.substring(0, 80)}...
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">
                              {image.parameters.styleType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {image.parameters.aspectRatio}
                            </Badge>
                            {image.metadata.seed && (
                              <Badge variant="secondary" className="text-xs">
                                Seed: {image.metadata.seed}
                              </Badge>
                            )}
                          </div>

                          {image.parameters.styleCodes && (
                            <div className="text-xs">
                              <strong>Style Codes:</strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {image.parameters.styleCodes.map((code, index) => (
                                  <code key={index} className="bg-gray-100 px-1 rounded text-xs">
                                    {code}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-gray-500">
                            Generated: {new Date(image.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No generated images found</p>
                  <p className="text-sm mt-2">
                    Generate some AI images first, then return here to select your preferred styles
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImageGenerationSettings; 