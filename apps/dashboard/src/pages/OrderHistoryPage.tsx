import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Download, Search } from 'lucide-react';
import {
  formatISTDateTime,
  type ContactlessOrder,
  type OrderStatus,
  type PaymentStatus,
} from '@sharon/shared';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../components/common/StatusBadge';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useOrderHistoryQuery } from '../hooks/useOrderHooks';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';
import { extractApiErrorMessage } from '../utils/errorMessage';

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = String(value ?? '');
  const trimmed = raw.trimStart();
  const neutralized = /^[=+\-@\t\r]/.test(raw) || /^[=+\-@\t\r]/.test(trimmed)
    ? `'${raw}`
    : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function OrderHistoryPage() {
  const user = useDashboardUiStore((state) => state.user);
  const selectedOutletBusinessId = useDashboardUiStore(
    (state) => state.selectedOutletBusinessId,
  );

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | undefined>();
  const [paymentStatus, setPaymentStatus] = useState<
    PaymentStatus | undefined
  >();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const effectiveOutletBusinessId =
    user?.role === 'OUTLET_STAFF'
      ? user.outletBusinessId
      : selectedOutletBusinessId;

  const historyQuery = useOrderHistoryQuery({
    page,
    limit,
    outletBusinessId: effectiveOutletBusinessId,
    orderStatus,
    paymentStatus,
    search: debouncedSearch,
  });

  const orders = historyQuery.data?.items ?? [];
  const pagination = historyQuery.data?.pagination;

  const handleExportCsv = () => {
    const header = [
      'Order Token',
      'Order ID',
      'Customer Name',
      'Customer Phone',
      'Total INR',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Placed At (IST)',
    ];
    const rows = orders.map((order) =>
      [
        escapeCsvCell(order.orderNumber),
        escapeCsvCell(order.orderBusinessId),
        escapeCsvCell(order.customerName),
        escapeCsvCell(order.customerPhone),
        escapeCsvCell(Number(order.totalAmount).toFixed(2)),
        escapeCsvCell(order.paymentMethod),
        escapeCsvCell(order.paymentStatus),
        escapeCsvCell(order.orderStatus),
        escapeCsvCell(formatISTDateTime(order.createdAt)),
      ].join(','),
    );
    const csvContent = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sharon-orders-page-${pagination?.page ?? page}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const columns: ColumnsType<ContactlessOrder> = [
    {
      title: 'Token / Order ID',
      key: 'orderNumber',
      width: 170,
      render: (_, record) => (
        <div>
          <div className="font-bold text-brand-forest tabular-nums">
            {record.orderNumber}
          </div>
          <div className="text-[11px] text-brand-muted">
            {record.orderBusinessId}
          </div>
        </div>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 190,
      render: (_, record) => (
        <div>
          <div className="font-medium text-brand-black">
            {record.customerName}
          </div>
          <div className="text-xs text-brand-muted tabular-nums">
            {record.customerPhone}
          </div>
        </div>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items: ContactlessOrder['items']) => (
        <div className="space-y-0.5 text-xs">
          {items.map((item, idx) => (
            <div key={`${item.menuItemId}-${idx}`}>
              {item.quantity} × {item.name}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 110,
      render: (val: number) => (
        <span className="font-bold text-brand-black tabular-nums">
          ₹{Number(val).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Payment',
      key: 'paymentStatus',
      width: 175,
      render: (_, record) => (
        <div className="space-y-1">
          <PaymentStatusBadge
            paymentStatus={record.paymentStatus}
            paymentMethod={record.paymentMethod}
          />
          {record.paymentReference ? (
            <div className="text-[11px] text-brand-muted">
              Ref: {record.paymentReference}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Order Status',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      width: 165,
      render: (status: OrderStatus) => <OrderStatusBadge status={status} />,
    },
    {
      title: 'Placed At (IST)',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 205,
      render: (utc: string) => (
        <span className="text-xs text-brand-muted tabular-nums">
          {formatISTDateTime(utc)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-bold text-brand-black">
            Order History
          </h1>
          <p className="m-0 text-xs text-brand-muted">
            Server-paginated audit log • All timestamps converted from UTC to IST
          </p>
        </div>

        <Button
          className="btn-export-csv"
          disabled={orders.length === 0}
          icon={<Download className="h-4 w-4" />}
          onClick={handleExportCsv}
        >
          Export CSV
        </Button>
      </div>

      {historyQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load order history"
          description={extractApiErrorMessage(historyQuery.error)}
        />
      ) : null}

      <Card className="rounded-2xl border border-brand-border shadow-soft">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            allowClear
            placeholder="Search token (#SH-...), ORD..., name, or phone"
            prefix={<Search className="h-4 w-4 text-gray-400" />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs"
          />

          <Select
            allowClear
            placeholder="Filter Order Status"
            value={orderStatus}
            onChange={(val) => {
              setOrderStatus(val);
              setPage(1);
            }}
            style={{ width: 180 }}
            options={[
              { label: 'RECEIVED', value: 'RECEIVED' },
              { label: 'PREPARING', value: 'PREPARING' },
              { label: 'READY', value: 'READY' },
              { label: 'COMPLETED', value: 'COMPLETED' },
              { label: 'CANCELLED', value: 'CANCELLED' },
            ]}
          />

          <Select
            allowClear
            placeholder="Filter Payment Status"
            value={paymentStatus}
            onChange={(val) => {
              setPaymentStatus(val);
              setPage(1);
            }}
            style={{ width: 200 }}
            options={[
              { label: 'PAYMENT_PENDING', value: 'PAYMENT_PENDING' },
              { label: 'UPI_CLAIMED_DEMO', value: 'UPI_CLAIMED_DEMO' },
              { label: 'PAID_VERIFIED', value: 'PAID_VERIFIED' },
              { label: 'REFUNDED', value: 'REFUNDED' },
            ]}
          />
        </div>

        <Table<ContactlessOrder>
          rowKey="orderBusinessId"
          loading={historyQuery.isLoading || historyQuery.isFetching}
          columns={columns}
          dataSource={orders}
          scroll={{ x: 1000 }}
          pagination={{
            current: pagination?.page ?? page,
            pageSize: pagination?.limit ?? limit,
            total: pagination?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setLimit(nextSize);
            },
          }}
        />
      </Card>
    </div>
  );
}
