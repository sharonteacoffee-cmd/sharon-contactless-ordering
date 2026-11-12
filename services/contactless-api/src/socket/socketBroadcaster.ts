import type { Server as SocketIOServer } from 'socket.io';
import type {
  OrderNewSocketEvent,
  OrderPaymentVerifiedSocketEvent,
  OrderStatusUpdatedSocketEvent,
  OutletStockChangedSocketEvent,
  SocketServerToClientEvents,
} from '@sharon/shared';

let ioInstance: SocketIOServer<Record<string, never>, SocketServerToClientEvents> | null = null;

export function setSocketServer(
  io: SocketIOServer<Record<string, never>, SocketServerToClientEvents>,
): void {
  ioInstance = io;
}

export function getSocketServer(): SocketIOServer<
  Record<string, never>,
  SocketServerToClientEvents
> | null {
  return ioInstance;
}

export function emitNewOrder(payload: OrderNewSocketEvent): void {
  if (!ioInstance) return;
  ioInstance.to(`outlet_${payload.outletId}`).to('admin:all').emit('order:new', payload);
}

export function emitOrderStatusUpdated(payload: OrderStatusUpdatedSocketEvent): void {
  if (!ioInstance) return;
  ioInstance
    .to(`order_${payload.orderBusinessId}`)
    .to(`outlet_${payload.outletId}`)
    .to('admin:all')
    .emit('order:status_updated', payload);
}

export function emitOrderPaymentVerified(payload: OrderPaymentVerifiedSocketEvent): void {
  if (!ioInstance) return;
  ioInstance
    .to(`order_${payload.orderBusinessId}`)
    .to(`outlet_${payload.outletId}`)
    .to('admin:all')
    .emit('order:payment_verified', payload);
}

export function emitOutletStockChanged(payload: OutletStockChangedSocketEvent): void {
  if (!ioInstance) return;
  ioInstance
    .to(`outlet_${payload.outletId}`)
    .to(`outlet_slug_${payload.outletSlug}`)
    .to('admin:all')
    .emit('outlet:stock_changed', payload);
}
