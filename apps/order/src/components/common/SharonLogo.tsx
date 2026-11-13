import React from 'react';

interface SharonLogoProps {
  className?: string;
  variant?: 'full' | 'badge' | 'text-only' | 'light';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const SharonLogo: React.FC<SharonLogoProps> = ({
  className = '',
  variant = 'badge',
  size = 'md',
}) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10 sm:h-11 sm:w-11',
    lg: 'h-12 w-12 sm:h-14 sm:w-14',
    xl: 'h-16 w-16 sm:h-20 sm:w-20',
  }[size];

  if (variant === 'badge') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <img
          src="/Sharon_logo.jpg"
          alt="Sharon Tea and Coffee"
          className={`rounded-full object-cover aspect-square shadow-sm border border-brand-black/15 bg-white ${sizeClasses}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/logo.png';
          }}
        />
      </div>
    );
  }

  if (variant === 'text-only') {
    return (
      <div className={`flex flex-col justify-center leading-none select-none ${className}`}>
        <span
          className={`font-display font-extrabold tracking-tight text-brand-forest ${
            size === 'xs' ? 'text-sm' : size === 'sm' ? 'text-base' : size === 'md' ? 'text-xl' : 'text-2xl'
          }`}
        >
          SHARON
        </span>
        <span
          className={`font-bold uppercase tracking-[0.22em] text-brand-amber ${
            size === 'xs' ? 'text-[8px]' : size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : 'text-xs'
          }`}
        >
          Tea &amp; Coffee
        </span>
      </div>
    );
  }

  // Full Brand Lockup (Badge + Typography)
  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 select-none ${className}`}>
      <div className={`relative shrink-0 ${sizeClasses}`}>
        <img
          src="/Sharon_logo.jpg"
          alt="Sharon Tea and Coffee"
          className={`h-full w-full rounded-full object-cover aspect-square bg-white ${
            variant === 'light'
              ? 'border-2 border-white/20 ring-1 ring-white/20 shadow-md'
              : 'border border-brand-black/15 shadow-sm'
          }`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/logo.png';
          }}
        />
      </div>

      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-display font-extrabold tracking-tight ${
            variant === 'light' ? 'text-white' : 'text-brand-forest'
          } ${
            size === 'xs'
              ? 'text-sm'
              : size === 'sm'
                ? 'text-base sm:text-lg'
                : size === 'md'
                  ? 'text-lg sm:text-xl'
                  : 'text-2xl'
          }`}
        >
          SHARON
        </span>
        <span
          className={`font-bold uppercase tracking-[0.22em] text-brand-amber ${
            size === 'xs'
              ? 'text-[8px]'
              : size === 'sm'
                ? 'text-[9px]'
                : size === 'md'
                  ? 'text-[10px]'
                  : 'text-xs'
          }`}
        >
          Tea &amp; Coffee
        </span>
      </div>
    </div>
  );
};

export default SharonLogo;
