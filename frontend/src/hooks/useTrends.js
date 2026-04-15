import { useState, useEffect, useCallback } from 'react';
import api from '../api/client.js';

export function useTrends() {
  const [trends, setTrends]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError]     = useState(null);
  const [source, setSource]   = useState(null);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/trends');
      setTrends(data.trends);
      setSource(data.source);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const { data } = await api.post('/trends/sync');
      setTrends(data.trends);
      setSource('fresh');
    } catch (err) {
      setError(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const allTrends = trends
    ? [...(trends.instagram || []), ...(trends.twitter || []), ...(trends.youtube || [])]
    : [];

  return { trends, allTrends, loading, syncing, error, source, sync, refetch: fetchTrends };
}
