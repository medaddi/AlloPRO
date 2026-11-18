/**
 * ALLO LM3LM — Dynamic Expo config.
 * Extends app.json with secrets that must not be committed:
 *   GOOGLE_MAPS_API_KEY  → Android map tiles (react-native-maps / Google provider)
 * Set it in .env for local builds, or as an EAS secret for cloud builds:
 *   eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value <key>
 */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    console.warn('[ALLO LM3LM] GOOGLE_MAPS_API_KEY is not set: the Android map will render blank.');
  }

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...(config.android?.config ?? {}),
        googleMaps: { apiKey: googleMapsApiKey ?? '' },
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config ?? {}),
        googleMapsApiKey: googleMapsApiKey ?? '',
      },
    },
  };
};
