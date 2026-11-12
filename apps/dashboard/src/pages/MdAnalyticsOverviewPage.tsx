import { useMemo } from 'react';
import { Alert, Card, Col, Row, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Activity, IndianRupee, QrCode, Store } from 'lucide-react';
import {
  useLiveOrdersQuery,
  useOrderHistoryQuery,
} from '../hooks/useOrderHooks';
import { useOutletsQuery } from '../hooks/useOutletHooks';
import { useQrCodesQuery } from '../hooks/useQrMasterHooks';
import type { OutletConfig } from '../types/dashboard';
import { extractApiErrorMessage } from '../utils/errorMessage';

export function MdAnalyticsOverviewPage() {
  const outletsQuery = useOutletsQuery(true);
  const liveOrdersQuery = useLiveOrdersQuery(null);
  const historyQuery = useOrderHistoryQuery({ page: 1, limit: 50 });
  const qrCodesQuery = useQrCodesQuery(true);

  const outlets = outletsQuery.data ?? [];
  const liveOrders = liveOrdersQuery.data ?? [];
  const historyOrders = historyQuery.data?.items ?? [];
  const qrCodes = qrCodesQuery.data ?? [];

  const metrics = useMemo(() => {
    const activeOutlets = outlets.filter((o) => o.isOrderingEnabled).length;
    const totalScans = qrCodes.reduce((acc, qr) => acc + (qr.scansCount || 0), 0);
    const verifiedRevenue = historyOrders
      .filter((o) => o.paymentStatus === 'PAID_VERIFIED')
      .reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);
    const pendingUpiClaims = liveOrders.filter(
      (o) => o.paymentStatus === 'UPI_CLAIMED_DEMO',
    ).length;

    return {
      totalOutlets: outlets.length,
      activeOutlets,
      liveQueueCount: liveOrders.length,
      pendingUpiClaims,
      verifiedRevenue,
      totalOrdersCount: historyQuery.data?.pagination?.total ?? historyOrders.length,
      totalScans,
    };
  }, [outlets, liveOrders, historyOrders, historyQuery.data?.pagination?.total, qrCodes]);

  const outletColumns: ColumnsType<OutletConfig> = [
    {
      title: 'Outlet',
      key: 'name',
      render: (_, record) => (
        <div>
          <div className="font-semibold text-brand-black">
            {record.name}
          </div>
          <div className="text-xs text-brand-muted">
            {record.businessId} • /{record.slug}
          </div>
        </div>
      ),
    },
    {
      title: 'Ordering Status',
      dataIndex: 'isOrderingEnabled',
      key: 'isOrderingEnabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? 'Accepting Orders' : 'Paused'}
        </Tag>
      ),
    },
    {
      title: 'Auth Mode',
      dataIndex: 'customerAuthMode',
      key: 'customerAuthMode',
      render: (mode: string) => <Tag color="blue">{mode}</Tag>,
    },
    {
      title: 'Payment Provider',
      dataIndex: 'paymentProvider',
      key: 'paymentProvider',
      render: (provider: string) => <Tag color="purple">{provider}</Tag>,
    },
    {
      title: 'Live Queue',
      key: 'liveQueue',
      render: (_, record) => {
        const count = liveOrders.filter(
          (o) =>
            o.outletId === record.id ||
            o.outletBusinessId === record.businessId,
        ).length;
        return <span className="font-bold tabular-nums">{count}</span>;
      },
    },
  ];

  const anyError =
    outletsQuery.error || liveOrdersQuery.error || historyQuery.error;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="m-0 font-display text-2xl font-bold text-brand-black">
          Managing Director — Multi-Outlet Overview
        </h1>
        <p className="m-0 text-xs text-brand-muted">
          Cross-branch contactless ordering performance &amp; live counter queue
        </p>
      </div>

      {anyError ? (
        <Alert
          type="error"
          showIcon
          message="Some overview metrics failed to load"
          description={extractApiErrorMessage(anyError)}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-2xl border border-brand-border shadow-soft">
            <Statistic
              title="Active Ordering Outlets"
              value={metrics.activeOutlets}
              suffix={`/ ${metrics.totalOutlets}`}
              prefix={<Store className="mr-1 h-4 w-4 text-brand-forest" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-2xl border border-brand-border shadow-soft">
            <Statistic
              title="Live KDS Queue"
              value={metrics.liveQueueCount}
              suffix={
                metrics.pendingUpiClaims > 0
                  ? `(${metrics.pendingUpiClaims} UPI verify)`
                  : undefined
              }
              prefix={<Activity className="mr-1 h-4 w-4 text-brand-amber" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-2xl border border-brand-border shadow-soft">
            <Statistic
              title="Verified Sales (Recent 50)"
              value={metrics.verifiedRevenue}
              precision={2}
              prefix={
                <IndianRupee className="mr-1 h-4 w-4 text-brand-leaf" />
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-2xl border border-brand-border shadow-soft">
            <Statistic
              title="Total QR Scans"
              value={metrics.totalScans}
              prefix={<QrCode className="mr-1 h-4 w-4 text-brand-burgundy" />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Branch Status & Configuration Summary"
        className="rounded-2xl border border-brand-border shadow-soft"
      >
        <Table<OutletConfig>
          rowKey="businessId"
          loading={outletsQuery.isLoading}
          columns={outletColumns}
          dataSource={outlets}
          pagination={false}
          scroll={{ x: 760 }}
        />
      </Card>
    </div>
  );
}
