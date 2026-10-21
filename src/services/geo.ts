/**
 * Unified Geolocation and Geocoding Utility for CleanTrack AI
 * Provides resilient multi-tier location detection:
 * 1. Fast Browser Geolocation (Wi-Fi / Cell / GPS)
 * 2. Instant IP-based Geolocation fallback (ipwho.is / ip-api)
 * 3. Reverse Geocoding (Coordinates -> Human Address via Nominatim)
 * 4. Forward Geocoding (Landmark Search via Nominatim)
 */

export interface LocationResult {
  lat: number;
  lng: number;
  accuracy?: number;
  source: 'gps' | 'network' | 'ip' | 'default';
  address?: string;
  city?: string;
}

// 1. Multi-tier User Location Detection
export async function detectCurrentLocation(): Promise<LocationResult> {
  // Step A: Attempt fast browser geolocation with 4-second timeout
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
        );
      });

      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
        source: 'gps',
      };
    } catch (err: any) {
      console.warn('Browser GPS unavailable, falling back to IP geolocation:', err?.message);
    }
  }

  // Step B: Fast IP-based Geolocation fallback (works on desktops without GPS)
  try {
    const ipRes = await fetch('https://ipwho.is/', {
      signal: AbortSignal.timeout(3500),
    });
    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data && data.success && data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 1500,
          source: 'ip',
          city: data.city || data.region || 'Delhi',
        };
      }
    }
  } catch (ipErr) {
    console.warn('IP geolocation failed, trying backup:', ipErr);
  }

  // Step C: Backup IP API
  try {
    const ipRes2 = await fetch('http://ip-api.com/json', {
      signal: AbortSignal.timeout(3000),
    });
    if (ipRes2.ok) {
      const data = await ipRes2.json();
      if (data && data.status === 'success' && data.lat && data.lon) {
        return {
          lat: data.lat,
          lng: data.lon,
          accuracy: 2500,
          source: 'ip',
          city: data.city || 'Delhi',
        };
      }
    }
  } catch {
    // fallback to default
  }

  // Step D: Default to Delhi Central (Connaught Place)
  return {
    lat: 28.6325,
    lng: 77.2185,
    accuracy: 5000,
    source: 'default',
    city: 'New Delhi',
  };
}

// 2. Reverse Geocode Coordinates to Clean Civic Address
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: { 'User-Agent': 'CleanTrackAI/2.0' },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const parts = [
          addr.amenity || addr.shop || addr.building,
          addr.road || addr.street,
          addr.neighbourhood || addr.suburb || addr.residential,
          addr.city || addr.town || addr.state_district,
          addr.postcode,
        ].filter(Boolean);
        return parts.length > 0
          ? parts.join(', ')
          : data.display_name.split(',').slice(0, 3).join(', ');
      }
    }
  } catch (err) {
    console.warn('Reverse geocoding timed out:', err);
  }
  return `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// 3. Forward Geocode Search Landmark / Address
export async function searchLandmarkCoords(query: string): Promise<{
  lat: number;
  lng: number;
  displayName: string;
} | null> {
  try {
    const q = encodeURIComponent(`${query.trim()} Delhi NCR`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
      {
        headers: { 'User-Agent': 'CleanTrackAI/2.0' },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name.split(',').slice(0, 3).join(', '),
        };
      }
    }
  } catch (err) {
    console.warn('Landmark search failed:', err);
  }
  return null;
}
