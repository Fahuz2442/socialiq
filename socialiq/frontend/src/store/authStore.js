import { create } from 'zustand';
import { authAPI } from '../api/client.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem('token', data.token);
      set({ token: data.token, user: data.user, loading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Login failed', loading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authAPI.register({ email, password, name });
      localStorage.setItem('token', data.token);
      set({ token: data.token, user: data.user, loading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Registration failed', loading: false });
      throw err;
    }
  },

  fetchMe: async () => {
    if (!get().token) return;
    try {
      const { data } = await authAPI.me();
      set({ user: data.user });
    } catch {
      set({ user: null, token: null });
      localStorage.removeItem('token');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));
