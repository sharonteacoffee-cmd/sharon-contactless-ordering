import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  OrderPaymentVerifiedSocketEvent,
  OrderStatusUpdatedSocketEvent,
  OrderTrackingInfo,
} from '@sharon/shared';
import { queryKeys } from '@/api/queryKeys';
import { getPublicSocket } from '@/utils/socketClient';

export function useOrderTrackingSocket(orderBusinessId: string | undefined) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState<boolean>(() => getPublicSocket().connected);

  useEffect(() => {
    if (!orderBusinessId) {
      return undefined;
    }

    const socket = getPublicSocket();

    const joinOrderRoom = () => {
      setIsConnected(true);
      socket.emit('join:order', { orderBusinessId });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    if (socket.connected) {
      joinOrderRoom();
    }

    socket.on('connect', joinOrderRoom);
    socket.on('disconnect', handleDisconnect);

    const handleStatusUpdated = (event: OrderStatusUpdatedSocketEvent) => {
      if (event.orderBusinessId !== orderBusinessId) {
        return;
      }

      queryClient.setQueryData<OrderTrackingInfo>(
        queryKeys.publicOrder(orderBusinessId),
        (previous) => {
          if (!previous) {
            return previous;
          }
          return {
            ...previous,
            orderStatus: event.orderStatus,
            paymentStatus: event.paymentStatus,
            updatedAt: event.updatedAt,
          };
        },
      );
    };

    const handlePaymentVerified = (event: OrderPaymentVerifiedSocketEvent) => {
      if (event.orderBusinessId !== orderBusinessId) {
        return;
      }

      queryClient.setQueryData<OrderTrackingInfo>(
        queryKeys.publicOrder(orderBusinessId),
        (previous) => {
          if (!previous) {
            return previous;
          }
          return {
            ...previous,
            paymentStatus: event.paymentStatus,
            orderStatus: event.orderStatus,
            updatedAt: event.verifiedAt,
          };
        },
      );
    };

    socket.on('order:status_updated', handleStatusUpdated);
    socket.on('order:payment_verified', handlePaymentVerified);

    return () => {
      socket.off('connect', joinOrderRoom);
      socket.off('disconnect', handleDisconnect);
      socket.off('order:status_updated', handleStatusUpdated);
      socket.off('order:payment_verified', handlePaymentVerified);
      socket.emit('leave:order', { orderBusinessId });
    };
  }, [orderBusinessId, queryClient]);

  return { isConnected };
}
