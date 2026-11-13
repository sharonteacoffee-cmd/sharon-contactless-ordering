import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Drawer,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Edit, Plus, Settings2, Store, Trash2 } from 'lucide-react';
import {
  createOutletSchema,
  updateOutletFullSchema,
  updateOutletSettingsSchema,
  type CreateOutletInput,
  type UpdateOutletFullInput,
  type UpdateOutletSettingsInput,
} from '@sharon/shared';
import { ImageUpload } from '../components/shared/ImageUpload';
import {
  useCreateOutletMutation,
  useDeleteOutletMutation,
  useOutletsQuery,
  useUpdateOutletMutation,
  useUpdateOutletSettingsMutation,
} from '../hooks/useOutletHooks';
import type { OutletConfig } from '../types/dashboard';
import { extractApiErrorMessage } from '../utils/errorMessage';

export function OutletConfigPage() {
  const outletsQuery = useOutletsQuery(true);
  const createMutation = useCreateOutletMutation();
  const updateFullMutation = useUpdateOutletMutation();
  const updateSettingsMutation = useUpdateOutletSettingsMutation();
  const deleteMutation = useDeleteOutletMutation();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<OutletConfig | null>(null);
  const [configuringOutlet, setConfiguringOutlet] =
    useState<OutletConfig | null>(null);

  // Add Outlet Form
  const addForm = useForm<CreateOutletInput>({
    resolver: zodResolver(createOutletSchema),
    defaultValues: {
      name: '',
      slug: '',
      address: '',
      phone: '',
      imageUrl: null,
      operatingHours: '6:00 AM - 11:00 PM',
      isActive: true,
      isOrderingEnabled: true,
      customerAuthMode: 'DIRECT_GUEST',
      requireCustomerPhone: true,
      requireCustomerName: true,
      paymentProvider: 'DEMO_UPI_INTENT',
      demoAutoVerifyPayment: false,
      upiVpa: 'paytm.s211ne7@pty',
      upiPayeeName: 'MUNISWAMY JOSHVA',
      estimatedPrepTimeMinutes: 5,
    },
  });

  // Edit Full Outlet Form
  const editForm = useForm<UpdateOutletFullInput>({
    resolver: zodResolver(updateOutletFullSchema),
  });

  // Quick Settings Drawer Form
  const quickSettingsForm = useForm<UpdateOutletSettingsInput>({
    resolver: zodResolver(updateOutletSettingsSchema),
  });

  const handleOpenAdd = () => {
    addForm.reset({
      name: '',
      slug: '',
      address: '',
      phone: '',
      imageUrl: null,
      operatingHours: '6:00 AM - 11:00 PM',
      isActive: true,
      isOrderingEnabled: true,
      customerAuthMode: 'DIRECT_GUEST',
      requireCustomerPhone: true,
      requireCustomerName: true,
      paymentProvider: 'DEMO_UPI_INTENT',
      demoAutoVerifyPayment: false,
      upiVpa: 'paytm.s211ne7@pty',
      upiPayeeName: 'MUNISWAMY JOSHVA',
      estimatedPrepTimeMinutes: 5,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (outlet: OutletConfig) => {
    setEditingOutlet(outlet);
    editForm.reset({
      name: outlet.name,
      slug: outlet.slug,
      address: outlet.address,
      phone: outlet.phone,
      imageUrl: outlet.imageUrl ?? null,
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

  const handleOpenQuickSettings = (outlet: OutletConfig) => {
    setConfiguringOutlet(outlet);
    quickSettingsForm.reset({
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

  const onAddSubmit = async (values: CreateOutletInput) => {
    try {
      const created = await createMutation.mutateAsync(values);
      message.success(`Outlet "${created.name}" created successfully!`);
      setIsAddModalOpen(false);
      addForm.reset();
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to create outlet.'),
      );
    }
  };

  const onEditSubmit = async (values: UpdateOutletFullInput) => {
    if (!editingOutlet) return;
    try {
      await updateFullMutation.mutateAsync({
        outletBusinessId: editingOutlet.businessId,
        payload: values,
      });
      message.success(`Updated outlet "${editingOutlet.name}" successfully!`);
      setEditingOutlet(null);
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to update outlet.'),
      );
    }
  };

  const onQuickSettingsSubmit = async (values: UpdateOutletSettingsInput) => {
    if (!configuringOutlet) return;
    try {
      await updateSettingsMutation.mutateAsync({
        outletBusinessId: configuringOutlet.businessId,
        payload: values,
      });
      message.success(`Saved settings for ${configuringOutlet.name}`);
      setConfiguringOutlet(null);
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to update outlet settings.'),
      );
    }
  };

  const handleDelete = async (outlet: OutletConfig) => {
    try {
      const res = await deleteMutation.mutateAsync(outlet.businessId);
      message.success(
        res.deleted
          ? `Outlet ${outlet.name} deleted successfully.`
          : `Outlet ${outlet.name} deactivated safely (order history preserved).`,
      );
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to delete outlet.'),
      );
    }
  };

  const columns: ColumnsType<OutletConfig> = [
    {
      title: 'Storefront',
      key: 'image',
      width: 80,
      render: (_, record) =>
        record.imageUrl ? (
          <Image
            src={record.imageUrl}
            alt={record.name}
            width={48}
            height={48}
            className="rounded-lg object-cover"
            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><rect width='48' height='48' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='8'>Shop</text></svg>"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-brand-border bg-brand-cream/60 text-brand-forest">
            <Store className="h-5 w-5 opacity-70" />
          </div>
        ),
    },
    {
      title: 'Branch & Details',
      key: 'name',
      render: (_, record) => (
        <div>
          <div className="font-semibold text-brand-black flex items-center gap-2">
            {record.name}
            {!record.isActive && (
              <Tag color="default" className="text-[10px]">
                Inactive
              </Tag>
            )}
          </div>
          <div className="text-xs text-brand-muted">
            <span className="font-mono text-brand-forest font-semibold">
              {record.businessId}
            </span>{' '}
            • /{record.slug}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
            {record.address} • {record.phone}
          </div>
        </div>
      ),
    },
    {
      title: 'Ordering',
      dataIndex: 'isOrderingEnabled',
      key: 'isOrderingEnabled',
      width: 110,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? 'Enabled' : 'Paused'}
        </Tag>
      ),
    },
    {
      title: 'Payment & UPI',
      dataIndex: 'paymentProvider',
      key: 'paymentProvider',
      width: 200,
      render: (provider: string, record) => (
        <div className="space-y-0.5">
          <Tag color="purple">{provider}</Tag>
          <div className="text-[11px] font-mono text-gray-500">
            {record.upiVpa}
          </div>
          {record.demoAutoVerifyPayment && (
            <Tag color="gold" className="text-[10px]">
              Auto-Verify
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Auth Mode',
      dataIndex: 'customerAuthMode',
      key: 'customerAuthMode',
      width: 130,
      render: (mode: string) => <Tag color="blue">{mode}</Tag>,
    },
    {
      title: 'Actions',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<Edit className="h-3.5 w-3.5" />}
            onClick={() => handleOpenEdit(record)}
          >
            Edit
          </Button>
          <Tooltip title="Quick payment and pause settings">
            <Button
              type="default"
              size="small"
              icon={<Settings2 className="h-3.5 w-3.5" />}
              onClick={() => handleOpenQuickSettings(record)}
            >
              Config
            </Button>
          </Tooltip>
          <Popconfirm
            title={`Delete outlet "${record.name}"?`}
            description="If historical orders exist, the outlet will be safely deactivated."
            okText="Yes, Proceed"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button
              danger
              size="small"
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-bold text-brand-black">
            Outlet Management &amp; Configuration
          </h1>
          <p className="m-0 text-xs text-brand-muted">
            Create new tea stalls, manage storefront photos on S3, configure
            UPI VPAs, and toggle ordering status.
          </p>
        </div>
        <Button
          type="primary"
          icon={<Plus className="h-4 w-4" />}
          className="bg-brand-forest hover:bg-brand-forest/90 font-semibold h-10 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
          onClick={handleOpenAdd}
        >
          Add Outlet
        </Button>
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
          scroll={{ x: 950 }}
        />
      </Card>

      {/* =========================================================================
          ADD OUTLET MODAL
         ========================================================================= */}
      <Modal
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-lg font-bold text-brand-forest">
            <Store className="h-5 w-5" />
            <span>Create New Sharon Outlet</span>
          </div>
        }
        footer={null}
        width={680}
        destroyOnClose
      >
        <form
          onSubmit={addForm.handleSubmit(onAddSubmit)}
          className="space-y-4 pt-2"
        >
          {/* Storefront Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-brand-black mb-1.5">
              Storefront / Outlet Photo (Uploaded to S3)
            </label>
            <Controller
              control={addForm.control}
              name="imageUrl"
              render={({ field }) => (
                <ImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  aspectRatioLabel="Recommended: 16:9 or 4:3 exterior photo (max 10MB)"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Outlet Name *
              </label>
              <Controller
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="e.g. Sharon Indiranagar Flagship"
                  />
                )}
              />
              {addForm.formState.errors.name && (
                <div className="text-[11px] text-red-500 mt-0.5">
                  {addForm.formState.errors.name.message}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                URL Slug (Optional, auto-generated)
              </label>
              <Controller
                control={addForm.control}
                name="slug"
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="e.g. indiranagar"
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Phone Number *
              </label>
              <Controller
                control={addForm.control}
                name="phone"
                render={({ field }) => (
                  <Input {...field} placeholder="+91 99169 99209" />
                )}
              />
              {addForm.formState.errors.phone && (
                <div className="text-[11px] text-red-500 mt-0.5">
                  {addForm.formState.errors.phone.message}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Operating Hours
              </label>
              <Controller
                control={addForm.control}
                name="operatingHours"
                render={({ field }) => (
                  <Input {...field} placeholder="6:00 AM - 11:00 PM" />
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-black mb-1">
              Complete Address *
            </label>
            <Controller
              control={addForm.control}
              name="address"
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  rows={2}
                  placeholder="Street address, locality, landmark, Bengaluru"
                />
              )}
            />
            {addForm.formState.errors.address && (
              <div className="text-[11px] text-red-500 mt-0.5">
                {addForm.formState.errors.address.message}
              </div>
            )}
          </div>

          {/* Payment & UPI */}
          <div className="p-3.5 rounded-xl border border-brand-border bg-brand-cream/60 space-y-3">
            <div className="text-xs font-bold text-brand-forest uppercase tracking-wider">
              Payment &amp; UPI Configuration
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1">
                  UPI VPA (Virtual Payment Address)
                </label>
                <Controller
                  control={addForm.control}
                  name="upiVpa"
                  render={({ field }) => (
                    <Input {...field} placeholder="paytm.s211ne7@pty" />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1">
                  UPI Payee Name (Shown in GPay/PhonePe)
                </label>
                <Controller
                  control={addForm.control}
                  name="upiPayeeName"
                  render={({ field }) => (
                    <Input {...field} placeholder="MUNISWAMY JOSHVA" />
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1">
                  Payment Gateway
                </label>
                <Controller
                  control={addForm.control}
                  name="paymentProvider"
                  render={({ field }) => (
                    <Select
                      {...field}
                      className="w-full"
                      options={[
                        { label: 'Demo UPI Pilot', value: 'DEMO_UPI_INTENT' },
                        { label: 'Razorpay', value: 'RAZORPAY' },
                        { label: 'Cashfree', value: 'CASHFREE' },
                      ]}
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1">
                  Customer Auth
                </label>
                <Controller
                  control={addForm.control}
                  name="customerAuthMode"
                  render={({ field }) => (
                    <Select
                      {...field}
                      className="w-full"
                      options={[
                        { label: 'Direct Guest', value: 'DIRECT_GUEST' },
                        { label: 'OTP Verified', value: 'OTP_VERIFIED' },
                      ]}
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1">
                  Estimated Prep (Mins)
                </label>
                <Controller
                  control={addForm.control}
                  name="estimatedPrepTimeMinutes"
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      min={1}
                      max={120}
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-brand-border">
            <Button onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending}
              className="bg-brand-forest hover:bg-brand-forest/90"
            >
              Create Outlet
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          EDIT OUTLET MODAL (FULL CRUD)
         ========================================================================= */}
      <Modal
        open={Boolean(editingOutlet)}
        onCancel={() => setEditingOutlet(null)}
        title={
          <div className="flex items-center gap-2 text-lg font-bold text-brand-forest">
            <Edit className="h-5 w-5" />
            <span>
              Edit Outlet: {editingOutlet?.name} ({editingOutlet?.businessId})
            </span>
          </div>
        }
        footer={null}
        width={680}
        destroyOnClose
      >
        <form
          onSubmit={editForm.handleSubmit(onEditSubmit)}
          className="space-y-4 pt-2"
        >
          {/* Storefront Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-brand-black mb-1.5">
              Storefront / Outlet Photo (Uploaded to S3)
            </label>
            <Controller
              control={editForm.control}
              name="imageUrl"
              render={({ field }) => (
                <ImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  aspectRatioLabel="Recommended: 16:9 or 4:3 exterior photo (max 10MB)"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Outlet Name *
              </label>
              <Controller
                control={editForm.control}
                name="name"
                render={({ field }) => <Input {...field} />}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Slug
              </label>
              <Controller
                control={editForm.control}
                name="slug"
                render={({ field }) => <Input {...field} />}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Phone Number *
              </label>
              <Controller
                control={editForm.control}
                name="phone"
                render={({ field }) => <Input {...field} />}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Operating Hours
              </label>
              <Controller
                control={editForm.control}
                name="operatingHours"
                render={({ field }) => <Input {...field} />}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-black mb-1">
              Address *
            </label>
            <Controller
              control={editForm.control}
              name="address"
              render={({ field }) => <Input.TextArea {...field} rows={2} />}
            />
          </div>

          {/* Payment & UPI */}
          <div className="p-3.5 rounded-xl border border-brand-border bg-brand-cream/60 space-y-3">
            <div className="text-xs font-bold text-brand-forest uppercase tracking-wider">
              Payment &amp; Operational Controls
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1">
                  UPI VPA
                </label>
                <Controller
                  control={editForm.control}
                  name="upiVpa"
                  render={({ field }) => <Input {...field} />}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1">
                  UPI Payee Name
                </label>
                <Controller
                  control={editForm.control}
                  name="upiPayeeName"
                  render={({ field }) => <Input {...field} />}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1">
                  Payment Gateway
                </label>
                <Controller
                  control={editForm.control}
                  name="paymentProvider"
                  render={({ field }) => (
                    <Select
                      {...field}
                      className="w-full"
                      options={[
                        { label: 'Demo UPI Pilot', value: 'DEMO_UPI_INTENT' },
                        { label: 'Razorpay', value: 'RAZORPAY' },
                        { label: 'Cashfree', value: 'CASHFREE' },
                      ]}
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1">
                  Customer Auth
                </label>
                <Controller
                  control={editForm.control}
                  name="customerAuthMode"
                  render={({ field }) => (
                    <Select
                      {...field}
                      className="w-full"
                      options={[
                        { label: 'Direct Guest', value: 'DIRECT_GUEST' },
                        { label: 'OTP Verified', value: 'OTP_VERIFIED' },
                      ]}
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1">
                  Estimated Prep (Mins)
                </label>
                <Controller
                  control={editForm.control}
                  name="estimatedPrepTimeMinutes"
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      min={1}
                      max={120}
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center justify-between border border-brand-border rounded-lg p-2 bg-white">
                <span className="text-xs font-semibold">Active</span>
                <Controller
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      size="small"
                    />
                  )}
                />
              </div>
              <div className="flex items-center justify-between border border-brand-border rounded-lg p-2 bg-white">
                <span className="text-xs font-semibold">Ordering</span>
                <Controller
                  control={editForm.control}
                  name="isOrderingEnabled"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      size="small"
                    />
                  )}
                />
              </div>
              <div className="flex items-center justify-between border border-brand-border rounded-lg p-2 bg-white">
                <span className="text-xs font-semibold">Auto-Verify</span>
                <Controller
                  control={editForm.control}
                  name="demoAutoVerifyPayment"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      size="small"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-brand-border">
            <Button onClick={() => setEditingOutlet(null)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateFullMutation.isPending}
              className="bg-brand-forest hover:bg-brand-forest/90"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          QUICK CONFIG DRAWER
         ========================================================================= */}
      <Drawer
        open={Boolean(configuringOutlet)}
        onClose={() => setConfiguringOutlet(null)}
        width={440}
        title={
          configuringOutlet
            ? `Quick Config: ${configuringOutlet.name}`
            : 'Configure Outlet'
        }
      >
        <form
          onSubmit={quickSettingsForm.handleSubmit(onQuickSettingsSubmit)}
          className="space-y-4"
        >
          <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-cream p-3">
            <div>
              <div className="text-sm font-semibold text-brand-black">
                Ordering Enabled
              </div>
              <div className="text-xs text-brand-muted">
                Disable to pause QR orders
              </div>
            </div>
            <Controller
              control={quickSettingsForm.control}
              name="isOrderingEnabled"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  className="bg-gray-300"
                />
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-cream p-3">
            <div>
              <div className="text-sm font-semibold text-brand-black">
                Boardroom Auto-Verify
              </div>
              <div className="text-xs text-brand-muted">
                Auto-mark demo orders as paid
              </div>
            </div>
            <Controller
              control={quickSettingsForm.control}
              name="demoAutoVerifyPayment"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  className="bg-gray-300"
                />
              )}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-black mb-1">
              Payment Provider
            </label>
            <Controller
              control={quickSettingsForm.control}
              name="paymentProvider"
              render={({ field }) => (
                <Select
                  {...field}
                  className="w-full"
                  options={[
                    { label: 'Demo UPI Pilot', value: 'DEMO_UPI_INTENT' },
                    { label: 'Razorpay', value: 'RAZORPAY' },
                    { label: 'Cashfree', value: 'CASHFREE' },
                  ]}
                />
              )}
            />
          </div>

          <div className="pt-2">
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={updateSettingsMutation.isPending}
              className="bg-brand-forest hover:bg-brand-forest/90 font-semibold"
            >
              Save Settings
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
