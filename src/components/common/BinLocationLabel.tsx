import React from 'react';
import { MapPin, TriangleAlert } from 'lucide-react';
import { SmartBin } from '../../types';

interface BinLocationLabelProps {
  bin: Pick<SmartBin, 'status' | 'location'>;
  className?: string;
}

/**
 * A bin's registered address (bins.address) and its live connection status
 * (bin_current_state.connection_status) are two independent facts — the
 * address doesn't vanish just because the device is currently unreachable.
 * But showing them with equal confidence reads as contradictory ("how do we
 * know exactly where this is if it's offline?"). This makes the distinction
 * visible instead of silent.
 */
export const BinLocationLabel: React.FC<BinLocationLabelProps> = ({ bin, className = '' }) => {
  const isOffline = bin.status === 'offline';

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {isOffline ? (
        <TriangleAlert className="h-3 w-3 shrink-0 text-amber-500" />
      ) : (
        <MapPin className="h-3 w-3 shrink-0 text-blue-500" />
      )}
      <span>{bin.location.address}</span>
      {isOffline && <span className="text-slate-400">· last known</span>}
    </span>
  );
};
