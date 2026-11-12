import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import type { SocketServerToClientEvents, StaffRole } from '@sharon/shared';
import { appConfig } from '../config/app.config';
import { authConfig } from '../config/auth.config';
import { setSocketServer } from './socketBroadcaster';

interface SocketAuthPayload {
  userId: string;
  role: StaffRole;
  outletId: string | null;
}

interface SocketAck {
  ok: boolean;
  room?: string;
  error?: string;
}

interface ClientToServerEvents {
  'join:outlet': (
    data: { outletId?: string },
    ack?: (response: SocketAck) => void,
  ) => void;
  'join:outlet_public': (
    data: { outletId?: string; outletSlug?: string },
    ack?: (response: SocketAck) => void,
  ) => void;
  'join:admin': (ack?: (response: SocketAck) => void) => void;
  'join:order': (
    data: { orderBusinessId?: string },
    ack?: (response: SocketAck) => void,
  ) => void;
}

function extractSocketToken(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim().length > 0) {
    return authToken.replace(/^Bearer\s+/i, '').trim();
  }
  const headerAuth = socket.handshake.headers.authorization;
  if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
    return headerAuth.slice('Bearer '.length).trim();
  }
  return null;
}

function verifySocketStaffToken(socket: Socket): SocketAuthPayload | null {
  const token = extractSocketToken(socket);
  if (!token) {
    return null;
  }
  try {
    return jwt.verify(token, authConfig.jwtSecret, {
      algorithms: ['HS256'],
    }) as SocketAuthPayload;
  } catch {
    return null;
  }
}

export function initializeSocketServer(
  httpServer: HttpServer,
): SocketIOServer<ClientToServerEvents, SocketServerToClientEvents> {
  const io = new SocketIOServer<ClientToServerEvents, SocketServerToClientEvents>(httpServer, {
    cors: {
      origin: appConfig.corsAllowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    const staffUser = verifySocketStaffToken(socket);

    // Staff / MD authenticated outlet KDS room
    socket.on('join:outlet', (data, ack) => {
      const targetOutletId = data?.outletId?.trim();
      if (!staffUser) {
        ack?.({ ok: false, error: 'UNAUTHORIZED' });
        return;
      }
      if (!targetOutletId) {
        ack?.({ ok: false, error: 'INVALID_OUTLET_ID' });
        return;
      }
      if (staffUser.role !== 'MD' && staffUser.outletId !== targetOutletId) {
        ack?.({ ok: false, error: 'FORBIDDEN_OUTLET_SCOPE' });
        return;
      }

      const room = `outlet_${targetOutletId}`;
      void socket.join(room);
      ack?.({ ok: true, room });
    });

    // Public customer menu room for real-time stock change pushes (only stock toggles, never orders)
    socket.on('join:outlet_public', (data, ack) => {
      const outletSlug = data?.outletSlug?.trim();
      if (!outletSlug || !/^[a-z0-9-]+$/i.test(outletSlug)) {
        ack?.({ ok: false, error: 'INVALID_OUTLET_SLUG' });
        return;
      }
      const room = `outlet_slug_${outletSlug}`;
      void socket.join(room);
      ack?.({ ok: true, room });
    });

    // MD-only cross-outlet admin room
    socket.on('join:admin', (ack) => {
      if (!staffUser || staffUser.role !== 'MD') {
        ack?.({ ok: false, error: 'FORBIDDEN_ROLE' });
        return;
      }
      void socket.join('admin:all');
      ack?.({ ok: true, room: 'admin:all' });
    });

    // Public customer order tracking room
    socket.on('join:order', (data, ack) => {
      const orderBusinessId = data?.orderBusinessId?.trim();
      if (!orderBusinessId || !/^ORD[A-Z0-9]+$/i.test(orderBusinessId)) {
        ack?.({ ok: false, error: 'INVALID_ORDER_ID' });
        return;
      }
      const room = `order_${orderBusinessId}`;
      void socket.join(room);
      ack?.({ ok: true, room });
    });
  });

  setSocketServer(io as unknown as SocketIOServer<Record<string, never>, SocketServerToClientEvents>);
  return io;
}
