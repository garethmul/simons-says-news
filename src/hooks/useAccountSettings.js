import { useState, useEffect } from 'react';

export const useAccountSettings = (accountId) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccountSettings = async () => {
      if (!accountId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/account-settings/${accountId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch account settings: ${response.statusText}`);
        }

        const data = await response.json();
        setSettings(data);
      } catch (err) {
        console.error('Error fetching account settings:', err);
        setError(err.message);
        
        // Set default settings on error
        setSettings({
          contentQuality: {
            thresholds: {
              min_content_length: 500,
              good_content_length: 1000,
              excellent_content_length: 2000,
              title_only_threshold: 150,
              min_quality_score: 0.3
            },
            uiDisplay: {
              show_quality_warnings: true,
              show_content_length: true,
              show_quality_score: true,
              disable_regenerate_on_poor_quality: true
            }
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAccountSettings();
  }, [accountId]);

  const updateSettings = async (settingType, newSettings) => {
    if (!accountId) return false;

    try {
      const response = await fetch(`/api/account-settings/${accountId}/${settingType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.statusText}`);
      }

      const updatedData = await response.json();
      
      // Update local state
      setSettings(prev => ({
        ...prev,
        [settingType]: updatedData
      }));

      return true;
    } catch (err) {
      console.error('Error updating account settings:', err);
      setError(err.message);
      return false;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: () => {
      setLoading(true);
      // Trigger re-fetch by changing accountId dependency
      return fetchAccountSettings();
    }
  };
}; 