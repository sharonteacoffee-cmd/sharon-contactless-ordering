import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import type { PublicMenuItem } from '@sharon/shared';
import { ApiClientError, toApiClientError } from '@/api/axiosClient';
import { EmptyState } from '@/components/common/EmptyState';
import { SharonLogo } from '@/components/common/SharonLogo';
import { CustomerVerificationDrawer } from '@/components/domain/CustomerVerificationDrawer';
import { UpiIntentPaySheet } from '@/components/domain/UpiIntentPaySheet';
import { UpsellTray } from '@/components/domain/UpsellTray';
import { useCreateOrderMutation } from '@/hooks/useCreateOrderMutation';
import { usePublicMenuQuery } from '@/hooks/usePublicMenuQuery';
import { usePublicOutletQuery } from '@/hooks/usePublicOutletQuery';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useCartStore } from '@/stores/useCartStore';
import type { CreatePublicOrderResponse } from '@/types/order';
import {
  calculateCartDisplaySummary,
  calculateCartItemUnitPrice,
  formatINR,
} from '@/utils/currency';
import { launchCashfreeCheckout } from '@/utils/cashfree';

const indianMobileRegex = /^[6-9]\d{9}$/;

export function CheckoutAndPayPage() {
  const { outletSlug } = useParams<{ outletSlug: string }>();
  const navigate = useNavigate();

  const {
    outletSlug: cartOutletSlug,
    tableOrToken,
    items: cartItems,
    notes,
    customerProfile,
    addItem,
    updateItemQuantity,
    removeItem,
    setOrderNotes,
    clearCart,
  } = useCartStore();

  const [createdOrder, setCreatedOrder] = useState<CreatePublicOrderResponse | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: outlet, isLoading: outletLoading, error: outletError } = usePublicOutletQuery(outletSlug);
  const { data: menu } = usePublicMenuQuery(outletSlug);
  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateOrderMutation();

  const activeItems = useMemo(
    () => (cartOutletSlug === outletSlug ? cartItems : []),
    [cartOutletSlug, cartItems, outletSlug],
  );

  const { totalItems, estimatedSubtotal } = useMemo(
    () => calculateCartDisplaySummary(activeItems),
    [activeItems],
  );

  const upsellCandidates = useMemo<PublicMenuItem[]>(() => {
    const inCartIds = new Set(activeItems.map((i) => i.menuItemId));
    const apiUpsells = (menu?.upsellItems ?? []).filter(
      (item) => item.isAvailable && !inCartIds.has(item.id),
    );
    if (apiUpsells.length > 0) {
      return apiUpsells;
    }

    const items = menu?.items ?? [];
    return items.filter(
      (item) =>
        item.isAvailable &&
        !inCartIds.has(item.id) &&
        (item.categorySlug === 'add-ons-customisations' || item.isBestseller),
    );
  }, [menu?.upsellItems, menu?.items, activeItems]);

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

  const handleQuickAddUpsell = (item: PublicMenuItem) => {
    if (!outletSlug) {
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

  const handlePlaceOrderAndPay = async () => {
    if (!outletSlug || !outlet || activeItems.length === 0) {
      return;
    }
    setCheckoutError(null);

    const trimmedName = customerProfile.customerName.trim();
    const trimmedPhone = customerProfile.customerPhone.trim();

    if (outlet.requireCustomerName && trimmedName.length < 2) {
      setCheckoutError('Please enter your name (at least 2 characters) for counter callout.');
      return;
    }
    if (
      (outlet.requireCustomerPhone || outlet.customerAuthMode === 'OTP_VERIFIED') &&
      !indianMobileRegex.test(trimmedPhone)
    ) {
      setCheckoutError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (
      outlet.customerAuthMode === 'OTP_VERIFIED' &&
      !customerProfile.otpVerificationToken
    ) {
      setCheckoutError('Please verify your mobile number via OTP before placing this order.');
      return;
    }

    const itemNotesJoined = activeItems
      .filter((i) => i.itemNote)
      .map((i) => `${i.name}: ${i.itemNote}`)
      .join(' | ');
    const combinedNotes = [notes.trim(), itemNotesJoined].filter(Boolean).join(' • ');

    try {
      const response = await createOrder({
        outletSlug,
        customerName: trimmedName || undefined,
        customerPhone: trimmedPhone || undefined,
        tableOrToken: tableOrToken || 'Counter Pickup',
        notes: combinedNotes || undefined,
        otpVerificationToken: customerProfile.otpVerificationToken,
        // Never send client prices — server recalculates authoritatively from DB
        items: activeItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          selectedModifierOptionIds: item.selectedModifiers.map((m) => m.optionId),
        })),
      });

      clearCart();

      if (response.paymentProvider === 'DEMO_UPI_INTENT' && response.upiPayload) {
        setCreatedOrder(response);
      } else if (response.paymentProvider === 'CASHFREE' && response.paymentSessionId) {
        await launchCashfreeCheckout(response.paymentSessionId);
      } else {
        navigate(`/order/status/${response.orderBusinessId}`, { replace: true });
      }
    } catch (err) {
      setCheckoutError(toApiClientError(err).message);
    }
  };

  return (
    <CustomerLayout maxWidthClass="max-w-2xl">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 px-3 sm:px-4 pt-3 pb-2">
        <div className="glass-light rounded-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={outletSlug ? `/order/${outletSlug}` : '/'}
              aria-label="Back to menu"
              className="w-9 h-9 rounded-full bg-white/90 border border-brand-border flex items-center justify-center text-brand-black hover:bg-white shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold text-brand-forest truncate">
                Your Order Tray
              </h1>
              <p className="text-xs text-brand-muted truncate">
                {outlet ? `${outlet.name} • ${tableOrToken}` : 'Review items & complete payment'}
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-brand-forest/10 text-brand-forest text-xs font-bold tabular-price shrink-0">
            {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
          </span>
        </div>
      </header>

      <main className="flex-1 px-3 sm:px-4 pt-2 pb-28 space-y-5">
        {outletLoading ? (
          <div className="glass-light rounded-3xl p-6 h-48 animate-pulse bg-white/60" />
        ) : activeItems.length === 0 && !createdOrder ? (
          <EmptyState
            title="Your tray is empty"
            description="Add hot Irani Chai, South Indian Filter Coffee, or crispy snacks to begin."
            icon={<SharonLogo size="md" variant="badge" className="rounded-full shadow-sm" />}
            action={
              <Link
                to={outletSlug ? `/order/${outletSlug}` : '/'}
                className="btn-forest-primary inline-flex items-center px-5 py-2.5 rounded-full text-xs font-semibold"
              >
                Browse Outlet Menu
              </Link>
            }
          />
        ) : (
          <>
            {/* Tray Items List */}
            <section className="glass-light rounded-3xl p-4 sm:p-5 space-y-3">
              <h2 className="font-display text-lg font-bold text-brand-black">Selected Items</h2>
              <div className="divide-y divide-brand-border">
                {activeItems.map((item) => {
                  const unitPrice = calculateCartItemUnitPrice(item);
                  const lineTotal = unitPrice * item.quantity;

                  return (
                    <div
                      key={item.cartItemId}
                      className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-brand-black">{item.name}</p>
                        {item.selectedModifiers.length > 0 ? (
                          <p className="text-xs text-brand-muted mt-0.5">
                            {item.selectedModifiers.map((m) => m.optionName).join(' • ')}
                          </p>
                        ) : null}
                        {item.itemNote ? (
                          <p className="text-[11px] italic text-brand-chai mt-0.5">
                            Note: {item.itemNote}
                          </p>
                        ) : null}
                        <p className="text-xs font-bold text-brand-forest tabular-price mt-1">
                          {formatINR(lineTotal)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-cream border border-brand-border px-1.5 py-1">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.cartItemId, item.quantity - 1)}
                            aria-label={`Decrease quantity for ${item.name}`}
                            className="w-6 h-6 rounded-full bg-white border border-brand-border/60 flex items-center justify-center text-brand-black"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-brand-black tabular-price">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.cartItemId, item.quantity + 1)}
                            aria-label={`Increase quantity for ${item.name}`}
                            className="w-6 h-6 rounded-full bg-white border border-brand-border/60 flex items-center justify-center text-brand-black"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.cartItemId)}
                          aria-label={`Remove ${item.name}`}
                          className="w-7 h-7 rounded-full text-brand-muted hover:text-brand-rust hover:bg-brand-rust/10 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Kitchen Note */}
              <div className="pt-2">
                <label
                  htmlFor="order-kitchen-notes"
                  className="block text-xs font-semibold text-brand-black/80 mb-1.5"
                >
                  Kitchen Note (Optional)
                </label>
                <input
                  id="order-kitchen-notes"
                  type="text"
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g., Pack separately, extra paper cups"
                  className="w-full px-3.5 py-2 rounded-2xl bg-white/90 border border-brand-border text-xs sm:text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-forest/25"
                />
              </div>
            </section>

            {/* Pre-Checkout Upsell Tray */}
            <UpsellTray items={upsellCandidates} onQuickAdd={handleQuickAddUpsell} />

            {/* Customer Details & Optional OTP Verification */}
            {outlet ? <CustomerVerificationDrawer outlet={outlet} variant="inline" /> : null}

            {/* Payment Method Card */}
            {outlet ? (
              <section className="glass-light rounded-3xl p-4 sm:p-5 space-y-3">
                <h2 className="font-display text-lg font-bold text-brand-black">
                  Payment Method
                </h2>

                <div className="rounded-2xl bg-white/90 border-2 border-brand-forest p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-forest/10 text-brand-forest flex items-center justify-center shrink-0">
                      {outlet.paymentProvider === 'DEMO_UPI_INTENT' ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <CreditCard className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-brand-black">
                        {outlet.paymentProvider === 'DEMO_UPI_INTENT'
                          ? 'Pay via UPI (Paytm / GPay / PhonePe)'
                          : `Online Checkout (${outlet.paymentProvider})`}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {outlet.paymentProvider === 'DEMO_UPI_INTENT'
                          ? 'Opens UPI app or Dynamic QR with order token reference'
                          : 'Instant bank-verified UPI & Card payment'}
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-brand-leaf shrink-0" />
                </div>

                {/* Server-Authoritative Total Disclaimer */}
                <div className="pt-2 border-t border-brand-border flex items-center justify-between text-sm">
                  <span className="text-brand-muted flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand-forest" />
                    <span>Estimated Payable</span>
                  </span>
                  <span className="text-lg font-bold text-brand-black tabular-price">
                    {formatINR(estimatedSubtotal, true)}
                  </span>
                </div>
              </section>
            ) : null}

            {checkoutError ? (
              <div className="rounded-2xl bg-brand-rust/10 border border-brand-rust/30 px-4 py-3 text-xs font-medium text-brand-rust">
                {checkoutError}
              </div>
            ) : null}
          </>
        )}
      </main>

      {/* Sticky Bottom Pay CTA (Sharon Forest Green Primary) */}
      {activeItems.length > 0 && outlet && !createdOrder ? (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
          <button
            type="button"
            disabled={isCreatingOrder}
            onClick={() => void handlePlaceOrderAndPay()}
            className="btn-forest-primary pointer-events-auto w-full max-w-md rounded-full px-6 py-4 shadow-floating flex items-center justify-between gap-3 active:scale-[0.99] disabled:opacity-70"
          >
            <span className="text-sm font-semibold flex items-center gap-2">
              {isCreatingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Token &amp; UPI...</span>
                </>
              ) : (
                <span>Place Order &amp; Pay</span>
              )}
            </span>
            <span className="px-3.5 py-1 rounded-full bg-white/15 text-sm font-bold tabular-price">
              {formatINR(estimatedSubtotal, true)}
            </span>
          </button>
        </div>
      ) : null}

      {/* Demo UPI Intent + Dynamic QR Pay Sheet */}
      <UpiIntentPaySheet
        order={createdOrder}
        onClose={() => {
          if (createdOrder) {
            navigate(`/order/status/${createdOrder.orderBusinessId}`, { replace: true });
          } else {
            setCreatedOrder(null);
          }
        }}
        onPaymentSubmitted={(orderBusinessId) => {
          navigate(`/order/status/${orderBusinessId}`, { replace: true });
        }}
      />
    </CustomerLayout>
  );
}
