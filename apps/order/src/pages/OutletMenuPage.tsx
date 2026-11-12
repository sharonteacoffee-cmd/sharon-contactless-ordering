import { useEffect, useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Coffee, Search, ShoppingBag, Sparkles, User, X } from 'lucide-react';
import type { PublicMenuItem, SelectedModifier } from '@sharon/shared';
import { ApiClientError } from '@/api/axiosClient';
import { EmptyState } from '@/components/common/EmptyState';
import { ItemModifierModal } from '@/components/domain/ItemModifierModal';
import { MenuCard } from '@/components/domain/MenuCard';
import { useOutletStockSocket } from '@/hooks/useOutletStockSocket';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePublicMenuQuery } from '@/hooks/usePublicMenuQuery';
import { usePublicOutletQuery } from '@/hooks/usePublicOutletQuery';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useCartStore } from '@/stores/useCartStore';
import { useCustomerAuthStore } from '@/stores/useCustomerAuthStore';
import { useCustomerUiStore } from '@/stores/useCustomerUiStore';
import { calculateCartDisplaySummary, formatINR } from '@/utils/currency';

export function OutletMenuPage() {
  const { outletSlug } = useParams<{ outletSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { customerAccessToken, fullName } = useCustomerAuthStore();

  const qrToken = searchParams.get('qr');
  const tableLabel = searchParams.get('table');

  const {
    items: cartItems,
    outletSlug: cartOutletSlug,
    tableOrToken,
    setOutletContext,
    addItem,
  } = useCartStore();

  const {
    activeCategorySlug,
    searchQuery,
    customizingMenuItemId,
    setActiveCategorySlug,
    setSearchQuery,
    openModifierModal,
    closeModifierModal,
    resetMenuFilters,
  } = useCustomerUiStore();

  const {
    data: outlet,
    isLoading: outletLoading,
    error: outletError,
  } = usePublicOutletQuery(outletSlug, qrToken);

  const {
    data: menu,
    isLoading: menuLoading,
    error: menuError,
    refetch: refetchMenu,
  } = usePublicMenuQuery(outletSlug);

  useOutletStockSocket(outletSlug);

  useEffect(() => {
    if (outletSlug) {
      setOutletContext({
        outletSlug,
        tableOrToken: tableLabel ?? undefined,
        qrToken: qrToken ?? undefined,
      });
      resetMenuFilters();
    }
  }, [outletSlug, tableLabel, qrToken, setOutletContext, resetMenuFilters]);

  const activeCartItems = useMemo(
    () => (cartOutletSlug === outletSlug ? cartItems : []),
    [cartOutletSlug, cartItems, outletSlug],
  );

  const { totalItems, estimatedSubtotal } = useMemo(
    () => calculateCartDisplaySummary(activeCartItems),
    [activeCartItems],
  );

  const cartQuantityByMenuId = useMemo(() => {
    const map = new Map<string, number>();
    for (const ci of activeCartItems) {
      map.set(ci.menuItemId, (map.get(ci.menuItemId) ?? 0) + ci.quantity);
    }
    return map;
  }, [activeCartItems]);

  const sortedCategories = useMemo(
    () => [...(menu?.categories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [menu?.categories],
  );

  const modifierGroups = menu?.modifierGroups ?? [];

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);

  const filteredItems = useMemo(() => {
    const allItems = [...(menu?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const normalizedQuery = debouncedSearchQuery.trim().toLowerCase();

    return allItems.filter((item) => {
      const matchesCategory =
        activeCategorySlug === 'all' || item.categorySlug === activeCategorySlug;
      if (!matchesCategory) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        (item.description ?? '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [menu?.items, activeCategorySlug, debouncedSearchQuery]);

  const customizingItem = useMemo(
    () => (menu?.items ?? []).find((item) => item.id === customizingMenuItemId) ?? null,
    [menu?.items, customizingMenuItemId],
  );

  if (outletError instanceof ApiClientError) {
    if (outletError.statusCode === 404) {
      return <Navigate to="/404" replace />;
    }
    if (outletError.statusCode === 503 || outletError.statusCode === 0) {
      return <Navigate to="/maintenance" replace />;
    }
  }

  if (outlet && !outlet.isOrderingEnabled) {
    return (
      <Navigate
        to="/outlet-paused"
        state={{
          outletName: outlet.name,
          operatingHours: outlet.operatingHours,
          outletSlug: outlet.slug,
        }}
        replace
      />
    );
  }

  const itemSupportsModifiers = (item: PublicMenuItem): boolean => {
    if (modifierGroups.length === 0) {
      return false;
    }
    const slug = item.categorySlug.toLowerCase();
    return !slug.includes('snack') && !slug.includes('biscuit') && !slug.includes('pairing');
  };

  const handleSelectMenuItem = (item: PublicMenuItem) => {
    if (!outletSlug || !item.isAvailable) {
      return;
    }
    if (itemSupportsModifiers(item)) {
      openModifierModal(item.id);
      return;
    }
    addItem({
      outletSlug,
      menuItemId: item.id,
      name: item.name,
      basePrice: item.price,
      imageUrl: item.imageUrl,
      quantity: 1,
      selectedModifiers: [],
    });
  };

  const handleConfirmModalAdd = ({
    item,
    quantity,
    selectedModifiers,
    itemNote,
  }: {
    item: PublicMenuItem;
    quantity: number;
    selectedModifiers: SelectedModifier[];
    itemNote: string;
  }) => {
    if (!outletSlug) {
      return;
    }
    addItem({
      outletSlug,
      menuItemId: item.id,
      name: item.name,
      basePrice: item.price,
      imageUrl: item.imageUrl,
      quantity,
      selectedModifiers,
      itemNote,
    });
    closeModifierModal();
  };

  return (
    <CustomerLayout maxWidthClass="max-w-4xl">
      {/* Sticky Glass Top Bar */}
      <header className="sticky top-0 z-30 px-3 sm:px-4 pt-3 pb-2">
        <div className="glass-light rounded-3xl px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-brand-forest text-white flex items-center justify-center shrink-0 shadow-primaryBtn">
                <Coffee className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-base sm:text-lg font-bold text-brand-forest truncate">
                  {outletLoading ? 'Loading outlet...' : `Sharon — ${outlet?.name ?? ''}`}
                </h1>
                <p className="text-[11px] sm:text-xs text-brand-muted truncate">
                  {outlet
                    ? `Open • ${outlet.operatingHours} • ~${outlet.estimatedPrepTimeMinutes} min brew`
                    : 'Freshly brewed chai & filter coffee'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 border border-brand-border text-brand-forest text-[11px] font-semibold hover:bg-white transition-colors"
              >
                <User className="w-3 h-3" />
                <span className="max-w-[90px] truncate">
                  {customerAccessToken && fullName ? fullName : 'Profile / Orders'}
                </span>
              </Link>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D] text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-brand-leaf animate-pulse" />
                <span className="max-w-[95px] truncate">{tableOrToken}</span>
              </span>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Masala Tea, Filter Coffee, Cold Coffee, Herbal Tea..."
              className="w-full pl-10 pr-9 py-2 rounded-full bg-white/90 border border-brand-border text-xs sm:text-sm text-brand-black placeholder:text-brand-muted/75 focus:outline-none focus:ring-2 focus:ring-brand-forest/25 focus:border-brand-forest"
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-black"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {/* Horizontal Category Pills */}
          <nav
            aria-label="Menu Categories"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5"
          >
            <button
              type="button"
              onClick={() => setActiveCategorySlug('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategorySlug === 'all'
                  ? 'bg-brand-forest text-white shadow-primaryBtn'
                  : 'bg-white/85 text-brand-black/80 border border-brand-border hover:border-brand-forest/40'
              }`}
            >
              All Items
            </button>
            {sortedCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategorySlug(cat.slug)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategorySlug === cat.slug
                    ? 'bg-brand-forest text-white shadow-primaryBtn'
                    : 'bg-white/85 text-brand-black/80 border border-brand-border hover:border-brand-forest/40'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Menu Grid */}
      <main className="flex-1 px-3 sm:px-4 pt-3 pb-28">
        {outletLoading || menuLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="glass-light rounded-3xl p-3 h-72 animate-pulse bg-white/55"
              />
            ))}
          </div>
        ) : menuError ? (
          <EmptyState
            title="Could not load today's menu"
            description={
              menuError instanceof Error
                ? menuError.message
                : 'Please check your connection and try again.'
            }
            action={
              <button
                type="button"
                onClick={() => void refetchMenu()}
                className="btn-forest-primary px-5 py-2.5 rounded-full text-xs font-semibold"
              >
                Retry Menu
              </button>
            }
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No matching beverages or snacks"
            description="Try clearing your search filter or switching to All Items."
            icon={<Sparkles className="w-6 h-6" />}
            action={
              <button
                type="button"
                onClick={resetMenuFilters}
                className="btn-forest-primary px-5 py-2.5 rounded-full text-xs font-semibold"
              >
                Show Full Menu
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                cartQuantity={cartQuantityByMenuId.get(item.id) ?? 0}
                hasModifiers={itemSupportsModifiers(item)}
                onSelect={handleSelectMenuItem}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dark Frosted Floating Bottom Order Tray Bar with Golden Amber CTA */}
      {totalItems > 0 && outletSlug ? (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={() => navigate(`/order/${outletSlug}/checkout`)}
            className="pointer-events-auto w-full max-w-md glass-dark rounded-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-brand-black transition-colors active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 pl-1">
              <div className="w-9 h-9 rounded-full bg-brand-forest text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white tabular-price">
                  {totalItems} {totalItems === 1 ? 'Item' : 'Items'} • {formatINR(estimatedSubtotal)}
                </p>
                <p className="text-[11px] text-white/75">Tap to review pairings &amp; pay</p>
              </div>
            </div>

            <span className="btn-amber-cta inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs">
              <span>View Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      ) : null}

      {/* Beverage Customizer Sheet */}
      <ItemModifierModal
        item={customizingItem}
        modifierGroups={modifierGroups}
        onClose={closeModifierModal}
        onConfirmAdd={handleConfirmModalAdd}
      />
    </CustomerLayout>
  );
}
