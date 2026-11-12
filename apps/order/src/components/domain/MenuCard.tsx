import { useEffect, useState } from 'react';
import { Coffee, Flame, Plus, Sparkles } from 'lucide-react';
import type { PublicMenuItem } from '@sharon/shared';
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
      className={`glass-light rounded-3xl p-3 flex flex-col justify-between transition-all duration-200 ${
        isSoldOut
          ? 'opacity-60 grayscale-[65%] cursor-not-allowed'
          : 'hover:shadow-elevated hover:-translate-y-0.5'
      }`}
    >
      <div>
        {/* 4:5 Studio Image Frame */}
        <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-br from-brand-forest/10 via-brand-cream to-brand-amber/15 mb-3">
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
            <div className="w-full h-full flex flex-col items-center justify-center text-brand-forest/45 gap-2">
              <Coffee className="w-10 h-10" />
              <span className="text-[11px] font-medium tracking-wide uppercase">
                Sharon Brew
              </span>
            </div>
          )}

          {/* Top-left Veg / Non-Veg indicator + Bestseller Tag */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
            {item.isVegetarian ? (
              <span
                title="100% Vegetarian"
                className="w-5 h-5 rounded-md bg-white/95 backdrop-blur-sm border border-brand-leaf flex items-center justify-center shadow-sm"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-brand-leaf" />
              </span>
            ) : (
              <span
                title="Contains Egg / Non-Vegetarian"
                className="w-5 h-5 rounded-md bg-white/95 backdrop-blur-sm border border-brand-rust flex items-center justify-center shadow-sm"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-brand-rust" />
              </span>
            )}

            {item.isBestseller && !isSoldOut ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-brand-amber text-brand-black shadow-sm">
                <Flame className="w-3 h-3" />
                Bestseller
              </span>
            ) : null}
          </div>

          {isSoldOut ? (
            <div className="absolute inset-0 bg-brand-black/55 backdrop-blur-[2px] flex items-center justify-center p-2">
              <span className="px-3 py-1 rounded-full bg-white/95 text-brand-black text-xs font-bold tracking-wide uppercase">
                Sold Out Today
              </span>
            </div>
          ) : null}

          {cartQuantity > 0 && !isSoldOut ? (
            <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full bg-brand-burgundy text-white text-xs font-bold shadow-md">
              {cartQuantity} in tray
            </div>
          ) : null}
        </div>

        <h3 className="font-semibold text-sm sm:text-base text-brand-black leading-snug line-clamp-2">
          {item.name}
        </h3>

        {item.description ? (
          <p className="mt-1 text-xs text-brand-muted line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        ) : null}
      </div>

      {/* Price + Forest Green Primary Add CTA */}
      <div className="mt-3 pt-2 border-t border-brand-border flex items-center justify-between gap-2">
        <span className="text-base font-bold text-brand-black tabular-price">
          {formatINR(item.price)}
        </span>

        <button
          type="button"
          disabled={isSoldOut}
          onClick={() => onSelect(item)}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
            isSoldOut
              ? 'bg-brand-grey/60 text-brand-muted cursor-not-allowed'
              : 'btn-forest-primary active:scale-95'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{hasModifiers ? 'Customize' : 'Add'}</span>
          {hasModifiers && !isSoldOut ? <Sparkles className="w-3 h-3 opacity-80" /> : null}
        </button>
      </div>
    </article>
  );
}
