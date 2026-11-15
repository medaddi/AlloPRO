/**
 * AlloPro — Turn-by-turn directions (Google Maps / Waze), Android & iOS.
 */
import { Linking, Platform } from 'react-native';

export type NavApp = 'google' | 'waze';

const coord = (n: number) => n.toFixed(6);

export function buildDirectionsUrl(lat: number, lng: number, app: NavApp = 'google'): string {
  if (app === 'waze') return `https://waze.com/ul?ll=${coord(lat)},${coord(lng)}&navigate=yes`;
  return `https://www.google.com/maps/dir/?api=1&destination=${coord(lat)},${coord(lng)}&travelmode=driving`;
}

/**
 * Opens navigation to a point. Tries the native app first, then the web URL
 * (which itself hands off to the app when installed).
 */
export async function openDirections(lat: number, lng: number, app: NavApp = 'google'): Promise<boolean> {
  const native =
    app === 'waze'
      ? `waze://?ll=${coord(lat)},${coord(lng)}&navigate=yes`
      : Platform.OS === 'ios'
        ? `comgooglemaps://?daddr=${coord(lat)},${coord(lng)}&directionsmode=driving`
        : `google.navigation:q=${coord(lat)},${coord(lng)}`;
  try {
    await Linking.openURL(native);
    return true;
  } catch {
    try {
      await Linking.openURL(buildDirectionsUrl(lat, lng, app));
      return true;
    } catch {
      return false;
    }
  }
}
