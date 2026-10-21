import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

type RefreshSubscriber = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let subscribers: RefreshSubscriber[] = [];

function onRefreshed(token: string) {
  const queue = subscribers;
  subscribers = [];
  queue.forEach(({ resolve }) => resolve(token));
}

function onRefreshFailed(error: unknown) {
  const queue = subscribers;
  subscribers = [];
  queue.forEach(({ reject }) => reject(error));
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribers.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        isRefreshing = false;
        onRefreshed(accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        isRefreshing = false;

        // A failed refresh means the session is dead. Clear the Zustand store,
        // its persisted snapshot, and the middleware cookie before redirecting.
        // Clearing only the token keys leaves the cookie + cached user behind,
        // so /login bounces straight back to /dashboard and the app reload-loops.
        onRefreshFailed(err);
        if (typeof window !== 'undefined') {
          useAuthStore.getState().logout();
          if (!window.location.pathname.startsWith('/login')) {
            window.location.replace('/login');
          }
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);
