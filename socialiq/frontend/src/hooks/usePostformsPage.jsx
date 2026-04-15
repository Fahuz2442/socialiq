import { useState, useEffect, useCallback } from 'react';
import { postsAPI } from '../api/client.js';

export function usePostMetrics(params = {}) {
  const [posts, setPosts] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, summaryRes] = await Promise.all([
        postsAPI.list(params),
        postsAPI.summary(),
      ]);
      setPosts(postsRes.data.posts);
      setSummary(summaryRes.data.summary);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const sync = async (platform) => {
    setSyncing(true);
    try {
      if (platform) {
        await postsAPI.syncOne(platform);
      } else {
        await postsAPI.sync();
      }
      await fetchPosts();
    } catch (err) {
      setError(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return { posts, summary, loading, syncing, error, sync, refetch: fetchPosts };
}
