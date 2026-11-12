import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coffee,
  KeyRound,
  Loader2,
  LogOut,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import {
  formatISTDateTime,
  saveCustomerProfileSchema,
  sendCustomerLoginOtpSchema,
  updateCustomerProfileSchema,
  verifyCustomerLoginOtpSchema,
  type OrderStatus,
  type PaymentStatus,
} from '@sharon/shared';
import { toApiClientError } from '@/api/axiosClient';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/common/EmptyState';
import { PushAlertsCard } from '@/components/domain/PushAlertsCard';
import {
  useCustomerLookupQuery,
  useCustomerOrdersQuery,
  useCustomerProfileQuery,
  useSaveCustomerProfileMutation,
  useSendCustomerLoginOtpMutation,
  useUpdateCustomerProfileMutation,
  useVerifyCustomerLoginOtpMutation,
} from '@/hooks/useCustomerHooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useCustomerAuthStore } from '@/stores/useCustomerAuthStore';
import { formatINR } from '@/utils/currency';

const indianMobileRegex = /^[6-9]\d{9}$/;

function renderOrderStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'RECEIVED':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#78350F] border border-[#FCD34D]">
          Pending
        </span>
      );
    case 'PREPARING':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFEDD5] text-[#7C2D12] border border-[#FDBA74]">
          Preparing
        </span>
      );
    case 'READY':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC]">
          Ready for Pickup
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F5F5F4] text-[#44403C] border border-[#D6D3D1]">
          Completed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-rust/10 text-brand-rust border border-brand-rust/30">
          Cancelled
        </span>
      );
  }
}

function renderPaymentStatusBadge(status: PaymentStatus) {
  if (status === 'PAID_VERIFIED') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
        UPI Paid
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
      {status === 'UPI_CLAIMED_DEMO' ? 'Verifying UPI' : 'Payment Pending'}
    </span>
  );
}

