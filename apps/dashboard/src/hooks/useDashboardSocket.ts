import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { io, type Socket } from 'socket.io-client';
import type {
  OrderNewSocketEvent,
  OrderPaymentVerifiedSocketEvent,
  OrderStatusUpdatedSocketEvent,
  OutletStockChangedSocketEvent,
  SocketServerToClientEvents,
} from '@sharon/shared';
import { dashboardQueryKeys } from '../api/queryKeys';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';
import { playOrderBellChime } from '../utils/soundChime';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:4100';

interface DashboardClientToServerEvents {
  'join:admin': () => void;
  'join:outlet': (payload: { outletId: string }) => void;
}

export function useDashboardSocket() {
  const queryClient = useQueryClient();
  const token = useDashboardUiStore((state) => state.token);
  const user = useDashboardUiStore((state) => state.user);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      setIsConnected(false);
      return;
    }

    const socket: Socket<
      SocketServerToClientEvents,
      DashboardClientToServerEvents
    > = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });

    const joinRooms = () => {
      if (user.role === 'MD') {
        socket.emit('join:admin');
      } else if (user.outletId) {
        socket.emit('join:outlet', { outletId: user.outletId });
      }
    };

    socket.on('connect', () => {
      setIsConnected(true);
      joinRooms();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    socket.on('order:new', (payload: OrderNewSocketEvent) => {
      const { isAudioMuted, selectedOutletBusinessId } =
        useDashboardUiStore.getState();
      const shouldChime =
        user.role !== 'MD' ||
        !selectedOutletBusinessId ||
        selectedOutletBusinessId === payload.outletBusinessId;

      if (shouldChime) {
        void playOrderBellChime(isAudioMuted);
        notification.info({
          message: `New Order ${payload.orderNumber}`,
          description: `${payload.customerName} • ₹${Number(payload.totalAmount).toFixed(2)} (${payload.paymentStatus === 'UPI_CLAIMED_DEMO' ? 'UPI Claimed — Verify at Counter' : payload.paymentStatus})`,
          placement: 'topRight',
          duration: 6,
        });
      }

      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.orders.all,
      });
    });

    socket.on(
      'order:status_updated',
      (_payload: OrderStatusUpdatedSocketEvent) => {
        void queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.orders.all,
        });
      },
    );

    socket.on(
      'order:payment_verified',
      (payload: OrderPaymentVerifiedSocketEvent) => {
        notification.success({
          message: `Payment Verified • ${payload.orderNumber}`,
          description: payload.paymentReference
            ? `Ref: ${payload.paymentReference}`
            : 'Marked PAID_VERIFIED',
          placement: 'topRight',
          duration: 4,
        });
        void queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.orders.all,
        });
      },
    );

    socket.on(
      'outlet:stock_changed',
      (_payload: OutletStockChangedSocketEvent) => {
        void queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.stock.all,
        });
      },
    );

    return () => {
      socket.disconnect();
      setIsConnected(false);
    };
  }, [token, user, queryClient]);

  return { isConnected };
}
