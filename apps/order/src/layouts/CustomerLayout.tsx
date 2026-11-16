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
        <div className="flex-1 flex flex-col">{children}</div>

        {/* Official Merchant Legal & Contact Information (Cashfree Compliance) */}
        <footer className="mt-8 pt-6 pb-6 px-4 border-t border-brand-border/60 text-center space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-forest/10 text-brand-forest text-xs font-bold uppercase tracking-wider">
            Legal Entity &bull; SHARON TEA STALL
          </div>
          <p className="text-xs text-brand-black font-semibold">
            Legal Trade Name: <span className="font-bold">SHARON TEA STALL</span>
          </p>
          <p className="text-[11px] text-brand-muted">
            Operating as Sharon Tea &amp; Coffee &bull; Authentic Chai, Filter Coffee &amp; Snacks
          </p>
          <div className="text-[11px] text-brand-muted flex items-center justify-center gap-3 flex-wrap pt-1">
            <span>Customer Support: <strong className="text-brand-black">+91 93808 35651</strong></span>
            <span>&bull;</span>
            <span>Email: <strong className="text-brand-black">sharonteacoffee@gmail.com</strong></span>
          </div>
          <p className="text-[11px] text-brand-muted">
            Registered Address: #34, 2nd Main Road, 1st Stage, Indiranagar, Bangalore - 560038
          </p>
          <p className="text-[10px] text-brand-muted/70 pt-2">
            &copy; {new Date().getFullYear()} SHARON TEA STALL. All rights reserved. &bull; Contactless Multi-Outlet Ordering
          </p>
        </footer>
      </div>
    </div>
  );
}
