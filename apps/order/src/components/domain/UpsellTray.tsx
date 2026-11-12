import { Coffee, Plus } from 'lucide-react';
import type { PublicMenuItem } from '@sharon/shared';
import { formatINR } from '@/utils/currency';

interface UpsellTrayProps {
  items: PublicMenuItem[];
  onQuickAdd: (item: PublicMenuItem) => void;
}

export function UpsellTray({ items, onQuickAdd }: UpsellTrayProps) {
  const availableUpsells = items.filter((item) => item.isAvailable);

  if (availableUpsells.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-brand-black flex items-center gap-2">
          <span>Pairs Best With Your Chai</span>
          <span aria-hidden="true">☕</span>
        </h2>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-chai">
          1-Tap Add
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {availableUpsells.map((item) => (
          <div
            key={item.id}
            className="min-w-[205px] max-w-[220px] shrink-0 glass-light rounded-3xl p-3 flex items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-brand-forest/10 shrink-0 flex items-center justify-center">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Coffee className="w-6 h-6 text-brand-forest/55" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-brand-black truncate">{item.name}</p>
              <p className="text-xs font-bold text-brand-chai tabular-price mt-0.5">
                {formatINR(item.price)}
              </p>
              <button
                type="button"
                onClick={() => onQuickAdd(item)}
                className="btn-forest-primary mt-1.5 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
