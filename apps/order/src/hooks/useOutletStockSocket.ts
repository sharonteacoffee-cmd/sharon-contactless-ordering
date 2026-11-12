import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { OutletStockChangedSocketEvent } from '@sharon/shared';
import { queryKeys } from '@/api/queryKeys';
import type { PublicMenuResponse } from '@/types/order';
import { getPublicSocket } from '@/utils/socketClient';

export function useOutletStockSocket(outletSlug: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!outletSlug) {
      return undefined;
    }

    const socket = getPublicSocket();

    const joinOutletRoom = () => {
      socket.emit('join:outlet_public', { outletSlug });
    };

    if (socket.connected) {
      joinOutletRoom();
    }
    socket.on('connect', joinOutletRoom);

    const handleStockChanged = (event: OutletStockChangedSocketEvent) => {
      if (event.outletSlug !== outletSlug) {
        return;
      }

      queryClient.setQueryData<PublicMenuResponse>(
        queryKeys.publicMenu(outletSlug),
        (previous) => {
          if (!previous) {
            return previous;
          }

          const updateList = <T extends { id: string; isAvailable: boolean; price: number }>(
            list: T[],
          ): T[] =>
            list.map((item) =>
              item.id === event.menuItemId
                ? {
                    ...item,
                    isAvailable: event.isAvailable,
                    price: event.customPrice ?? item.price,
                  }
                : item,
            );

          return {
            ...previous,
            items: updateList(previous.items),
            upsellItems: previous.upsellItems ? updateList(previous.upsellItems) : undefined,
          };
        },
      );
    };

    socket.on('outlet:stock_changed', handleStockChanged);

    return () => {
      socket.off('connect', joinOutletRoom);
      socket.off('outlet:stock_changed', handleStockChanged);
      socket.emit('leave:outlet_public', { outletSlug });
    };
  }, [outletSlug, queryClient]);
}
