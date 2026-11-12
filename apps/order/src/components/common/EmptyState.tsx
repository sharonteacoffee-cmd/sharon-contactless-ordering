import type { ReactNode } from 'react';
import { Coffee } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="glass-light rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3">
      <div className="w-14 h-14 rounded-full bg-brand-forest/10 text-brand-forest flex items-center justify-center">
        {icon ?? <Coffee className="w-6 h-6" />}
      </div>
      <h3 className="font-display text-lg font-semibold text-brand-black">{title}</h3>
      <p className="text-sm text-brand-muted max-w-xs leading-relaxed">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
