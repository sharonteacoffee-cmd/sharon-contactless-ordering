import type { ReactNode } from 'react';

interface CustomerLayoutProps {
  children: ReactNode;
  maxWidthClass?: string;
}

export function CustomerLayout({
  children,
  maxWidthClass = 'max-w-3xl',
}: CustomerLayoutProps) {
  return (
    <div className="min-h-screen bg-brand-cream text-brand-black relative overflow-x-hidden">
      {/* Subtle warm tea-house ambient gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-28 -right-20 w-80 h-80 rounded-full bg-brand-amber/12 blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-72 h-72 rounded-full bg-brand-forest/8 blur-3xl" />
        <div className="absolute -bottom-28 right-1/4 w-96 h-96 rounded-full bg-brand-burgundy/6 blur-3xl" />
      </div>

      <div
        className={`relative z-10 mx-auto w-full ${maxWidthClass} min-h-screen flex flex-col pb-[calc(env(safe-area-inset-bottom,0px)+4rem)]`}
      >
        {children}
      </div>
    </div>
  );
}
