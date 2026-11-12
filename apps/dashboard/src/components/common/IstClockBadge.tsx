import { useEffect, useState } from 'react';
import { Tag, Tooltip } from 'antd';
import { Clock } from 'lucide-react';
import { formatISTTime } from '@sharon/shared';

interface IstClockBadgeProps {
  isConnected?: boolean;
}

export function IstClockBadge({ isConnected }: IstClockBadgeProps) {
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowIso(new Date().toISOString());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {typeof isConnected === 'boolean' ? (
        <Tooltip
          title={
            isConnected
              ? 'Socket.io Live Push Connected'
              : 'Reconnecting to Real-Time Server...'
          }
        >
          <Tag
            color={isConnected ? 'success' : 'warning'}
            className="m-0 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isConnected ? 'bg-brand-leaf' : 'bg-brand-amber'
              }`}
            />
            {isConnected ? 'Live' : 'Syncing'}
          </Tag>
        </Tooltip>
      ) : null}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-3 py-1 text-xs font-medium text-brand-black tabular-nums">
        <Clock className="h-3.5 w-3.5 text-brand-forest" />
        <span>{formatISTTime(nowIso)} IST</span>
      </div>
    </div>
  );
}
