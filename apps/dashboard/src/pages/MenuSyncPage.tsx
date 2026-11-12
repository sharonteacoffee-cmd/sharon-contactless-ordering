import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Modal,
  Row,
  Statistic,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';
import {
  formatISTDateTime,
  type MenuSyncMode,
  type MenuSyncPreviewResult,
} from '@sharon/shared';
import {
  usePreviewMenuSyncMutation,
  useSyncLogsQuery,
  useSyncMenuMutation,
} from '../hooks/useMenuSyncHooks';
import type { MenuSyncLog } from '../types/dashboard';
import { extractApiErrorMessage } from '../utils/errorMessage';

export function MenuSyncPage() {
  const syncLogsQuery = useSyncLogsQuery(true);
  const previewMutation = usePreviewMenuSyncMutation();
  const syncMenuMutation = useSyncMenuMutation();

  const [previewData, setPreviewData] = useState<MenuSyncPreviewResult | null>(
    null,
  );
  const [activeSyncMode, setActiveSyncMode] = useState<MenuSyncMode | null>(
    null,
  );

  const handleOpenPreview = async () => {
    try {
      const preview = await previewMutation.mutateAsync();
      setPreviewData(preview);
    } catch (error) {
      message.error(
        extractApiErrorMessage(
          error,
          'Failed to fetch menu sync preview from main website.',
        ),
      );
    }
  };

  const handleConfirmSync = async (syncMode: MenuSyncMode) => {
    try {
      setActiveSyncMode(syncMode);
      const result = await syncMenuMutation.mutateAsync({ syncMode });
      setPreviewData(null);
      message.success(
        `Sync ${result.syncBusinessId} (${syncMode}): ${result.itemsSynced} synced (${result.insertedCount} new, ${result.updatedCount} updated, ${result.deletedCount} deleted, ${result.deduplicatedCount} deduplicated)`,
      );
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to sync menu from main website.'),
      );
    } finally {
      setActiveSyncMode(null);
    }
  };

  const columns: ColumnsType<MenuSyncLog> = [
    {
      title: 'Sync Audit ID',
      dataIndex: 'businessId',
      key: 'businessId',
      width: 170,
      render: (id: string) => (
        <span className="font-bold text-brand-forest tabular-nums">{id}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={status === 'SUCCESS' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: 'Items Synced',
      dataIndex: 'itemsSynced',
      key: 'itemsSynced',
      width: 130,
      render: (count: number) => (
        <span className="font-semibold tabular-nums">{count}</span>
      ),
    },
    {
      title: 'Triggered By',
      key: 'syncedBy',
      width: 180,
      render: (_, record) => record.syncedByName || record.syncedBy || 'MD',
    },
    {
      title: 'Source Endpoint',
      dataIndex: 'sourceUrl',
      key: 'sourceUrl',
      ellipsis: true,
    },
    {
      title: 'Synced At (IST)',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 210,
      render: (utc: string) => (
        <span className="text-xs text-brand-muted tabular-nums">
          {formatISTDateTime(utc)}
        </span>
      ),
    },
  ];

  const isSyncing = syncMenuMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-bold text-brand-black">
            Website Menu Sync Engine
          </h1>
          <p className="m-0 text-xs text-brand-muted">
            Pulls official beverage catalog &amp; S3 imagery via REST from{' '}
            <code>api.sharonteastall.com</code>
          </p>
        </div>

        <Button
          type="primary"
          size="large"
          loading={previewMutation.isPending}
          icon={
            <RefreshCw
              className={`h-4 w-4 ${previewMutation.isPending ? 'animate-spin' : ''}`}
            />
          }
          onClick={handleOpenPreview}
        >
          Sync Menus from Website
        </Button>
      </div>

      {syncMenuMutation.isSuccess ? (
        <Alert
          type="success"
          showIcon
          message={`Sync ${syncMenuMutation.data.syncBusinessId} (${syncMenuMutation.data.syncMode}) completed`}
          description={`Synced ${syncMenuMutation.data.itemsSynced} items across ${syncMenuMutation.data.categoriesSynced} categories — Inserted: ${syncMenuMutation.data.insertedCount}, Updated: ${syncMenuMutation.data.updatedCount}, Deleted: ${syncMenuMutation.data.deletedCount}, Deduplicated: ${syncMenuMutation.data.deduplicatedCount}.`}
        />
      ) : null}

      {syncLogsQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load menu sync audit logs"
          description={extractApiErrorMessage(syncLogsQuery.error)}
        />
      ) : null}

      <Card
        title="Sync Audit History (SYNC...)"
        className="rounded-2xl border border-brand-border shadow-soft"
      >
        <Table<MenuSyncLog>
          rowKey="businessId"
          loading={syncLogsQuery.isLoading}
          columns={columns}
          dataSource={syncLogsQuery.data ?? []}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 860 }}
        />
      </Card>

      <Modal
        open={Boolean(previewData)}
        onCancel={() => {
          if (!isSyncing) setPreviewData(null);
        }}
        closable={!isSyncing}
        maskClosable={!isSyncing}
        footer={null}
        width={720}
        title={
          <div className="flex items-center gap-2 text-brand-forest">
            <RefreshCw className="h-5 w-5" />
            <span>Confirm Website Menu Sync</span>
          </div>
        }
      >
        {previewData ? (
          <div className="mt-3 space-y-4">
            <Alert
              type="info"
              showIcon
              message={`Live Website Catalog: ${previewData.upstreamCount} menus across ${previewData.categoriesCount} categories`}
              description={`Checked at ${formatISTDateTime(previewData.checkedAt)} • Local DB currently has ${previewData.localTotalCount} items.`}
            />

            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6}>
                <Card size="small" className="rounded-xl border-brand-border bg-brand-cream">
                  <Statistic title="Matched" value={previewData.matchedCount} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" className="rounded-xl border-brand-border bg-brand-cream">
                  <Statistic
                    title="New Items"
                    value={previewData.newCount}
                    valueStyle={{ color: '#1C4C34' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" className="rounded-xl border-brand-border bg-brand-cream">
                  <Statistic
                    title="Mismatched"
                    value={previewData.mismatchCount}
                    valueStyle={{
                      color: previewData.mismatchCount > 0 ? '#A44C14' : '#241C24',
                    }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" className="rounded-xl border-brand-border bg-brand-cream">
                  <Statistic
                    title="Stale / Dupes"
                    value={previewData.staleCount + previewData.duplicateCount}
                    valueStyle={{
                      color:
                        previewData.staleCount + previewData.duplicateCount > 0
                          ? '#7C2C0C'
                          : '#241C24',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {previewData.changedItems.length > 0 ? (
              <div className="rounded-xl border border-brand-border bg-white p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-chai">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>
                    Sample Mismatched Items ({previewData.mismatchCount} total)
                  </span>
                </div>
                <div className="max-h-40 space-y-1.5 overflow-y-auto text-xs">
                  {previewData.changedItems.slice(0, 10).map((item, idx) => (
                    <div
                      key={`${item.upstreamSlug}-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-cream px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-brand-muted line-through">
                          {item.localName} (₹{Number(item.localPrice).toFixed(2)})
                        </span>
                        <ArrowRight className="h-3 w-3 text-brand-forest" />
                        <span className="font-semibold text-brand-black">
                          {item.upstreamName} (₹
                          {Number(item.upstreamPrice).toFixed(2)})
                        </span>
                      </div>
                      {item.imageChanged ? (
                        <Tag color="orange" className="m-0 text-[10px]">
                          Image Updated
                        </Tag>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {previewData.staleItems.length > 0 ? (
              <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-rust">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>
                    Stale / Extra Local Items Not on Website (
                    {previewData.staleCount} total)
                  </span>
                </div>
                <div className="max-h-36 space-y-1 overflow-y-auto text-xs">
                  {previewData.staleItems.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md bg-white/80 px-2.5 py-1"
                    >
                      <span className="font-medium text-brand-black">
                        {item.name}{' '}
                        <span className="text-[11px] text-brand-muted">
                          ({item.categorySlug})
                        </span>
                      </span>
                      <span className="font-semibold text-brand-rust tabular-nums">
                        ₹{Number(item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-brand-border bg-brand-cream p-3 text-xs text-brand-muted">
              Choose whether to <strong className="text-brand-black">Delete Existing &amp; Replace</strong> stale/mismatched items with the exact live website catalog, or <strong className="text-brand-black">Keep Existing Extras &amp; Update Matches</strong>.
            </div>

            <div className="flex flex-wrap justify-end gap-2.5 border-t border-brand-border pt-3">
              <Button
                disabled={isSyncing}
                onClick={() => setPreviewData(null)}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                loading={isSyncing && activeSyncMode === 'KEEP_EXISTING'}
                disabled={isSyncing && activeSyncMode !== 'KEEP_EXISTING'}
                icon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => handleConfirmSync('KEEP_EXISTING')}
              >
                Keep Existing Extras &amp; Update Matches
              </Button>
              <Button
                danger
                type="primary"
                loading={isSyncing && activeSyncMode === 'REPLACE_ALL'}
                disabled={isSyncing && activeSyncMode !== 'REPLACE_ALL'}
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => handleConfirmSync('REPLACE_ALL')}
              >
                Delete Existing &amp; Replace All
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
