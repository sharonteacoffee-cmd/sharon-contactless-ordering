import { useEffect } from 'react';
import { Outlet as RouterOutlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Button,
  Layout,
  Menu,
  Select,
  Space,
  Tag,
  Tooltip,
  type MenuProps,
} from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import {
  BarChart3,
  Bell,
  BellOff,
  BellRing,
  Coffee,
  History,
  Lock,
  LogOut,
  PackageCheck,
  QrCode,
  RefreshCw,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import { IstClockBadge } from '../components/common/IstClockBadge';
import { useCurrentProfileQuery } from '../hooks/useAuthHooks';
import { useDashboardSocket } from '../hooks/useDashboardSocket';
import { useOutletsQuery } from '../hooks/useOutletHooks';
import { useStaffPushNotifications } from '../hooks/useStaffPushNotifications';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';
import { playOrderBellChime, unlockAudioChime } from '../utils/soundChime';

const { Header, Sider, Content } = Layout;

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const user = useDashboardUiStore((state) => state.user);
  const selectedOutletBusinessId = useDashboardUiStore(
    (state) => state.selectedOutletBusinessId,
  );
  const isAudioMuted = useDashboardUiStore((state) => state.isAudioMuted);
  const sidebarCollapsed = useDashboardUiStore(
    (state) => state.sidebarCollapsed,
  );
  const setUserProfile = useDashboardUiStore((state) => state.setUserProfile);
  const setSelectedOutletBusinessId = useDashboardUiStore(
    (state) => state.setSelectedOutletBusinessId,
  );
  const toggleAudioMuted = useDashboardUiStore(
    (state) => state.toggleAudioMuted,
  );
  const setSidebarCollapsed = useDashboardUiStore(
    (state) => state.setSidebarCollapsed,
  );
  const clearSession = useDashboardUiStore((state) => state.clearSession);

  const isMd = user?.role === 'MD';
  const profileQuery = useCurrentProfileQuery(true);
  const outletsQuery = useOutletsQuery(isMd);
  const { isConnected } = useDashboardSocket();
  const {
    uiState: pushUiState,
    label: pushLabel,
    tooltip: pushTooltip,
    isBusy: isPushBusy,
    togglePushAlerts,
    unregisterBeforeLogout,
  } = useStaffPushNotifications();

  useEffect(() => {
    if (profileQuery.data) {
      setUserProfile(profileQuery.data);
    }
  }, [profileQuery.data, setUserProfile]);

  const menuItems: MenuProps['items'] = [
    {
      key: '/kds',
      icon: <UtensilsCrossed className="h-4 w-4" />,
      label: 'Live KDS Board',
    },
    {
      key: '/stock',
      icon: <PackageCheck className="h-4 w-4" />,
      label: 'Stock & Pricing',
    },
    {
      key: '/orders/history',
      icon: <History className="h-4 w-4" />,
      label: 'Order History',
    },
    ...(isMd
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: '/md/overview',
            icon: <BarChart3 className="h-4 w-4" />,
            label: 'MD Overview',
          },
          {
            key: '/md/menu-sync',
            icon: <RefreshCw className="h-4 w-4" />,
            label: 'Website Menu Sync',
          },
          {
            key: '/md/qr-master',
            icon: <QrCode className="h-4 w-4" />,
            label: 'QR Standee Master',
          },
          {
            key: '/md/outlets',
            icon: <Store className="h-4 w-4" />,
            label: 'Outlet Config',
          },
          {
            key: '/md/users',
            icon: <TeamOutlined />,
            label: 'Outlet Users',
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await unregisterBeforeLogout();
    clearSession();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  const handleToggleAudio = async () => {
    await unlockAudioChime();
    const nextMuted = !isAudioMuted;
    toggleAudioMuted();
    if (!nextMuted) {
      await playOrderBellChime(false);
    }
  };

  return (
    <Layout className="min-h-screen bg-brand-cream">
      <Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        width={240}
        theme="dark"
        style={{ backgroundColor: '#1C4C34' }}
        breakpoint="lg"
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/15 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-amber text-brand-black shadow-sm">
            <Coffee className="h-5 w-5" />
          </div>
          {!sidebarCollapsed ? (
            <div className="overflow-hidden">
              <div className="truncate font-display text-sm font-bold text-white">
                Sharon Tea &amp; Coffee
              </div>
              <div className="truncate text-[11px] font-medium text-brand-amber">
                {isMd ? 'MD Operations' : 'Outlet Counter KDS'}
              </div>
            </div>
          ) : null}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => {
            void unlockAudioChime();
            navigate(key);
          }}
          style={{
            backgroundColor: '#1C4C34',
            borderRight: 0,
            paddingTop: 8,
          }}
        />
      </Sider>

      <Layout className="bg-brand-cream">
        <Header
          className="flex h-auto min-h-16 flex-wrap items-center justify-between gap-3 border-b border-brand-border bg-white/95 px-5 py-2.5"
          style={{ lineHeight: 'normal' }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {isMd ? (
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-brand-forest" />
                <Select
                  value={selectedOutletBusinessId ?? 'ALL'}
                  onChange={(value) =>
                    setSelectedOutletBusinessId(value === 'ALL' ? null : value)
                  }
                  loading={outletsQuery.isLoading}
                  style={{ width: 240 }}
                  options={[
                    { label: 'All Outlets (MD View)', value: 'ALL' },
                    ...(outletsQuery.data ?? []).map((outlet) => ({
                      label: `${outlet.name} (${outlet.businessId})`,
                      value: outlet.businessId,
                    })),
                  ]}
                />
              </div>
            ) : (
              <Tag
                color="#1C4C34"
                className="m-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              >
                <Lock className="h-3 w-3" />
                <span>{user?.outletName || user?.outletBusinessId || 'Assigned Branch'}</span>
              </Tag>
            )}

            <IstClockBadge isConnected={isConnected} />
          </div>

          <Space size="middle" wrap>
            <Tooltip title={pushTooltip}>
              <Button
                type={pushUiState === 'PUSH_ON' ? 'primary' : 'default'}
                danger={pushUiState === 'PUSH_BLOCKED'}
                loading={isPushBusy}
                icon={
                  pushUiState === 'PUSH_ON' ? (
                    <BellRing className="h-4 w-4" />
                  ) : pushUiState === 'PUSH_BLOCKED' ? (
                    <BellOff className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )
                }
                onClick={() => void togglePushAlerts()}
              >
                {pushLabel}
              </Button>
            </Tooltip>

            <Tooltip
              title={
                isAudioMuted
                  ? 'Unmute New Order Bell Chime'
                  : 'Mute New Order Bell Chime'
              }
            >
              <Button
                type={isAudioMuted ? 'default' : 'primary'}
                ghost={!isAudioMuted}
                icon={
                  isAudioMuted ? (
                    <BellOff className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )
                }
                onClick={handleToggleAudio}
              >
                {isAudioMuted ? 'Chime Muted' : 'Chime Active'}
              </Button>
            </Tooltip>

            <div className="flex items-center gap-2 rounded-full border border-brand-border bg-brand-cream px-3 py-1">
              <Avatar size="small" style={{ backgroundColor: '#541424' }}>
                {user?.fullName?.slice(0, 1).toUpperCase() || 'S'}
              </Avatar>
              <div className="text-left leading-tight">
                <div className="text-xs font-semibold text-brand-black">
                  {user?.fullName || 'Staff'}
                </div>
                <div className="text-[10px] font-medium text-brand-muted">
                  {user?.role === 'MD' ? 'Managing Director' : 'Outlet Staff'}
                </div>
              </div>
            </div>

            <Button
              danger
              type="text"
              icon={<LogOut className="h-4 w-4" />}
              onClick={() => void handleLogout()}
            >
              Logout
            </Button>
          </Space>
        </Header>

        <Content className="p-4 md:p-6">
          <RouterOutlet />
        </Content>
      </Layout>
    </Layout>
  );
}
