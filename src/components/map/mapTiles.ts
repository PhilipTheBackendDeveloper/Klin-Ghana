import L from 'leaflet';
import { SmartBin } from '../../types';

/**
 * Light, brand-matching basemap (Esri World Light Gray Canvas) instead of the
 * default OpenStreetMap "standard" tiles, whose bright yellow/pink/green
 * palette clashed with the app's blue/white/slate design system. Esri's
 * gray-canvas basemap is a free, no-API-key XYZ service purpose-built for
 * overlaying colored markers/data (CARTO's free tier now requires a key).
 */
export const MAP_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
export const MAP_LABELS_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
export const MAP_TILE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors';

// Esri's free World Light Gray Canvas has real detail for Kumasi/Accra only
// up to these levels (verified directly against the tile service) — beyond
// them the *base* layer literally returns a placeholder tile with "Map data
// not yet available" baked into the image, and the *reference* (labels)
// layer silently goes blank. Capping maxZoom on both the tile layers and the
// map itself stops Leaflet from ever requesting (or letting a citizen zoom
// into) tiles past the point real data exists — it upscales the last good
// zoom level instead, which reads as "close enough" rather than broken.
export const MAP_MAX_ZOOM = 16;
export const MAP_LABELS_MAX_ZOOM = 13;

const STATUS_COLORS: Record<string, string> = {
  normal: '#1D70F5',
  warning: '#F59E0B',
  critical: '#F59E0B',
  overflow: '#F43F5E',
  offline: '#94A3B8',
};

const colorForBin = (bin: Pick<SmartBin, 'status' | 'currentFillLevel'>): string => {
  if (bin.status === 'offline') return STATUS_COLORS.offline;
  if (bin.status === 'overflow' || bin.currentFillLevel >= 95) return STATUS_COLORS.overflow;
  if (bin.currentFillLevel >= 80) return STATUS_COLORS.warning;
  return STATUS_COLORS.normal;
};

/**
 * Custom SVG divIcon for SmartBin map markers. react-leaflet's default marker
 * image assets don't resolve correctly under Vite, so every map in the app
 * supplies this explicit icon rather than risking a broken/blank pin.
 */
export function createBinMarkerIcon(bin: Pick<SmartBin, 'status' | 'currentFillLevel'>, opts?: { active?: boolean }): L.DivIcon {
  const color = colorForBin(bin);
  const ring = opts?.active ? `<circle cx="18" cy="18" r="15.5" fill="none" stroke="${color}" stroke-width="2" opacity="0.35" />` : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
      <g>
        ${ring}
        <path d="M18 0C8.6 0 1 7.6 1 17c0 11 17 29 17 29s17-18 17-29C35 7.6 27.4 0 18 0Z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="18" cy="17" r="9.5" fill="white"/>
        <text x="18" y="20.5" fill="${color}" font-size="9" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" text-anchor="middle">${Math.round(bin.currentFillLevel)}</text>
      </g>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'smartbin-marker',
    iconSize: [36, 46],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40],
  });
}
