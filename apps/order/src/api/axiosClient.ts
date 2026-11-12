import axios, { AxiosError } from 'axios';
import type { ApiErrorDetail, ApiErrorEnvelope, ApiSuccessEnvelope } from '@sharon/shared';
import { useCustomerAuthStore } from '@/stores/useCustomerAuthStore';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ApiErrorDetail[];

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:4100/api/v1';

export const axiosClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = useCustomerAuthStore.getState().customerAccessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url ?? '';
      if (
        requestUrl.includes('/Public/Customer/GetMy') ||
        requestUrl.includes('/Public/Customer/UpdateMy')
      ) {
        useCustomerAuthStore.getState().clearSession();
      }
    }
    return Promise.reject(error);
  },
);

export function toApiClientError(err: unknown): ApiClientError {
  if (err instanceof ApiClientError) {
    return err;
  }

  if (err instanceof AxiosError) {
    const statusCode = err.response?.status ?? 0;
    const body = err.response?.data as Partial<ApiErrorEnvelope> | undefined;

    if (body?.error?.message) {
      return new ApiClientError(
        body.error.message,
        statusCode,
        body.error.code || 'API_ERROR',
        body.error.details,
      );
    }

    if (statusCode === 503 || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
      return new ApiClientError(
        'Our ordering counter is temporarily unreachable. Please check your connection or try again shortly.',
        statusCode || 503,
        'SERVICE_UNAVAILABLE',
      );
    }

    return new ApiClientError(
      err.message || 'Something went wrong. Please try again.',
      statusCode || 500,
      'REQUEST_FAILED',
    );
  }

  if (err instanceof Error) {
    return new ApiClientError(err.message, 500, 'UNKNOWN_ERROR');
  }

  return new ApiClientError('Something went wrong. Please try again.', 500, 'UNKNOWN_ERROR');
}

export async function unwrapApiGet<T>(
  url: string,
  params?: Record<string, string | undefined>,
): Promise<T> {
  try {
    const response = await axiosClient.get<ApiSuccessEnvelope<T>>(url, { params });
    return response.data.data;
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function unwrapApiPost<TResponse, TPayload = unknown>(
  url: string,
  payload: TPayload,
): Promise<TResponse> {
  try {
    const response = await axiosClient.post<ApiSuccessEnvelope<TResponse>>(url, payload);
    return response.data.data;
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function unwrapApiPut<TResponse, TPayload = unknown>(
  url: string,
  payload: TPayload,
): Promise<TResponse> {
  try {
    const response = await axiosClient.put<ApiSuccessEnvelope<TResponse>>(url, payload);
    return response.data.data;
  } catch (err) {
    throw toApiClientError(err);
  }
}
