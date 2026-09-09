import { useEffect, useState } from 'react';

export interface LocationDetails {
  primaryTitle: string;
  suburb: string;
  district: string;
  region: string;
  postalCode?: string;
  fullAddress: string;
  formattedCoordinates: string;
  googleMapsUrl: string;
  isGpsLock: boolean;
}

/**
 * Format latitude and longitude into high-precision readable geographic coordinates
 * e.g. 6.671651° N, 1.562522° W
 */
export function formatCoordinates(lat?: number | null, lng?: number | null): string {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return 'Coordinates awaiting lock';
  }
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
}

/**
 * Generates direct Google Maps URL centered on exact coordinates in Satellite view
 */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// In-memory cache for geocoding results to avoid redundant network requests
const geocodeCache = new Map<string, Partial<LocationDetails>>();

/**
 * Known Kumasi anchors for instant synchronous resolution without network lag
 */
function getKnownAnchor(lat: number, lng: number): Partial<LocationDetails> | null {
  // Kotei / KNUST Campus area (ESP32 SB-024 physical bench and surroundings)
  if (Math.abs(lat - 6.6716) < 0.015 && Math.abs(lng - (-1.5625)) < 0.015) {
    return {
      primaryTitle: 'Kotei Road, Kumasi',
      suburb: 'Kotei (KNUST Area)',
      district: 'Oforikrom Municipal',
      region: 'Ashanti Region, Ghana',
      postalCode: 'AK-010-1295',
      fullAddress: 'Kotei Road, Kotei, Oforikrom Municipal District, Ashanti Region, Ghana',
    };
  }

  // Kumasi Central / Adum / Kejetia
  if (Math.abs(lat - 6.690) < 0.03 && Math.abs(lng - (-1.624)) < 0.03) {
    return {
      primaryTitle: 'Central Kumasi',
      suburb: 'Adum / Kejetia Area',
      district: 'Kumasi Metropolitan',
      region: 'Ashanti Region, Ghana',
      fullAddress: 'Adum, Kumasi Metropolitan District, Ashanti Region, Ghana',
    };
  }

  return null;
}

/**
 * Hook to resolve exact human-readable address from live coordinates with instant fallback and cache
 */
export function useExactLocation(
  lat?: number | null,
  lng?: number | null,
  fallbackAddress?: string,
  landmark?: string
): LocationDetails {
  const isGpsLock = Boolean(lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0);

  const [details, setDetails] = useState<Partial<LocationDetails>>(() => {
    if (!isGpsLock || lat == null || lng == null) {
      return {
        primaryTitle: fallbackAddress || 'Kumasi Fleet Mesh',
        suburb: landmark || 'Kumasi',
        district: 'Kumasi District',
        region: 'Ashanti Region, Ghana',
        fullAddress: fallbackAddress || 'Kumasi, Ghana',
      };
    }

    const anchor = getKnownAnchor(lat, lng);
    if (anchor) return anchor;

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey)!;
    }

    return {
      primaryTitle: fallbackAddress || `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      suburb: landmark || 'Kumasi Suburb',
      district: 'Ashanti Region',
      region: 'Ghana',
      fullAddress: fallbackAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    };
  });

  useEffect(() => {
    if (!isGpsLock || lat == null || lng == null) {
      setDetails({
        primaryTitle: fallbackAddress || 'Kumasi Fleet Mesh',
        suburb: landmark || 'Kumasi',
        district: 'Kumasi District',
        region: 'Ashanti Region, Ghana',
        fullAddress: fallbackAddress || 'Kumasi, Ghana',
      });
      return;
    }

    const anchor = getKnownAnchor(lat, lng);
    if (anchor) {
      setDetails(anchor);
      return;
    }

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (geocodeCache.has(cacheKey)) {
      setDetails(geocodeCache.get(cacheKey)!);
      return;
    }

    // Reverse geocode via OpenStreetMap Nominatim for novel locations
    let cancelled = false;
    const controller = new AbortController();

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const addr = data.address || {};
        const road = addr.road || addr.residential || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city || '';
        const district = addr.county || addr.city_district || addr.district || '';
        const state = addr.state || 'Ashanti Region';
        const postcode = addr.postcode || '';

        const primaryTitle = road && suburb ? `${road}, ${suburb}` : road || suburb || fallbackAddress || 'Kumasi';
        const resolved: Partial<LocationDetails> = {
          primaryTitle,
          suburb: suburb || landmark || 'Kumasi Suburb',
          district: district || 'Oforikrom Municipal',
          region: state ? `${state}, Ghana` : 'Ashanti Region, Ghana',
          postalCode: postcode || undefined,
          fullAddress: data.display_name || `${primaryTitle}, ${district}, Ghana`,
        };

        geocodeCache.set(cacheKey, resolved);
        setDetails(resolved);
      })
      .catch(() => {
        // Fallback gracefully on network/rate-limit errors
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lng, isGpsLock, fallbackAddress, landmark]);

  const safeLat = lat ?? 0;
  const safeLng = lng ?? 0;

  return {
    primaryTitle: details.primaryTitle || fallbackAddress || 'Kotei Road, Kumasi',
    suburb: details.suburb || landmark || 'Kotei (KNUST Area)',
    district: details.district || 'Oforikrom Municipal',
    region: details.region || 'Ashanti Region, Ghana',
    postalCode: details.postalCode,
    fullAddress: details.fullAddress || fallbackAddress || 'Kotei Road, Kumasi, Ghana',
    formattedCoordinates: formatCoordinates(lat, lng),
    googleMapsUrl: getGoogleMapsUrl(safeLat, safeLng),
    isGpsLock,
  };
}