export function CustomerProfilePage() {
  const queryClient = useQueryClient();
  const {
    customerAccessToken,
    customerBusinessId,
    fullName: storedFullName,
    phone: storedPhone,
    clearSession,
  } = useCustomerAuthStore();

  const isLoggedIn = Boolean(customerAccessToken);

  // Guest / login form state
  const [phoneInput, setPhoneInput] = useState(storedPhone);
  const [nameInput, setNameInput] = useState(storedFullName);
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [welcomeBackLoaded, setWelcomeBackLoaded] = useState(false);
  const [guestFeedback, setGuestFeedback] = useState<string | null>(null);
  const [guestError, setGuestError] = useState<string | null>(null);
  const lastAutoFilledNameRef = useRef<string | null>(null);

  // Logged-in editable name state
  const [editNameInput, setEditNameInput] = useState(storedFullName);
  const [profileSavedToast, setProfileSavedToast] = useState<string | null>(null);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);

  const trimmedPhone = phoneInput.trim();
  const debouncedPhone = useDebouncedValue(trimmedPhone, 350);
  const { data: lookupData, isFetching: isLookingUp } = useCustomerLookupQuery(
    isLoggedIn ? '' : debouncedPhone,
  );

  const { data: myProfile } = useCustomerProfileQuery(isLoggedIn);
  const {
    data: myOrders,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useCustomerOrdersQuery(isLoggedIn);

  const saveProfileMutation = useSaveCustomerProfileMutation();
  const sendLoginOtpMutation = useSendCustomerLoginOtpMutation();
  const verifyLoginOtpMutation = useVerifyCustomerLoginOtpMutation();
  const updateProfileMutation = useUpdateCustomerProfileMutation();

  // Auto-fill guest name after 10-digit mobile stabilizes for 350ms
  useEffect(() => {
    if (isLoggedIn) {
      return;
    }
    if (!indianMobileRegex.test(trimmedPhone)) {
      setWelcomeBackLoaded(false);
      return;
    }
    if (trimmedPhone !== debouncedPhone || !lookupData) {
      return;
    }
    if (lookupData.found && lookupData.fullName) {
      const currentName = nameInput.trim();
      const canOverwrite =
        currentName.length === 0 || currentName === lastAutoFilledNameRef.current;
      if (canOverwrite) {
        setNameInput(lookupData.fullName);
        lastAutoFilledNameRef.current = lookupData.fullName;
      }
      setWelcomeBackLoaded(true);
    } else {
      setWelcomeBackLoaded(false);
    }
  }, [isLoggedIn, lookupData, trimmedPhone, debouncedPhone, nameInput]);

  // Sync logged-in profile name into edit input
  useEffect(() => {
    if (myProfile?.fullName) {
      setEditNameInput(myProfile.fullName);
    } else if (storedFullName) {
      setEditNameInput(storedFullName);
    }
  }, [myProfile?.fullName, storedFullName]);

  const handleSaveGuestProfile = async () => {
    setGuestError(null);
    setGuestFeedback(null);

    const parsed = saveCustomerProfileSchema.safeParse({
      phone: trimmedPhone,
      fullName: nameInput.trim(),
    });

    if (!parsed.success) {
      setGuestError(parsed.error.issues[0]?.message ?? 'Please enter valid name and mobile.');
      return;
    }

    try {
      const saved = await saveProfileMutation.mutateAsync(parsed.data);
      setGuestFeedback(
        `Profile saved (${saved.businessId})! Your name will auto-fill at checkout.`,
      );
    } catch (err) {
      setGuestError(toApiClientError(err).message);
    }
  };

  const handleSendLoginOtp = async () => {
    setGuestError(null);
    setGuestFeedback(null);

    const parsed = sendCustomerLoginOtpSchema.safeParse({ phone: trimmedPhone });
    if (!parsed.success) {
      setGuestError(parsed.error.issues[0]?.message ?? 'Enter a valid 10-digit mobile number.');
      return;
    }

    try {
      const res = await sendLoginOtpMutation.mutateAsync(parsed.data);
      setOtpSent(true);
      setDevOtpHint(res.devOtpPreview ?? null);
    } catch (err) {
      setGuestError(toApiClientError(err).message);
    }
  };

  const handleVerifyLoginOtp = async () => {
    setGuestError(null);
    setGuestFeedback(null);

    const trimmedName = nameInput.trim();
    const parsed = verifyCustomerLoginOtpSchema.safeParse({
      phone: trimmedPhone,
      otpCode: otpCodeInput.trim(),
      ...(trimmedName.length >= 2 ? { fullName: trimmedName } : {}),
    });

    if (!parsed.success) {
      setGuestError(parsed.error.issues[0]?.message ?? 'Please check your OTP and mobile.');
      return;
    }

    try {
      await verifyLoginOtpMutation.mutateAsync(parsed.data);
      setOtpSent(false);
      setOtpCodeInput('');
      setDevOtpHint(null);
    } catch (err) {
      setGuestError(toApiClientError(err).message);
    }
  };

  const handleUpdateMyName = async () => {
    setProfileUpdateError(null);
    setProfileSavedToast(null);

    const parsed = updateCustomerProfileSchema.safeParse({
      fullName: editNameInput.trim(),
    });
    if (!parsed.success) {
      setProfileUpdateError(parsed.error.issues[0]?.message ?? 'Enter at least 2 characters.');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync(parsed.data);
      setProfileSavedToast('Profile name updated.');
      window.setTimeout(() => setProfileSavedToast(null), 2500);
    } catch (err) {
      setProfileUpdateError(toApiClientError(err).message);
    }
  };

  const handleSignOut = () => {
    clearSession();
    queryClient.removeQueries({ queryKey: queryKeys.customerProfile });
    queryClient.removeQueries({ queryKey: queryKeys.customerOrders });
  };

  const displayBusinessId = myProfile?.businessId ?? customerBusinessId ?? 'CUS...';
  const displayPhone = myProfile?.phone ?? storedPhone;

  return (
    <CustomerLayout maxWidthClass="max-w-2xl">
      {/* Header */}
      <header className="sticky top-0 z-30 px-3 sm:px-4 pt-3 pb-2">
        <div className="glass-light rounded-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              aria-label="Back to outlets"
              className="w-9 h-9 rounded-full bg-white/90 border border-brand-border flex items-center justify-center text-brand-black hover:bg-white shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold text-brand-forest truncate">
                My Profile &amp; Orders
              </h1>
              <p className="text-xs text-brand-muted truncate">
                Sharon Tea &amp; Coffee • Customer Account
              </p>
            </div>
          </div>

          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-cream-secondary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 px-3 sm:px-4 pt-2 pb-12 space-y-5">
        {!isLoggedIn ? (
          /* Guest / Save Profile / OTP Login Card */
          <section className="glass-light rounded-3xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-forest text-white flex items-center justify-center shrink-0 shadow-primaryBtn">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-brand-black">
                  Quick Profile &amp; Order Login
                </h2>
                <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
                  Save your name once for 1-tap checkout across all Sharon branches, or sign in
                  with OTP to view your order history.
                </p>
              </div>
            </div>

            {welcomeBackLoaded ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D] text-[11px] font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-brand-leaf" />
                <span>Welcome back! Profile name loaded</span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="profile-phone-input"
                  className="block text-xs font-semibold text-brand-black/80 mb-1.5"
                >
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="profile-phone-input"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phoneInput}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneInput(next);
                      setOtpSent(false);
                      setDevOtpHint(null);
                    }}
                    placeholder="10-digit mobile"
                    className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/90 border border-brand-border text-sm text-brand-black tabular-price focus:outline-none focus:ring-2 focus:ring-brand-forest/25 focus:border-brand-forest"
                  />
                  {isLookingUp ? (
                    <Loader2 className="w-4 h-4 text-brand-forest animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  ) : null}
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-name-input"
                  className="block text-xs font-semibold text-brand-black/80 mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="profile-name-input"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g., Rahul Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white/90 border border-brand-border text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-forest/25 focus:border-brand-forest"
                  />
                </div>
              </div>
            </div>

            {guestFeedback ? (
              <div className="rounded-2xl bg-[#DCFCE7] border border-[#86EFAC] px-4 py-2.5 text-xs font-semibold text-[#14532D] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-leaf shrink-0" />
                <span>{guestFeedback}</span>
              </div>
            ) : null}

            {guestError ? (
              <div className="rounded-2xl bg-brand-rust/10 border border-brand-rust/30 px-4 py-2.5 text-xs font-medium text-brand-rust">
                {guestError}
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                disabled={saveProfileMutation.isPending}
                onClick={() => void handleSaveGuestProfile()}
                className="btn-cream-secondary flex-1 py-3 px-4 rounded-full text-xs font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saveProfileMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Profile</span>
              </button>

              <button
                type="button"
                disabled={sendLoginOtpMutation.isPending}
                onClick={() => void handleSendLoginOtp()}
                className="btn-forest-primary flex-1 py-3 px-4 rounded-full text-xs font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {sendLoginOtpMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>{otpSent ? 'Resend Login OTP' : 'Login with OTP to View Orders'}</span>
              </button>
            </div>

            {otpSent ? (
              <div className="rounded-2xl bg-white/85 border border-brand-border p-4 space-y-3">
                <p className="text-xs font-semibold text-brand-black">
                  Enter the 6-digit OTP sent to {trimmedPhone}
                </p>

                {devOtpHint ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-brand-amber/15 border border-brand-amber/40 px-3 py-2 text-xs">
                    <span className="font-medium text-brand-chai">
                      Pilot OTP Hint: <strong className="tabular-price">{devOtpHint}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpCodeInput(devOtpHint)}
                      className="px-2.5 py-1 rounded-full bg-brand-amber text-brand-black font-bold text-[11px] hover:bg-brand-amberHover"
                    >
                      Quick Fill
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCodeInput}
                      onChange={(e) => setOtpCodeInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 4-6 digit OTP"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-brand-border text-sm tabular-price focus:outline-none focus:ring-2 focus:ring-brand-forest/25"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={verifyLoginOtpMutation.isPending}
                    onClick={() => void handleVerifyLoginOtp()}
                    className="btn-forest-primary px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {verifyLoginOtpMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    <span>Verify</span>
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          /* Logged-In Customer Profile & Order History */
          <>
            <section className="glass-light rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-brand-forest text-white flex items-center justify-center shrink-0 shadow-primaryBtn">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-brand-black">
                        {myProfile?.fullName ?? (storedFullName || 'Sharon Guest')}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-burgundy/10 text-brand-burgundy text-[11px] font-bold">
                        {displayBusinessId}
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted tabular-price">{displayPhone}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D] text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-leaf" />
                  Verified Session
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  placeholder="Your full name"
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-white/90 border border-brand-border text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-forest/25 focus:border-brand-forest"
                />
                <button
                  type="button"
                  disabled={updateProfileMutation.isPending}
                  onClick={() => void handleUpdateMyName()}
                  className="btn-forest-primary px-5 py-2.5 rounded-full text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Name</span>
                </button>
              </div>

              {profileSavedToast ? (
                <p className="text-xs font-semibold text-brand-forest">{profileSavedToast}</p>
              ) : null}
              {profileUpdateError ? (
                <p className="text-xs font-medium text-brand-rust">{profileUpdateError}</p>
              ) : null}
            </section>

            {/* My Order History */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display text-xl font-bold text-brand-black">
                  My Order History
                </h2>
                <button
                  type="button"
                  onClick={() => void refetchOrders()}
                  className="text-xs font-semibold text-brand-forest hover:underline"
                >
                  Refresh
                </button>
              </div>

              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((idx) => (
                    <div
                      key={idx}
                      className="glass-light rounded-3xl p-5 h-36 animate-pulse bg-white/60"
                    />
                  ))}
                </div>
              ) : ordersError ? (
                <EmptyState
                  title="Could not load order history"
                  description={
                    ordersError instanceof Error
                      ? ordersError.message
                      : 'Please try refreshing your order history.'
                  }
                  action={
                    <button
                      type="button"
                      onClick={() => void refetchOrders()}
                      className="btn-forest-primary px-5 py-2 rounded-full text-xs font-semibold"
                    >
                      Retry
                    </button>
                  }
                />
              ) : !myOrders || myOrders.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  description="Once you place your first chai or coffee order, it will appear here with live tracking."
                  icon={<Coffee className="w-6 h-6" />}
                  action={
                    <Link
                      to="/"
                      className="btn-forest-primary inline-flex items-center px-5 py-2.5 rounded-full text-xs font-semibold"
                    >
                      Browse Sharon Outlets
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {myOrders.map((order) => (
                    <article key={order.orderBusinessId} className="glass-light rounded-3xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display text-lg font-bold text-brand-burgundy tabular-price">
                              {order.orderNumber}
                            </span>
                            {renderOrderStatusBadge(order.orderStatus)}
                            {renderPaymentStatusBadge(order.paymentStatus)}
                          </div>
                          <Link
                            to={`/order/${order.outletSlug}`}
                            className="text-xs font-semibold text-brand-forest hover:underline mt-1 inline-block"
                          >
                            {order.outletName}
                          </Link>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-brand-black tabular-price">
                            {formatINR(order.totalAmount, true)}
                          </p>
                          <p className="text-[11px] text-brand-muted">
                            {formatISTDateTime(order.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-brand-cream/90 border border-brand-border px-3.5 py-2.5 space-y-1">
                        {order.items.map((item, idx) => (
                          <div
                            key={`${item.menuItemId}-${idx}`}
                            className="text-xs text-brand-black flex items-start justify-between gap-2"
                          >
                            <span>
                              <strong>{item.quantity} ×</strong> {item.name}
                              {item.selectedModifiers.length > 0 ? (
                                <span className="text-brand-muted">
                                  {' '}
                                  ({item.selectedModifiers.map((m) => m.optionName).join(', ')})
                                </span>
                              ) : null}
                            </span>
                            <span className="font-semibold tabular-price shrink-0">
                              {formatINR(item.lineTotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[11px] text-brand-muted">{order.orderBusinessId}</span>
                        <Link
                          to={`/order/status/${order.orderBusinessId}`}
                          className="btn-forest-primary inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold"
                        >
                          <span>Track Live</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Live Order Push Alerts */}
        <PushAlertsCard description="Get instant push alerts on this device when your Sharon orders move to Preparing or Ready" />
      </main>
    </CustomerLayout>
  );
}
