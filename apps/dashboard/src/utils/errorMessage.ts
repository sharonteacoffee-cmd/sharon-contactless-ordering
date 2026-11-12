import axios from 'axios';
import type { ApiErrorEnvelope } from '@sharon/shared';

export function extractApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError<ApiErrorEnvelope>(error)) {
    const serverMessage = error.response?.data?.error?.message;
    if (serverMessage && typeof serverMessage === 'string') {
      return serverMessage;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
