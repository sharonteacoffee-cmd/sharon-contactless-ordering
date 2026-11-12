import { io, type Socket } from 'socket.io-client';
import type { SocketServerToClientEvents } from '@sharon/shared';

interface PublicSocketClientToServerEvents {
  'join:order': (payload: { orderBusinessId: string }) => void;
  'leave:order': (payload: { orderBusinessId: string }) => void;
  'join:outlet_public': (payload: { outletSlug: string }) => void;
  'leave:outlet_public': (payload: { outletSlug: string }) => void;
}

export type SharonPublicSocket = Socket<
  SocketServerToClientEvents,
  PublicSocketClientToServerEvents
>;

let socketInstance: SharonPublicSocket | null = null;

function resolveSocketUrl(): string {
  const configured = import.meta.env.VITE_SOCKET_URL?.trim();
  if (configured) {
    return configured;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (apiBase) {
    return apiBase.replace(/\/api\/v1\/?$/, '');
  }
  return 'http://localhost:4100';
}

export function getPublicSocket(): SharonPublicSocket {
  if (!socketInstance) {
    socketInstance = io(resolveSocketUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}
