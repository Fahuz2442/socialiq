import { useState, useEffect, useCallback } from 'react';
import api from '../api/client.js';

export function useSchedule() {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchPosts = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/schedule', { params });
      setPosts(data.posts);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const createPost = async (postData) => {
    const { data } = await api.post('/schedule', postData);
    setPosts((prev) => [...prev, data.post].sort(
      (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
    ));
    return data.post;
  };

  const updatePost = async (id, postData) => {
    const { data } = await api.put(`/schedule/${id}`, postData);
    setPosts((prev) => prev.map((p) => p.id === id ? data.post : p));
    return data.post;
  };

  const cancelPost = async (id) => {
    await api.delete(`/schedule/${id}`);
    setPosts((prev) => prev.map((p) =>
      p.id === id ? { ...p, status: 'cancelled' } : p
    ));
  };

  return { posts, loading, error, createPost, updatePost, cancelPost, refetch: fetchPosts };
}
