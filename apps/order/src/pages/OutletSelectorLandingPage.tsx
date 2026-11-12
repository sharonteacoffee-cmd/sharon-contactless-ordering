import { Link } from 'react-router-dom';
import { Clock, Coffee, MapPin, PauseCircle, ArrowRight, Sparkles, User } from 'lucide-react';
import { ApiClientError } from '@/api/axiosClient';
import { EmptyState } from '@/components/common/EmptyState';
import { usePublicOutletsQuery } from '@/hooks/usePublicOutletsQuery';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useCustomerAuthStore } from '@/stores/useCustomerAuthStore';

export function OutletSelectorLandingPage() {
  const { data: outlets, isLoading, error, refetch } = usePublicOutletsQuery();
  const { customerAccessToken, fullName } = useCustomerAuthStore();

  const isServiceUnavailable =
    error instanceof ApiClientError && (error.statusCode === 503 || error.statusCode === 0);

  return (
    <CustomerLayout maxWidthClass="max-w-2xl">
      <div className="px-4 py-6 sm:py-10 flex-1 flex flex-col gap-6">
        {/* Top Profile / Orders Shortcut */}
        <div className="flex justify-end">
          <Link
            to="/profile"
            className="glass-light inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-brand-forest hover:bg-white transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            <span>
              {customerAccessToken && fullName ? fullName : 'Profile / Orders'}
            </span>
          </Link>
        </div>

        {/* Hero Brand Header */}
        <header className="glass-light rounded-3xl p-6 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-forest text-white flex items-center justify-center shadow-primaryBtn">
            <Coffee className="w-7 h-7" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-burgundy/10 text-brand-burgundy text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Contactless QR Ordering
          </span>

          <h1 className="font-display text-3xl font-bold text-brand-black">
            Sharon Tea &amp; Coffee
          </h1>
          <p className="text-sm text-brand-muted max-w-md mx-auto leading-relaxed">
            Choose your branch below to browse live availability, customize your chai or filter
            coffee, and pick up without waiting in line.
          </p>
        </header>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="glass-light rounded-3xl p-5 h-32 animate-pulse bg-white/60"
              />
            ))}
          </div>
        ) : null}

        {/* Error State */}
        {error ? (
          <EmptyState
            title={
              isServiceUnavailable
                ? 'Counter service is waking up'
                : 'Unable to load Sharon outlets'
            }
            description={
              error instanceof Error
                ? error.message
                : 'Please check your internet connection and try again.'
            }
            action={
              <button
                type="button"
                onClick={() => void refetch()}
                className="btn-forest-primary px-5 py-2.5 rounded-full text-xs font-semibold"
              >
                Retry
              </button>
            }
          />
        ) : null}

        {/* Outlets Directory */}
        {!isLoading && !error && outlets && outlets.length === 0 ? (
          <EmptyState
            title="No active outlets right now"
            description="Please scan a table standee QR code at the counter or check back shortly."
          />
        ) : null}

        {!isLoading && !error && outlets && outlets.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-brand-black px-1">
              Select a Branch
            </h2>
            <div className="space-y-3">
              {outlets.map((outlet) => (
                <article
                  key={outlet.businessId}
                  className="glass-light rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-elevated transition-shadow"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-lg font-bold text-brand-black">
                        {outlet.name}
                      </h3>
                      {outlet.isOrderingEnabled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D] text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-leaf animate-pulse" />
                          Open Now
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FCD34D] text-[#78350F] text-[11px] font-semibold">
                          <PauseCircle className="w-3 h-3" />
                          Paused
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-brand-muted flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-forest shrink-0 mt-0.5" />
                      <span>{outlet.address}</span>
                    </p>

                    <p className="text-xs text-brand-chai flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {outlet.operatingHours} • Est. {outlet.estimatedPrepTimeMinutes} min prep
                      </span>
                    </p>
                  </div>

                  {outlet.isOrderingEnabled ? (
                    <Link
                      to={`/order/${outlet.slug}`}
                      className="btn-forest-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold shrink-0"
                    >
                      <span>View Menu</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      to="/outlet-paused"
                      state={{
                        outletName: outlet.name,
                        operatingHours: outlet.operatingHours,
                      }}
                      className="btn-cream-secondary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold shrink-0"
                    >
                      <span>Paused</span>
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </CustomerLayout>
  );
}
