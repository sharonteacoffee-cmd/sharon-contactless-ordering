import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1C4C34',
          colorPrimaryHover: '#163E2A',
          colorPrimaryActive: '#102B1D',
          colorSuccess: '#34A43C',
          colorWarning: '#FC9C34',
          colorInfo: '#541424',
          colorError: '#7C2C0C',
          colorTextBase: '#241C24',
          colorTextSecondary: '#6E6A67',
          colorBorder: '#E8E3D9',
          colorBgLayout: '#FAF7F2',
          borderRadius: 12,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        },
        components: {
          Button: {
            primaryShadow: '0 4px 14px -2px rgba(28, 76, 52, 0.25)',
            defaultBg: '#F5F5F4',
            defaultBorderColor: '#E8E3D9',
            defaultColor: '#57534E',
          },
          Layout: {
            siderBg: '#1C4C34',
            triggerBg: '#163E2A',
          },
          Menu: {
            darkItemBg: '#1C4C34',
            darkItemSelectedBg: '#102B1D',
            darkItemHoverBg: '#163E2A',
            darkItemColor: '#FAF7F2',
            darkItemSelectedColor: '#FC9C34',
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
