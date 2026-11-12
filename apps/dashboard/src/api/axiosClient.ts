import axios, { type AxiosError } from 'axios';
import type { ApiErrorEnvelope } from '@sharon/shared';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';
import { API_ENDPOINTS } from './endpoints';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:4100/api/v1';

type NavigateHandler = (path: string) => void;

let registeredNavigate: NavigateHandler | null = null;

export function registerNavigationHandler(handler: NavigateHandler): () => void {
  registeredNavigate = handler;
  return () => {
    if (registeredNavigate === handler) {
      registeredNavigate = null;
    }
  };
}

function navigateTo(path: string): void {
  if (window.location.pathname === path) {
    return;
  }
  if (registeredNavigate) {
    registeredNavigate(path);
  } else {
    window.location.assign(path);
  }
}

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = useDashboardUiStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorEnvelope>) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url ?? '';
    const isLoginRequest = requestUrl.includes(API_ENDPOINTS.AUTH.LOGIN);

    if (status === 401 && !isLoginRequest) {
      useDashboardUiStore.getState().clearSession();
      if (window.location.pathname !== '/login') {
        navigateTo('/401');
      }
    } else if (status === 403) {
      navigateTo('/403');
    } else if (status === 503) {
      navigateTo('/503');
    }

    return Promise.reject(error);
  },
);
