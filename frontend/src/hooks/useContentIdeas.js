import { useState } from 'react';
import api from '../api/client.js';

export function useContentIdeas() {
  const [ideas, setIdeas]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const generate = async ({ platform, contentType, tone, topic }) => {
    setLoading(true);
    setError(null);
    setIdeas([]);
    try {
      const { data } = await api.post('/ai/ideas', { platform, contentType, tone, topic });
      setIdeas(data.ideas || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate ideas');
    } finally {
      setLoading(false);
    }
  };

  const generateCaption = async ({ hook, platform, tone }) => {
    try {
      const { data } = await api.post('/ai/caption', { hook, platform, tone });
      return data.caption;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to generate caption');
    }
  };

  return { ideas, loading, error, generate, generateCaption };
}
