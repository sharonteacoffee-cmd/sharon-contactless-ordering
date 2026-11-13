import { useEffect, useState } from 'react';
import { Flame, Plus, Sparkles } from 'lucide-react';
import type { PublicMenuItem } from '@sharon/shared';
import { SharonLogo } from '@/components/common/SharonLogo';
import { formatINR } from '@/utils/currency';

interface MenuCardProps {
  item: PublicMenuItem;
  cartQuantity?: number;
  hasModifiers?: boolean;
  onSelect: (item: PublicMenuItem) => void;
}

export function MenuCard({
  item,
  cartQuantity = 0,
  hasModifiers = false,
  onSelect,
}: MenuCardProps) {
  const [imgError, setImgError] = useState(false);
  const isSoldOut = !item.isAvailable;

  useEffect(() => {
    setImgError(false);
  }, [item.imageUrl]);

  return (
    <article
      className={`glass-light rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 ${
        isSoldOut
          ? 'opacity-60 grayscale-[65%] cursor-not-allowed'
          : 'hover:shadow-elevated hover:-translate-y-0.5'
      }`}
    >
      <div>
        {/* Studio Image Frame - Square on mobile for compact layout, 4:5 on tablets+ */}
        <div className="relative w-full aspect-square sm:aspect-[4/5] rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-brand-forest/10 via-brand-cream to-brand-amber/15 mb-2 sm:mb-2.5">
          {item.imageUrl && !imgError ? (
            <img
              key={item.imageUrl ?? 'no-image'}
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-brand-forest/60 gap-1.5 p-2 bg-brand-cream/80">
              <SharonLogo size="sm" variant="badge" className="opacity-75" />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-brand-forest/70">
                Sharon Brew
              </span>
            </div>
          )}

          {/* Top Veg / Non-Veg indicator + Bestseller Tag */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
            {item.isVegetarian ? (
              <span
                title="100% Vegetarian"
                className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-white/95 backdrop-blur-sm border border-brand-leaf flex items-center justify-center shadow-sm shrink-0"
              >
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-brand-leaf" />
              </span>
            ) : (
              <span
                title="Contains Egg / Non-Vegetarian"
                className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-white/95 backdrop-blur-sm border border-brand-rust flex items-center justify-center shadow-sm shrink-0"
              >
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-brand-rust" />
              </span>
            )}

            {item.isBestseller && !isSoldOut ? (
              <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wide bg-brand-amber text-brand-black shadow-sm shrink-0">
                <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="truncate max-w-[65px] sm:max-w-none">Bestseller</span>
              </span>
            ) : null}
          </div>

          {isSoldOut ? (
            <div className="absolute inset-0 bg-brand-black/60 backdrop-blur-[2px] flex items-center justify-center p-2 text-center">
              <span className="px-2.5 py-1 rounded-full bg-white/95 text-brand-black text-[10px] sm:text-xs font-bold tracking-wide uppercase">
                Sold Out
              </span>
            </div>
          ) : null}

          {cartQuantity > 0 && !isSoldOut ? (
            <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-brand-burgundy text-white text-[10px] sm:text-xs font-bold shadow-md">
              {cartQuantity} in tray
            </div>
          ) : null}
        </div>

        <h3 className="font-semibold text-xs sm:text-sm md:text-base text-brand-black leading-snug line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
          {item.name}
        </h3>

        {item.description ? (
          <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-brand-muted line-clamp-2 leading-relaxed min-h-[1.75rem] sm:min-h-[2rem]">
            {item.description}
          </p>
        ) : (
          <div className="min-h-[1.75rem] sm:min-h-[2rem]" />
        )}
      </div>

      {/* Price + Forest Green Primary Add CTA */}
      <div className="mt-2.5 sm:mt-3 pt-2 border-t border-brand-border flex items-center justify-between gap-1 sm:gap-2">
        <span className="text-sm sm:text-base font-bold text-brand-black tabular-price shrink-0">
          {formatINR(item.price)}
        </span>

        <button
          type="button"
          disabled={isSoldOut}
          onClick={() => onSelect(item)}
          className={`inline-flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold shrink-0 transition-transform ${
            isSoldOut
              ? 'bg-brand-grey/60 text-brand-muted cursor-not-allowed'
              : 'btn-forest-primary active:scale-95'
          }`}
        >
          <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>{hasModifiers ? 'Custom' : 'Add'}</span>
          {hasModifiers && !isSoldOut ? (
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-80" />
          ) : null}
        </button>
      </div>
    </article>
  );
}
