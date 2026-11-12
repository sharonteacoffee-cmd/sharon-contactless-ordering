import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Eye, Plus, QrCode } from 'lucide-react';
import {
  formatISTDateTime,
  generateQrSchema,
  type GenerateQrInput,
} from '@sharon/shared';
import { QrStandeeModal } from '../components/domain/QrStandeeModal';
import { useOutletsQuery } from '../hooks/useOutletHooks';
import {
  useGenerateQrMutation,
  useQrCodesQuery,
  useUpdateQrStatusMutation,
} from '../hooks/useQrMasterHooks';
import type { QrCodeRecord } from '../types/dashboard';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { buildQrTargetUrl } from '../utils/qrExport';

export function QrMasterPage() {
  const qrCodesQuery = useQrCodesQuery(true);
  const outletsQuery = useOutletsQuery(true);
  const generateQrMutation = useGenerateQrMutation();
  const updateQrStatusMutation = useUpdateQrStatusMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewQr, setPreviewQr] = useState<QrCodeRecord | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GenerateQrInput>({
    resolver: zodResolver(generateQrSchema),
    defaultValues: {
      outletBusinessId: '',
      label: 'Counter Standee',
    },
  });

  const handleGenerateQr = async (values: GenerateQrInput) => {
    try {
      const created = await generateQrMutation.mutateAsync(values);
      message.success(`Generated QR standee ${created.businessId}`);
      setIsCreateOpen(false);
      reset();
      setPreviewQr(created);
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to generate QR standee.'),
      );
    }
  };

  const handleToggleStatus = async (
    record: QrCodeRecord,
    isActive: boolean,
  ) => {
    try {
      setTogglingId(record.businessId);
      await updateQrStatusMutation.mutateAsync({
        qrBusinessId: record.businessId,
        payload: { isActive },
      });
      message.success(
        `${record.businessId} ${isActive ? 'activated' : 'disabled'}`,
      );
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to update QR status.'),
      );
    } finally {
      setTogglingId(null);
    }
  };

  const columns: ColumnsType<QrCodeRecord> = [
    {
      title: 'QR Business ID',
      dataIndex: 'businessId',
      key: 'businessId',
      width: 150,
      render: (id: string) => (
        <span className="font-bold text-brand-forest tabular-nums">
          {id}
        </span>
      ),
    },
    {
      title: 'Outlet',
      key: 'outlet',
      width: 210,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-brand-black">
            {record.outletName}
          </div>
          <div className="text-xs text-brand-muted">
            {record.outletBusinessId} • /{record.outletSlug}
          </div>
        </div>
      ),
    },
    {
      title: 'Standee Label',
      dataIndex: 'label',
      key: 'label',
      width: 170,
      render: (label: string) => <Tag color="geekblue">{label}</Tag>,
    },
    {
      title: 'Order URL',
      key: 'url',
      ellipsis: true,
      render: (_, record) => (
        <span className="text-xs text-gray-600">
          {buildQrTargetUrl(record)}
        </span>
      ),
    },
    {
      title: 'Scans',
      dataIndex: 'scansCount',
      key: 'scansCount',
      width: 90,
      render: (count: number) => (
        <span className="font-semibold tabular-nums">{count}</span>
      ),
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          loading={togglingId === record.businessId}
          onChange={(checked) => handleToggleStatus(record, checked)}
        />
      ),
    },
    {
      title: 'Created (IST)',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 195,
      render: (utc: string) => (
        <span className="text-xs text-gray-500 tabular-nums">
          {formatISTDateTime(utc)}
        </span>
      ),
    },
    {
      title: 'Standee Export',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<Eye className="h-3.5 w-3.5" />}
          onClick={() => setPreviewQr(record)}
        >
          PNG / PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-bold text-brand-black">
            QR Standee Master
          </h1>
          <p className="m-0 text-xs text-brand-muted">
            Generate branch-scoped QR standees, disable compromised tokens, and
            export print-ready PNG/PDF
          </p>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Generate QR Standee
        </Button>
      </div>

      {qrCodesQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load QR master records"
          description={extractApiErrorMessage(qrCodesQuery.error)}
        />
      ) : null}

      <Card className="rounded-2xl border border-brand-border shadow-soft">
        <Table<QrCodeRecord>
          rowKey="businessId"
          loading={qrCodesQuery.isLoading}
          columns={columns}
          dataSource={qrCodesQuery.data ?? []}
          pagination={{ pageSize: 12 }}
          scroll={{ x: 1080 }}
        />
      </Card>

      <Modal
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-brand-forest">
            <QrCode className="h-5 w-5" />
            <span>Generate New QR Standee</span>
          </div>
        }
      >
        <form
          onSubmit={handleSubmit(handleGenerateQr)}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-black">
              Select Outlet
            </label>
            <Controller
              name="outletBusinessId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  value={field.value || undefined}
                  placeholder="Choose outlet..."
                  className="w-full"
                  loading={outletsQuery.isLoading}
                  options={(outletsQuery.data ?? []).map((o) => ({
                    label: `${o.name} (${o.businessId})`,
                    value: o.businessId,
                  }))}
                />
              )}
            />
            {errors.outletBusinessId ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.outletBusinessId.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-black">
              Standee / Table Label
            </label>
            <Controller
              name="label"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="e.g. Counter Standee, Table 4, Window Pickup"
                />
              )}
            />
            {errors.label ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.label.message}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={generateQrMutation.isPending}
            >
              Create QR Standee
            </Button>
          </div>
        </form>
      </Modal>

      <QrStandeeModal
        qrRecord={previewQr}
        open={Boolean(previewQr)}
        onClose={() => setPreviewQr(null)}
      />
    </div>
  );
}
