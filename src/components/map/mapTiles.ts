import L from 'leaflet';
import { SmartBin } from '../../types';

export type MapStyle = 'satellite' | 'street' | 'canvas';

export interface MapLayerConfig {
  id: MapStyle;
  label: string;
  url: string;
  labelsUrl?: string;
  attribution: string;
  maxZoom: number;
  labelsMaxZoom?: number;
  subdomains?: string[];
}

export const MAP_LAYERS: Record<MapStyle, MapLayerConfig> = {
  satellite: {
    id: 'satellite',
    label: 'Satellite (Buildings)',
    // Google Hybrid: High-resolution satellite imagery + building footprints + road overlays
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: 'Imagery &copy; Google Maps',
    maxZoom: 20,
  },
  street: {
    id: 'street',
    label: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
  canvas: {
    id: 'canvas',
    label: 'Light Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    labelsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 16,
    labelsMaxZoom: 13,
  },
};

// Default layer is High-Resolution Satellite so actual buildings, compounds, and roofs are clearly visible
export const MAP_TILE_URL = MAP_LAYERS.satellite.url;
export const MAP_LABELS_TILE_URL = '';
export const MAP_TILE_ATTRIBUTION = MAP_LAYERS.satellite.attribution;
export const MAP_MAX_ZOOM = 20;
export const MAP_LABELS_MAX_ZOOM = 20;

export const getMapLayer = (style: MapStyle = 'satellite'): MapLayerConfig => {
  return MAP_LAYERS[style] || MAP_LAYERS.satellite;
};

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
