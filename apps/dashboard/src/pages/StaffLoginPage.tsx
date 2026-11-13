import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Input, Typography } from 'antd';
import { Lock, Mail } from 'lucide-react';
import { staffLoginSchema, type StaffLoginInput } from '@sharon/shared';
import { SharonLogo } from '../components/common/SharonLogo';
import { useStaffLoginMutation } from '../hooks/useAuthHooks';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { unlockAudioChime } from '../utils/soundChime';

const { Title, Text } = Typography;

export function StaffLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useDashboardUiStore((state) => state.token);
  const user = useDashboardUiStore((state) => state.user);
  const loginMutation = useStaffLoginMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffLoginInput>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (token && user) {
    return <Navigate to="/kds" replace />;
  }

  const fromPath =
    (location.state as { from?: string } | null)?.from || '/kds';

  const onSubmit = async (values: StaffLoginInput) => {
    await unlockAudioChime();
    try {
      await loginMutation.mutateAsync(values);
      navigate(fromPath === '/login' ? '/kds' : fromPath, { replace: true });
    } catch {
      // Error surfaced cleanly via loginMutation.error
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4 py-10">
      <Card
        className="w-full max-w-md rounded-3xl border border-brand-border shadow-elevated"
        styles={{ body: { padding: '36px 32px' } }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3">
            <SharonLogo size="xl" variant="badge" className="shadow-elevated rounded-full ring-4 ring-brand-amber/20" />
          </div>
          <Title level={3} className="m-0 font-display text-brand-black">
            Sharon Tea &amp; Coffee
          </Title>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-wider text-brand-chai">
            Operations &amp; KDS Portal
          </Text>
        </div>

        {loginMutation.isError ? (
          <Alert
            type="error"
            showIcon
            className="mb-4 rounded-xl"
            message={extractApiErrorMessage(
              loginMutation.error,
              'Invalid email or password.',
            )}
          />
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-black">
              Staff / MD Email
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  size="large"
                  type="email"
                  autoComplete="email"
                  placeholder="staff@sharonteastall.com"
                  prefix={<Mail className="h-4 w-4 text-gray-400" />}
                  status={errors.email ? 'error' : undefined}
                />
              )}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-black">
              Password
            </label>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  size="large"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  prefix={<Lock className="h-4 w-4 text-gray-400" />}
                  status={errors.password ? 'error' : undefined}
                />
              )}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loginMutation.isPending}
            className="mt-2 h-11 font-semibold"
          >
            Sign In to KDS Portal
          </Button>
        </form>
      </Card>
    </div>
  );
}
