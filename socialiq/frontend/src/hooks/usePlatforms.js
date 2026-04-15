import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/client.js';

export function usePlatforms() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlatforms = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authAPI.platforms();
      setPlatforms(data.platforms);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load platforms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlatforms(); }, [fetchPlatforms]);

  const connect = async (platform) => {
    const { data } = await authAPI.connect(platform);
    // Open the OAuth URL in a popup
    const popup = window.open(data.authUrl, `connect_${platform}`, 'width=600,height=700');

    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer);
          fetchPlatforms(); // Refresh after OAuth completes
          resolve();
        }
      }, 500);
    });
  };

  const disconnect = async (platform) => {
    await authAPI.disconnect(platform);
    setPlatforms((prev) => prev.filter((p) => p.platform !== platform));
  };

  const isConnected = (platform) => platforms.some((p) => p.platform === platform);

  return { platforms, loading, error, connect, disconnect, isConnected, refetch: fetchPlatforms };
}
