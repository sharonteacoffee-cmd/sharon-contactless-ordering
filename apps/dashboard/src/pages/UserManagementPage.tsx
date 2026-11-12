import { useMemo, useState } from 'react';
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
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { KeyRound, Plus, Search, UserCheck } from 'lucide-react';
import {
  createUserSchema,
  formatISTDateTime,
  updateUserSchema,
  type CreateUserInput,
  type ManagedUserRecord,
  type StaffRole,
  type UpdateUserInput,
} from '@sharon/shared';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useOutletsQuery } from '../hooks/useOutletHooks';
import {
  useCreateManagedUserMutation,
  useManagedUsersQuery,
  useToggleManagedUserStatusMutation,
  useUpdateManagedUserMutation,
} from '../hooks/useUserHooks';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';
import { extractApiErrorMessage } from '../utils/errorMessage';

function isHiddenPlatformAccount(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@novacodex.in');
}

export function UserManagementPage() {
  const currentUser = useDashboardUiStore((state) => state.user);
  const usersQuery = useManagedUsersQuery(true);
  const outletsQuery = useOutletsQuery(true);
  const createMutation = useCreateManagedUserMutation();
  const updateMutation = useUpdateManagedUserMutation();
  const toggleStatusMutation = useToggleManagedUserStatusMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUserRecord | null>(
    null,
  );
  const [togglingBusinessId, setTogglingBusinessId] = useState<string | null>(
    null,
  );

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'OUTLET_STAFF',
      outletBusinessId: undefined,
      password: '',
      isActive: true,
    },
  });

  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: '',
      role: 'OUTLET_STAFF',
      outletBusinessId: null,
      isActive: true,
      password: '',
    },
  });

  const createRole = createForm.watch('role');
  const editRole = editForm.watch('role');

  const visibleUsers = useMemo(() => {
    const safeList = (usersQuery.data ?? []).filter(
      (u) => !isHiddenPlatformAccount(u.email),
    );
    const term = debouncedSearchTerm.trim().toLowerCase();
    if (!term) {
      return safeList;
    }
    return safeList.filter(
      (u) =>
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.businessId.toLowerCase().includes(term) ||
        (u.outletName ?? '').toLowerCase().includes(term),
    );
  }, [usersQuery.data, debouncedSearchTerm]);

  const outletOptions = useMemo(
    () =>
      (outletsQuery.data ?? []).map((o) => ({
        label: `${o.name} (${o.businessId})`,
        value: o.businessId,
      })),
    [outletsQuery.data],
  );

  const openCreateModal = () => {
    createForm.reset({
      fullName: '',
      email: '',
      role: 'OUTLET_STAFF',
      outletBusinessId: outletsQuery.data?.[0]?.businessId ?? undefined,
      password: '',
      isActive: true,
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (record: ManagedUserRecord) => {
    setEditingUser(record);
    editForm.reset({
      fullName: record.fullName,
      role: record.role,
      outletBusinessId: record.outletBusinessId,
      isActive: record.isActive,
      password: '',
    });
  };

  const handleCreateSubmit = async (values: CreateUserInput) => {
    try {
      const payload: CreateUserInput = {
        ...values,
        outletBusinessId:
          values.role === 'MD' ? null : (values.outletBusinessId ?? null),
      };
      const created = await createMutation.mutateAsync(payload);
      message.success(`Created user ${created.fullName} (${created.businessId})`);
      setIsCreateOpen(false);
      createForm.reset();
    } catch (error) {
      message.error(extractApiErrorMessage(error, 'Failed to create user.'));
    }
  };

  const handleEditSubmit = async (values: UpdateUserInput) => {
    if (!editingUser) return;
    try {
      const payload: UpdateUserInput = {
        ...values,
        outletBusinessId:
          values.role === 'MD' ? null : (values.outletBusinessId ?? null),
      };
      const updated = await updateMutation.mutateAsync({
        userBusinessId: editingUser.businessId,
        payload,
      });
      message.success(`Updated ${updated.fullName} (${updated.businessId})`);
      setEditingUser(null);
    } catch (error) {
      message.error(extractApiErrorMessage(error, 'Failed to update user.'));
    }
  };

  const handleToggleStatus = async (
    record: ManagedUserRecord,
    isActive: boolean,
  ) => {
    try {
      setTogglingBusinessId(record.businessId);
      await toggleStatusMutation.mutateAsync({
        userBusinessId: record.businessId,
        payload: { isActive },
      });
      message.success(
        `${record.fullName} ${isActive ? 'activated' : 'deactivated'}`,
      );
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to toggle user status.'),
      );
    } finally {
      setTogglingBusinessId(null);
    }
  };

  const columns: ColumnsType<ManagedUserRecord> = [
    {
      title: 'User ID',
      dataIndex: 'businessId',
      key: 'businessId',
      width: 150,
      render: (id: string) => (
        <span className="font-bold text-brand-forest tabular-nums">{id}</span>
      ),
    },
    {
      title: 'Full Name',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 190,
      render: (name: string, record) => (
        <div className="font-semibold text-brand-black">
          {name}
          {record.businessId === currentUser?.businessId ? (
            <Tag color="green" className="ml-2 text-[10px]">
              You
            </Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 230,
      render: (email: string) => (
        <span className="text-xs text-brand-muted">{email}</span>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (role: StaffRole) => (
        <Tag
          color={role === 'MD' ? '#541424' : '#1C4C34'}
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
        >
          {role}
        </Tag>
      ),
    },
    {
      title: 'Assigned Outlet',
      key: 'outlet',
      width: 210,
      render: (_, record) =>
        record.role === 'MD' ? (
          <span className="text-xs font-medium text-brand-burgundy">
            All Outlets (MD)
          </span>
        ) : (
          <div>
            <div className="text-xs font-medium text-brand-black">
              {record.outletName || 'Unassigned'}
            </div>
            {record.outletBusinessId ? (
              <div className="text-[11px] text-brand-muted">
                {record.outletBusinessId}
              </div>
            ) : null}
          </div>
        ),
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      render: (isActive: boolean, record) => {
        const isSelf = record.businessId === currentUser?.businessId;
        return (
          <Tooltip
            title={
              isSelf
                ? 'Cannot deactivate your own active MD account'
                : undefined
            }
          >
            <Switch
              checked={isActive}
              disabled={isSelf}
              loading={togglingBusinessId === record.businessId}
              onChange={(checked) => handleToggleStatus(record, checked)}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Updated At (IST)',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 200,
      render: (utc: string) => (
        <span className="text-xs text-brand-muted tabular-nums">
          {formatISTDateTime(utc)}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 185,
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<KeyRound className="h-3.5 w-3.5" />}
          onClick={() => openEditModal(record)}
        >
          Edit / Reset Password
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-bold text-brand-black">
            Outlet Staff &amp; User Management
          </h1>
          <p className="m-0 text-xs text-brand-muted">
            Provision outlet counter accounts, assign branches, and reset
            passwords securely
          </p>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<Plus className="h-4 w-4" />}
          onClick={openCreateModal}
        >
          Add Outlet User
        </Button>
      </div>

      {usersQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load managed users"
          description={extractApiErrorMessage(usersQuery.error)}
        />
      ) : null}

      <Card className="rounded-2xl border border-brand-border shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Input
            allowClear
            placeholder="Search by name, email, USR ID, or outlet..."
            prefix={<Search className="h-4 w-4 text-gray-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <span className="text-xs text-brand-muted">
            Showing {visibleUsers.length} user account
            {visibleUsers.length === 1 ? '' : 's'}
          </span>
        </div>

        <Table<ManagedUserRecord>
          rowKey="businessId"
          loading={usersQuery.isLoading}
          columns={columns}
          dataSource={visibleUsers}
          pagination={{ pageSize: 12, showSizeChanger: true }}
          scroll={{ x: 1120 }}
        />
      </Card>

      {/* Add Outlet User Modal */}
      <Modal
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        footer={null}
        width={480}
        title={
          <div className="flex items-center gap-2 text-brand-forest">
            <UserCheck className="h-5 w-5" />
            <span>Add Outlet User</span>
          </div>
        }
      >
        <form
          onSubmit={createForm.handleSubmit(handleCreateSubmit)}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-black">
              Full Name
            </label>
            <Controller
              name="fullName"
              control={createForm.control}
              render={({ field }) => (
                <Input {...field} placeholder="e.g. Indiranagar Counter" />
              )}
            />
            {createForm.formState.errors.fullName ? (
              <p className="mt-1 text-xs text-brand-rust">
                {createForm.formState.errors.fullName.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-black">
              Email Address
            </label>
            <Controller
              name="email"
              control={createForm.control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="email"
                  placeholder="branch@sharonteastall.com"
                />
              )}
            />
            {createForm.formState.errors.email ? (
              <p className="mt-1 text-xs text-brand-rust">
                {createForm.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-black">
                Role
              </label>
              <Controller
                name="role"
                control={createForm.control}
                render={({ field }) => (
                  <Select
                    {...field}
                    className="w-full"
                    options={[
                      { label: 'OUTLET_STAFF', value: 'OUTLET_STAFF' },
                      { label: 'MD (Admin)', value: 'MD' },
                    ]}
                    onChange={(val) => {
                      field.onChange(val);
                      if (val === 'MD') {
                        createForm.setValue('outletBusinessId', null);
                      }
                    }}
                  />
                )}
              />
            </div>

            <div className="flex items-end pb-1">
              <div className="flex w-full items-center justify-between rounded-xl border border-brand-border bg-brand-cream px-3 py-1.5">
                <span className="text-xs font-semibold text-brand-black">
                  Active
                </span>
                <Controller
                  name="isActive"
                  control={createForm.control}
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
          </div>

          {createRole === 'OUTLET_STAFF' ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-black">
                Assigned Outlet
              </label>
              <Controller
                name="outletBusinessId"
                control={createForm.control}
                render={({ field }) => (
                  <Select
                    {...field}
                    value={field.value ?? undefined}
                    placeholder="Select assigned branch..."
                    className="w-full"
                    loading={outletsQuery.isLoading}
                    options={outletOptions}
                  />
                )}
              />
              {createForm.formState.errors.outletBusinessId ? (
                <p className="mt-1 text-xs text-brand-rust">
                  {createForm.formState.errors.outletBusinessId.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-black">
              Initial Password (min 8 characters)
            </label>
            <Controller
              name="password"
              control={createForm.control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  autoComplete="new-password"
                  placeholder="Enter strong password"
                />
              )}
            />
            {createForm.formState.errors.password ? (
              <p className="mt-1 text-xs text-brand-rust">
                {createForm.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-brand-border pt-3">
            <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending}
            >
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit / Reset Password Modal */}
      <Modal
        open={Boolean(editingUser)}
        onCancel={() => setEditingUser(null)}
        footer={null}
        width={480}
        title={
          <div className="flex items-center gap-2 text-brand-forest">
            <KeyRound className="h-5 w-5" />
            <span>
              Edit User {editingUser ? `(${editingUser.businessId})` : ''}
            </span>
          </div>
        }
      >
        {editingUser ? (
          <form
            onSubmit={editForm.handleSubmit(handleEditSubmit)}
            className="mt-4 space-y-4"
          >
            <div className="rounded-xl border border-brand-border bg-brand-cream px-3 py-2 text-xs">
              <span className="font-semibold text-brand-muted">Email: </span>
              <span className="font-medium text-brand-black">
                {editingUser.email}
              </span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-black">
                Full Name
              </label>
              <Controller
                name="fullName"
                control={editForm.control}
                render={({ field }) => <Input {...field} />}
              />
              {editForm.formState.errors.fullName ? (
                <p className="mt-1 text-xs text-brand-rust">
                  {editForm.formState.errors.fullName.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-black">
                  Role
                </label>
                <Controller
                  name="role"
                  control={editForm.control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      className="w-full"
                      options={[
                        { label: 'OUTLET_STAFF', value: 'OUTLET_STAFF' },
                        { label: 'MD (Admin)', value: 'MD' },
                      ]}
                      onChange={(val) => {
                        field.onChange(val);
                        if (val === 'MD') {
                          editForm.setValue('outletBusinessId', null);
                        }
                      }}
                    />
                  )}
                />
              </div>

              <div className="flex items-end pb-1">
                <div className="flex w-full items-center justify-between rounded-xl border border-brand-border bg-brand-cream px-3 py-1.5">
                  <span className="text-xs font-semibold text-brand-black">
                    Active
                  </span>
                  <Controller
                    name="isActive"
                    control={editForm.control}
                    render={({ field }) => (
                      <Switch
                        size="small"
                        disabled={
                          editingUser.businessId === currentUser?.businessId
                        }
                        checked={Boolean(field.value)}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {editRole === 'OUTLET_STAFF' ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-black">
                  Assigned Outlet
                </label>
                <Controller
                  name="outletBusinessId"
                  control={editForm.control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value ?? undefined}
                      placeholder="Select assigned branch..."
                      className="w-full"
                      loading={outletsQuery.isLoading}
                      options={outletOptions}
                    />
                  )}
                />
                {editForm.formState.errors.outletBusinessId ? (
                  <p className="mt-1 text-xs text-brand-rust">
                    {editForm.formState.errors.outletBusinessId.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-black">
                Reset Password (optional — leave blank to keep existing)
              </label>
              <Controller
                name="password"
                control={editForm.control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    value={field.value ?? ''}
                    autoComplete="new-password"
                    placeholder="New password (min 8 chars)"
                  />
                )}
              />
              {editForm.formState.errors.password ? (
                <p className="mt-1 text-xs text-brand-rust">
                  {editForm.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-brand-border pt-3">
              <Button onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
