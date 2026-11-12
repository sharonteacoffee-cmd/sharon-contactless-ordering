import { Check, Coffee, Flame, PackageCheck, Receipt, XCircle } from 'lucide-react';
import type { OrderStatus } from '@sharon/shared';

interface LiveStatusStepperProps {
  orderStatus: OrderStatus;
  estimatedPrepTimeMinutes: number;
}

interface StepDefinition {
  key: Exclude<OrderStatus, 'CANCELLED'>;
  label: string;
  subtitle: string;
}

const STEPS: StepDefinition[] = [
  {
    key: 'RECEIVED',
    label: 'Order Received',
    subtitle: 'Your token is queued at the Sharon counter',
  },
  {
    key: 'PREPARING',
    label: 'Brewing in Kitchen',
    subtitle: 'Fresh chai & snacks are being prepared right now',
  },
  {
    key: 'READY',
    label: 'Ready for Pickup',
    subtitle: 'Show your Token Pass at the pickup counter!',
  },
  {
    key: 'COMPLETED',
    label: 'Picked Up / Delivered',
    subtitle: 'Enjoy your cup of Sharon Tea & Coffee',
  },
];

const ORDER_SEQUENCE: Record<Exclude<OrderStatus, 'CANCELLED'>, number> = {
  RECEIVED: 0,
  PREPARING: 1,
  READY: 2,
  COMPLETED: 3,
};

export function LiveStatusStepper({
  orderStatus,
  estimatedPrepTimeMinutes,
}: LiveStatusStepperProps) {
  if (orderStatus === 'CANCELLED') {
    return (
      <div className="glass-light rounded-3xl p-5 border border-brand-rust/30 bg-brand-rust/5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-rust/15 text-brand-rust flex items-center justify-center shrink-0">
          <XCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-brand-rust">Order Cancelled</h3>
          <p className="text-xs text-brand-muted mt-1 leading-relaxed">
            This order was cancelled at the counter. Please speak with our outlet staff for
            immediate assistance or refund support.
          </p>
        </div>
      </div>
    );
  }

  const currentIdx = ORDER_SEQUENCE[orderStatus];

  const renderStepIcon = (
    stepKey: Exclude<OrderStatus, 'CANCELLED'>,
    isActive: boolean,
    isDone: boolean,
  ) => {
    if (isDone) {
      return <Check className="w-4 h-4 text-white" />;
    }
    switch (stepKey) {
      case 'RECEIVED':
        return (
          <Receipt className={`w-4 h-4 ${isActive ? 'text-[#78350F]' : 'text-brand-muted'}`} />
        );
      case 'PREPARING':
        return (
          <Flame
            className={`w-4 h-4 ${isActive ? 'text-[#7C2D12] animate-steam' : 'text-brand-muted'}`}
          />
        );
      case 'READY':
        return (
          <Coffee className={`w-4 h-4 ${isActive ? 'text-[#14532D]' : 'text-brand-muted'}`} />
        );
      case 'COMPLETED':
        return (
          <PackageCheck
            className={`w-4 h-4 ${isActive ? 'text-[#44403C]' : 'text-brand-muted'}`}
          />
        );
    }
  };

  return (
    <section className="glass-light rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-brand-black">Live Brew Progress</h2>
        <span className="px-3 py-1 rounded-full bg-brand-cream border border-brand-border text-[11px] font-semibold text-brand-chai">
          Est. {estimatedPrepTimeMinutes} mins
        </span>
      </div>

      <ol className="space-y-4 relative">
        {STEPS.map((step, index) => {
          const isDone = index < currentIdx || (orderStatus === 'COMPLETED' && index === 3);
          const isActive = index === currentIdx && orderStatus !== 'COMPLETED';

          let badgeClasses = 'bg-[#F5F5F4] border-[#D6D3D1]';
          let cardClasses = 'opacity-65';

          if (isDone) {
            badgeClasses = 'bg-brand-forest border-brand-forest';
            cardClasses = 'opacity-95';
          } else if (isActive && step.key === 'RECEIVED') {
            badgeClasses = 'bg-[#FEF3C7] border-[#FCD34D] shadow-soft';
            cardClasses = 'opacity-100';
          } else if (isActive && step.key === 'PREPARING') {
            badgeClasses = 'bg-[#FFEDD5] border-[#FDBA74] shadow-amber-glow';
            cardClasses = 'opacity-100';
          } else if (isActive && step.key === 'READY') {
            badgeClasses = 'bg-[#DCFCE7] border-[#86EFAC] shadow-leaf-glow';
            cardClasses = 'opacity-100';
          } else if (isActive) {
            badgeClasses = 'bg-[#F5F5F4] border-[#D6D3D1]';
            cardClasses = 'opacity-100';
          }

          return (
            <li key={step.key} className={`flex items-start gap-3.5 relative ${cardClasses}`}>
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-4 top-9 bottom-[-16px] w-0.5 ${
                    index < currentIdx ? 'bg-brand-forest' : 'bg-brand-border'
                  }`}
                />
              ) : null}

              <div
                className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 transition-all ${badgeClasses}`}
              >
                {renderStepIcon(step.key, isActive, isDone)}
              </div>

              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-brand-black">{step.label}</p>
                  {isActive && step.key === 'RECEIVED' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#FEF3C7] text-[#78350F] border border-[#FCD34D]">
                      Pending
                    </span>
                  ) : null}
                  {isActive && step.key === 'PREPARING' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#FFEDD5] text-[#7C2D12] border border-[#FDBA74]">
                      Brewing Now
                    </span>
                  ) : null}
                  {isActive && step.key === 'READY' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC]">
                      Ready for Pickup
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-brand-muted mt-0.5">{step.subtitle}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
