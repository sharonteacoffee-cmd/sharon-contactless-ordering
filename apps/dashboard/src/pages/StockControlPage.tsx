import { useEffect, useState } from 'react';
import { Alert, Card, Select, message } from 'antd';
import { Store } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { StockSwitchTable } from '../components/domain/StockSwitchTable';
import { useOutletsQuery } from '../hooks/useOutletHooks';
import {
  useOutletStockQuery,
  useToggleStockMutation,
} from '../hooks/useStockHooks';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';
import type { OutletStockItem } from '../types/dashboard';
import { extractApiErrorMessage } from '../utils/errorMessage';

export function StockControlPage() {
  const user = useDashboardUiStore((state) => state.user);
  const selectedOutletBusinessId = useDashboardUiStore(
    (state) => state.selectedOutletBusinessId,
  );
  const setSelectedOutletBusinessId = useDashboardUiStore(
    (state) => state.setSelectedOutletBusinessId,
  );
  const isMd = user?.role === 'MD';

  const outletsQuery = useOutletsQuery(isMd);
  const [mutatingItemId, setMutatingItemId] = useState<string | null>(null);

  const effectiveOutletBusinessId = isMd
    ? selectedOutletBusinessId || outletsQuery.data?.[0]?.businessId || null
    : user?.outletBusinessId ?? null;

  useEffect(() => {
    if (
      isMd &&
      !selectedOutletBusinessId &&
      outletsQuery.data &&
      outletsQuery.data.length > 0
    ) {
      setSelectedOutletBusinessId(outletsQuery.data[0].businessId);
    }
  }, [
    isMd,
    selectedOutletBusinessId,
    outletsQuery.data,
    setSelectedOutletBusinessId,
  ]);

  const stockQuery = useOutletStockQuery(effectiveOutletBusinessId);
  const toggleStockMutation = useToggleStockMutation(effectiveOutletBusinessId);

  const handleToggleAvailability = async (
    item: OutletStockItem,
    isAvailable: boolean,
  ) => {
    try {
      setMutatingItemId(item.menuItemId);
      await toggleStockMutation.mutateAsync({
        menuItemId: item.menuItemId,
        payload: {
          isAvailable,
          customPrice: item.customPrice,
        },
      });
      message.success(
        `${item.name} marked ${isAvailable ? 'In Stock' : 'Sold Out'}`,
      );
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to update stock availability.'),
      );
    } finally {
      setMutatingItemId(null);
    }
  };

  const handleSaveCustomPrice = async (
    item: OutletStockItem,
    customPrice: number | null,
  ) => {
    try {
      setMutatingItemId(item.menuItemId);
      await toggleStockMutation.mutateAsync({
        menuItemId: item.menuItemId,
        payload: {
          isAvailable: item.isAvailable,
          customPrice,
        },
      });
      message.success(
        customPrice === null
          ? `Reset ${item.name} to master price`
          : `Updated ${item.name} price to ₹${customPrice.toFixed(2)}`,
      );
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to update custom price.'),
      );
    } finally {
      setMutatingItemId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-bold text-brand-black">
            Outlet Stock &amp; Price Overrides
          </h1>
          <p className="m-0 text-xs text-brand-muted">
            Changes broadcast immediately to customers scanning QR codes at this
            outlet
          </p>
        </div>

        {isMd && outletsQuery.data ? (
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-brand-forest" />
            <Select
              value={effectiveOutletBusinessId ?? undefined}
              onChange={(val) => setSelectedOutletBusinessId(val)}
              placeholder="Choose outlet"
              style={{ width: 240 }}
              options={outletsQuery.data.map((outlet) => ({
                label: `${outlet.name} (${outlet.businessId})`,
                value: outlet.businessId,
              }))}
            />
          </div>
        ) : null}
      </div>

      {stockQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load outlet stock"
          description={extractApiErrorMessage(stockQuery.error)}
        />
      ) : null}

      <Card className="rounded-2xl border border-brand-border shadow-soft">
        {!effectiveOutletBusinessId ? (
          <EmptyState
            title="No outlet selected"
            description="Select an outlet above to manage item stock and price overrides."
          />
        ) : (
          <StockSwitchTable
            items={stockQuery.data ?? []}
            loading={stockQuery.isLoading}
            mutatingItemId={mutatingItemId}
            onToggleAvailability={handleToggleAvailability}
            onSaveCustomPrice={handleSaveCustomPrice}
          />
        )}
      </Card>
    </div>
  );
}
