import { useState, useEffect, useCallback } from 'react';
import api from '../api/client.js';

export function useTeamKPIs() {
  const [members,     setMembers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error,       setError]       = useState(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/team');
      setMembers(data.members);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const addMember = async (memberData) => {
    const { data } = await api.post('/team', memberData);
    setMembers((prev) => [...prev, data.member]);
    return data.member;
  };

  const updateMember = async (id, memberData) => {
    const { data } = await api.put(`/team/${id}`, memberData);
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, ...data.member } : m));
  };

  const removeMember = async (id) => {
    await api.delete(`/team/${id}`);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const calculateScores = async () => {
    setCalculating(true);
    try {
      await api.post('/team/calculate');
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate scores');
    } finally {
      setCalculating(false);
    }
  };

  const getMemberHistory = async (id) => {
    const { data } = await api.get(`/team/${id}/history`);
    return data.history;
  };

  return {
    members, loading, calculating, error,
    addMember, updateMember, removeMember,
    calculateScores, getMemberHistory,
    refetch: fetchMembers,
  };
}
