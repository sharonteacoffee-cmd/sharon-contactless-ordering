import { Empty } from 'antd';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-border bg-white/80 px-6 py-10 text-center">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div className="space-y-1">
            <div className="text-sm font-semibold text-brand-black">
              {title}
            </div>
            {description ? (
              <div className="text-xs text-brand-muted">{description}</div>
            ) : null}
          </div>
        }
      >
        {action}
      </Empty>
    </div>
  );
}
