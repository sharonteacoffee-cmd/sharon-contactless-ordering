import type { OrderStatus, PaymentMethod, PaymentStatus } from '@sharon/shared';

interface BadgeColors {
  bg: string;
  text: string;
  border: string;
  label: string;
}

const ORDER_STATUS_STYLES: Record<OrderStatus, BadgeColors> = {
  RECEIVED: {
    bg: '#FEF3C7',
    text: '#78350F',
    border: '#FCD34D',
    label: 'Pending',
  },
  PREPARING: {
    bg: '#FFEDD5',
    text: '#7C2D12',
    border: '#FDBA74',
    label: 'Preparing / Brewing',
  },
  READY: {
    bg: '#DCFCE7',
    text: '#14532D',
    border: '#86EFAC',
    label: 'Ready for Pickup',
  },
  COMPLETED: {
    bg: '#F5F5F4',
    text: '#44403C',
    border: '#D6D3D1',
    label: 'Completed',
  },
  CANCELLED: {
    bg: '#FEE2E2',
    text: '#7C2C0C',
    border: '#FCA5A5',
    label: 'Cancelled',
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const style = ORDER_STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
    >
      {style.label}
    </span>
  );
}

export function PaymentStatusBadge({
  paymentStatus,
  paymentMethod,
}: {
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
}) {
  let colors: BadgeColors;

  if (paymentStatus === 'PAID_VERIFIED') {
    colors = {
      bg: '#DCFCE7',
      text: '#15803D',
      border: '#BBF7D0',
      label: 'UPI Paid',
    };
  } else if (paymentStatus === 'UPI_CLAIMED_DEMO') {
    colors = {
      bg: '#FEF3C7',
      text: '#78350F',
      border: '#FCD34D',
      label: 'UPI Claimed • Verify',
    };
  } else if (paymentMethod === 'CASH') {
    colors = {
      bg: '#FEF3C7',
      text: '#92400E',
      border: '#FDE68A',
      label: 'Cash at Counter',
    };
  } else if (paymentStatus === 'REFUNDED') {
    colors = {
      bg: '#FEE2E2',
      text: '#7C2C0C',
      border: '#FCA5A5',
      label: 'Refunded',
    };
  } else {
    colors = {
      bg: '#DBEAFE',
      text: '#1E3A8A',
      border: '#93C5FD',
      label: 'Payment Pending',
    };
  }

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      {colors.label}
    </span>
  );
}
