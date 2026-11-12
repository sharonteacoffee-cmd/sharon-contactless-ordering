import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Drawer,
  Input,
  InputNumber,
  Select,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Settings2 } from 'lucide-react';
import {
  updateOutletSettingsSchema,
  type UpdateOutletSettingsInput,
} from '@sharon/shared';
import {
  useOutletsQuery,
  useUpdateOutletSettingsMutation,
} from '../hooks/useOutletHooks';
import type { OutletConfig } from '../types/dashboard';
import { extractApiErrorMessage } from '../utils/errorMessage';

export function OutletConfigPage() {
  const outletsQuery = useOutletsQuery(true);
  const updateMutation = useUpdateOutletSettingsMutation();
  const [editingOutlet, setEditingOutlet] = useState<OutletConfig | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateOutletSettingsInput>({
    resolver: zodResolver(updateOutletSettingsSchema),
  });

  const openEditor = (outlet: OutletConfig) => {
    setEditingOutlet(outlet);
    reset({
      name: outlet.name,
      address: outlet.address,
      phone: outlet.phone,
      operatingHours: outlet.operatingHours,
      isActive: outlet.isActive,
      isOrderingEnabled: outlet.isOrderingEnabled,
      customerAuthMode: outlet.customerAuthMode,
      requireCustomerPhone: outlet.requireCustomerPhone,
      requireCustomerName: outlet.requireCustomerName,
      paymentProvider: outlet.paymentProvider,
      demoAutoVerifyPayment: outlet.demoAutoVerifyPayment,
      upiVpa: outlet.upiVpa,
      upiPayeeName: outlet.upiPayeeName,
      estimatedPrepTimeMinutes: outlet.estimatedPrepTimeMinutes,
    });
  };

  const onSubmit = async (values: UpdateOutletSettingsInput) => {
    if (!editingOutlet) return;
    try {
      await updateMutation.mutateAsync({
        outletBusinessId: editingOutlet.businessId,
        payload: values,
      });
      message.success(`Saved settings for ${editingOutlet.name}`);
      setEditingOutlet(null);
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to update outlet settings.'),
      );
    }
  };

  const columns: ColumnsType<OutletConfig> = [
    {
      title: 'Branch',
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
      title: 'Ordering',
      dataIndex: 'isOrderingEnabled',
      key: 'isOrderingEnabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? 'Enabled' : 'Paused'}
        </Tag>
      ),
    },
    {
      title: 'Customer Auth',
      dataIndex: 'customerAuthMode',
      key: 'customerAuthMode',
      render: (mode: string) => <Tag color="blue">{mode}</Tag>,
    },
    {
      title: 'Payment Provider',
      dataIndex: 'paymentProvider',
      key: 'paymentProvider',
      render: (provider: string, record) => (
        <div className="space-y-0.5">
          <Tag color="purple">{provider}</Tag>
          <div className="text-[11px] text-gray-500">{record.upiVpa}</div>
        </div>
      ),
    },
    {
      title: 'Auto-Verify Demo',
      dataIndex: 'demoAutoVerifyPayment',
      key: 'demoAutoVerifyPayment',
      render: (val: boolean) => (
        <Tag color={val ? 'gold' : 'default'}>
          {val ? 'Boardroom Auto' : 'Counter Verify'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<Settings2 className="h-3.5 w-3.5" />}
          onClick={() => openEditor(record)}
        >
          Configure
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="m-0 font-display text-2xl font-bold text-brand-black">
          Outlet Configuration &amp; Payment Mode
        </h1>
        <p className="m-0 text-xs text-brand-muted">
          Switch between Demo UPI Pilot and Razorpay/Cashfree, OTP mode, and
          emergency ordering pause
        </p>
      </div>

      {outletsQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load outlet configuration"
          description={extractApiErrorMessage(outletsQuery.error)}
        />
      ) : null}

      <Card className="rounded-2xl border border-brand-border shadow-soft">
        <Table<OutletConfig>
          rowKey="businessId"
          loading={outletsQuery.isLoading}
          columns={columns}
          dataSource={outletsQuery.data ?? []}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>

      <Drawer
        open={Boolean(editingOutlet)}
        onClose={() => setEditingOutlet(null)}
        width={480}
        title={
          editingOutlet
            ? `Configure ${editingOutlet.name} (${editingOutlet.businessId})`
            : 'Configure Outlet'
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-cream p-3">
            <div>
              <div className="text-sm font-semibold text-brand-black">
                Ordering Enabled
              </div>
              <div className="text-xs text-brand-muted">
                Disable to show “Outlet Temporarily Paused” on QR scan
              </div>
            </div>
            <Controller
              name="isOrderingEnabled"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">
              Customer Auth Mode
            </label>
            <Controller
              name="customerAuthMode"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  className="w-full"
                  options={[
                    { label: 'DIRECT_GUEST (Fast Checkout)', value: 'DIRECT_GUEST' },
                    { label: 'OTP_VERIFIED (Mobile OTP)', value: 'OTP_VERIFIED' },
                  ]}
                />
              )}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">
              Payment Provider
            </label>
            <Controller
              name="paymentProvider"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  className="w-full"
                  options={[
                    {
                      label: 'DEMO_UPI_INTENT (Small-Shop UPI / Dynamic QR)',
                      value: 'DEMO_UPI_INTENT',
                    },
                    { label: 'RAZORPAY (Production Webhook)', value: 'RAZORPAY' },
                    { label: 'CASHFREE (Production Webhook)', value: 'CASHFREE' },
                  ]}
                />
              )}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">
              Outlet UPI VPA (pa)
            </label>
            <Controller
              name="upiVpa"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="paytm.s211ne7@pty" />
              )}
            />
            {errors.upiVpa ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.upiVpa.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">
              UPI Payee Name (pn)
            </label>
            <Controller
              name="upiPayeeName"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="MUNISWAMY JOSHVA" />
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-cream p-3">
            <div>
              <div className="text-sm font-semibold text-brand-black">
                Demo Auto-Verify Payment
              </div>
              <div className="text-xs text-brand-muted">
                Keep OFF for real counter verification; ON for boardroom showcase
              </div>
            </div>
            <Controller
              name="demoAutoVerifyPayment"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-xl border border-brand-border p-2.5">
              <span className="text-xs font-medium">Require Name</span>
              <Controller
                name="requireCustomerName"
                control={control}
                render={({ field }) => (
                  <Switch
                    size="small"
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-brand-border p-2.5">
              <span className="text-xs font-medium">Require Phone</span>
              <Controller
                name="requireCustomerPhone"
                control={control}
                render={({ field }) => (
                  <Switch
                    size="small"
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">
              Estimated Prep Time (Minutes)
            </label>
            <Controller
              name="estimatedPrepTimeMinutes"
              control={control}
              render={({ field }) => (
                <InputNumber
                  min={1}
                  max={180}
                  value={field.value}
                  onChange={(val) => field.onChange(val ?? 5)}
                  className="w-full"
                />
              )}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
            <Button onClick={() => setEditingOutlet(null)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateMutation.isPending}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
