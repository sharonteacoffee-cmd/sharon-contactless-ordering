import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import type { OutletPublicInfo } from '@sharon/shared';
import { toApiClientError } from '@/api/axiosClient';
import { useCustomerLookupQuery } from '@/hooks/useCustomerHooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { sendCustomerOtp, verifyCustomerOtp } from '@/services/publicAuth.service';
import { useCartStore } from '@/stores/useCartStore';
import { useCustomerAuthStore } from '@/stores/useCustomerAuthStore';

const indianMobileRegex = /^[6-9]\d{9}$/;

interface CustomerFormValues {
  customerName: string;
  customerPhone: string;
}

interface CustomerVerificationDrawerProps {
  outlet: OutletPublicInfo;
  variant?: 'inline' | 'drawer';
  isOpen?: boolean;
  onClose?: () => void;
  onVerifiedOrSaved?: () => void;
}

export function CustomerVerificationDrawer({
  outlet,
  variant = 'inline',
  isOpen = true,
  onClose,
  onVerifiedOrSaved,
}: CustomerVerificationDrawerProps) {
  const { customerProfile, setCustomerProfile, setOtpVerificationToken } = useCartStore();
  const {
    fullName: authFullName,
    phone: authPhone,
    setSavedIdentity,
  } = useCustomerAuthStore();

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [welcomeBackNameLoaded, setWelcomeBackNameLoaded] = useState(false);

  const lastAutoFilledNameRef = useRef<string | null>(null);
  const lastLookedUpPhoneRef = useRef<string>('');

  const isOtpMode = outlet.customerAuthMode === 'OTP_VERIFIED';

  const formSchema = useMemo(
    () =>
      z.object({
        customerName: outlet.requireCustomerName
          ? z.string().trim().min(2, 'Please enter your name (min 2 characters)').max(255)
          : z.string().trim().max(255),
        customerPhone:
          outlet.requireCustomerPhone || isOtpMode
            ? z
                .string()
                .trim()
                .regex(indianMobileRegex, 'Enter a valid 10-digit Indian mobile number')
            : z
                .string()
                .trim()
                .refine(
                  (val) => val === '' || indianMobileRegex.test(val),
                  'Enter a valid 10-digit Indian mobile number',
                ),
      }),
    [outlet.requireCustomerName, outlet.requireCustomerPhone, isOtpMode],
  );

  const {
    register,
    watch,
    trigger,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: {
      customerName: customerProfile.customerName || authFullName || '',
      customerPhone: customerProfile.customerPhone || authPhone || '',
    },
  });

  const watchedName = watch('customerName');
  const watchedPhone = watch('customerPhone');
  const trimmedWatchedPhone = watchedPhone.trim();
  const debouncedPhone = useDebouncedValue(trimmedWatchedPhone, 350);

  const { data: lookupData, isFetching: isLookingUpPhone } =
    useCustomerLookupQuery(debouncedPhone);

  // Auto-populate customer name when a valid 10-digit mobile stabilizes for 350ms
  useEffect(() => {
    if (!indianMobileRegex.test(trimmedWatchedPhone)) {
      setWelcomeBackNameLoaded(false);
      lastLookedUpPhoneRef.current = '';
      return;
    }

    if (trimmedWatchedPhone !== debouncedPhone || !lookupData) {
      return;
    }

    if (lookupData.found && lookupData.fullName) {
      const currentName = getValues('customerName').trim();
      const canOverwrite =
        currentName.length === 0 || currentName === lastAutoFilledNameRef.current;

      if (canOverwrite && currentName !== lookupData.fullName) {
        setValue('customerName', lookupData.fullName, { shouldValidate: true });
        lastAutoFilledNameRef.current = lookupData.fullName;
      }

      if (lastLookedUpPhoneRef.current !== debouncedPhone || canOverwrite) {
        setWelcomeBackNameLoaded(true);
      }
      lastLookedUpPhoneRef.current = debouncedPhone;
    } else {
      setWelcomeBackNameLoaded(false);
      lastLookedUpPhoneRef.current = debouncedPhone;
    }
  }, [lookupData, trimmedWatchedPhone, debouncedPhone, getValues, setValue]);

  useEffect(() => {
    const trimmedPhone = watchedPhone.trim();
    const phoneChanged = trimmedPhone !== customerProfile.customerPhone;
    setCustomerProfile({
      customerName: watchedName,
      customerPhone: trimmedPhone,
      otpVerificationToken: phoneChanged ? undefined : customerProfile.otpVerificationToken,
    });
    setSavedIdentity({
      fullName: watchedName.trim(),
      phone: trimmedPhone,
    });
    if (phoneChanged) {
      setOtpSent(false);
      setOtpCode('');
      setDemoOtpHint(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedName, watchedPhone]);

  const handleSendOtp = async () => {
    setOtpError(null);
    const validPhone = await trigger('customerPhone');
    if (!validPhone) {
      return;
    }

    const phone = getValues('customerPhone').trim();
    setOtpLoading(true);
    try {
      const result = await sendCustomerOtp({
        outletSlug: outlet.slug,
        customerPhone: phone,
      });
      setOtpSent(true);
      setDemoOtpHint(result.devOtpPreview ?? null);
    } catch (err) {
      setOtpError(toApiClientError(err).message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    const trimmedOtp = otpCode.trim();
    if (!/^\d{4,6}$/.test(trimmedOtp)) {
      setOtpError('Please enter the 4 to 6 digit OTP sent to your mobile.');
      return;
    }

    const phone = getValues('customerPhone').trim();
    setOtpLoading(true);
    try {
      const result = await verifyCustomerOtp({
        outletSlug: outlet.slug,
        customerPhone: phone,
        otpCode: trimmedOtp,
      });
      if (result.otpVerificationToken) {
        setOtpVerificationToken(result.otpVerificationToken);
        onVerifiedOrSaved?.();
      }
    } catch (err) {
      setOtpError(toApiClientError(err).message);
    } finally {
      setOtpLoading(false);
    }
  };

  if (variant === 'drawer' && !isOpen) {
    return null;
  }

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-brand-black">
            Your Details for Counter Callout
          </h2>
          <p className="text-xs text-brand-muted">
            {isOtpMode
              ? 'Quick mobile OTP verification enabled for this outlet.'
              : 'Enter your 10-digit mobile to auto-load your saved Sharon profile.'}
          </p>
        </div>
        {variant === 'drawer' && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customer details drawer"
            className="w-8 h-8 rounded-full bg-white/85 border border-brand-border flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {welcomeBackNameLoaded ? (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D] text-[11px] font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-brand-leaf" />
          <span>Welcome back! Profile name loaded</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="checkout-customer-phone"
            className="block text-xs font-semibold text-brand-black/80 mb-1.5"
          >
            Mobile Number {outlet.requireCustomerPhone || isOtpMode ? '*' : '(Optional)'}
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="checkout-customer-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel-national"
              placeholder="10-digit mobile"
              {...register('customerPhone')}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/90 border border-brand-border text-sm text-brand-black tabular-price focus:outline-none focus:ring-2 focus:ring-brand-forest/25 focus:border-brand-forest"
            />
            {isLookingUpPhone ? (
              <Loader2 className="w-4 h-4 text-brand-forest animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            ) : null}
          </div>
          {errors.customerPhone ? (
            <p className="mt-1 text-xs text-brand-rust font-medium">
              {errors.customerPhone.message}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="checkout-customer-name"
            className="block text-xs font-semibold text-brand-black/80 mb-1.5"
          >
            Full Name {outlet.requireCustomerName ? '*' : '(Optional)'}
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="checkout-customer-name"
              type="text"
              autoComplete="name"
              placeholder="e.g., Rahul Sharma"
              {...register('customerName')}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white/90 border border-brand-border text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-forest/25 focus:border-brand-forest"
            />
          </div>
          {errors.customerName ? (
            <p className="mt-1 text-xs text-brand-rust font-medium">
              {errors.customerName.message}
            </p>
          ) : null}
        </div>
      </div>

      {/* OTP Verification Panel when outlet requires OTP_VERIFIED */}
      {isOtpMode ? (
        <div className="rounded-2xl bg-white/80 border border-brand-border p-3.5 space-y-3">
          {customerProfile.otpVerificationToken ? (
            <div className="flex items-center justify-between gap-2 text-brand-forest">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-brand-leaf" />
                <span>Mobile number verified via OTP</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpVerificationToken(undefined);
                  setOtpSent(false);
                  setOtpCode('');
                }}
                className="text-xs font-medium text-brand-chai underline"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-brand-black/80">
                  <ShieldCheck className="w-4 h-4 text-brand-forest" />
                  <span>Verify mobile number to place order</span>
                </div>
                <button
                  type="button"
                  disabled={otpLoading}
                  onClick={handleSendOtp}
                  className="btn-forest-primary px-3.5 py-1.5 rounded-full text-xs font-semibold disabled:opacity-60 shrink-0"
                >
                  {otpLoading ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>

              {otpSent ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 4-6 digit OTP"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-brand-border text-sm tabular-price focus:outline-none focus:ring-2 focus:ring-brand-forest/25"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={otpLoading}
                    onClick={handleVerifyOtp}
                    className="btn-forest-primary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-60"
                  >
                    Verify
                  </button>
                </div>
              ) : null}

              {demoOtpHint ? (
                <p className="text-[11px] font-medium text-brand-chai">
                  Pilot OTP Hint: {demoOtpHint}
                </p>
              ) : null}

              {otpError ? (
                <p className="text-xs font-medium text-brand-rust">{otpError}</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );

  if (variant === 'drawer') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-black/55 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full sm:max-w-lg glass-sheet sm:rounded-3xl p-5">{content}</div>
      </div>
    );
  }

  return <section className="glass-light rounded-3xl p-4 sm:p-5">{content}</section>;
}
