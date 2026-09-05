import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Leaflet frequently miscalculates its own size when it first mounts inside
 * a flex/grid layout, before the container's real dimensions have settled —
 * a well-known cause of a Leaflet map rendering shifted, oversized, or
 * appearing to overlap surrounding page content. Forces a fresh size
 * recalculation right after mount (a single rAF is usually not enough if
 * the map card is still animating in, hence the follow-up timeout) and on
 * window resize. Drop this inside any <MapContainer> in the app.
 */
export const MapAutoSize: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const fix = () => map.invalidateSize();
    const raf = requestAnimationFrame(fix);
    const settleTimeout = setTimeout(fix, 300);
    window.addEventListener('resize', fix);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settleTimeout);
      window.removeEventListener('resize', fix);
    };
  }, [map]);

  return null;
};
