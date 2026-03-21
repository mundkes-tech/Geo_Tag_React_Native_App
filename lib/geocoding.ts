




const geocodeCache = new Map<string, string>();

function cacheKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export async function reverseGeocode(latitude: number, longitude: number) {
  const key = cacheKey(latitude, longitude);

  if (geocodeCache.has(key)) {
    return geocodeCache.get(key) as string;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "GeoTag/1.0",
      },
    });

    if (!response.ok) {
      return "Unknown location";
    }

    const data = (await response.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
      };
      display_name?: string;
    };

    const locality =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.state;
    const country = data.address?.country;

    const label =
      (locality && country && `${locality}, ${country}`) ||
      data.display_name ||
      "Unknown location";

    geocodeCache.set(key, label);
    return label;
  } catch {
    return "Unknown location";
  }
}
