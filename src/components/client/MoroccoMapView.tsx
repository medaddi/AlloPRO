/**
 * AlloPro — Styled map of Morocco with live pro pins.
 * Pin = category icon + status dot (green open / grey closed) + price or wait.
 * Uses the custom style that hides country borders (undivided Morocco).
 */
import { forwardRef, memo, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import mapStyle from '../../constants/mapStyleMorocco.json';
import { MOROCCO_REGION, type LatLng } from '../../constants/moroccoCities';
import { colors, fontFamilies } from '../../constants/theme';
import { formatMAD } from '../../lib/whatsapp';
import { getCategoryIcon } from '../ui/CategoryIcon';
import type { ProListItem } from './ProCard';

type Props = {
  pros: ProListItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  initialRegion?: Region;
  showsUserLocation?: boolean;
  bottomPadding?: number;
};

const MoroccoMapView = forwardRef<MapView, Props>(function MoroccoMapView(
  { pros, selectedId, onSelect, initialRegion = MOROCCO_REGION, showsUserLocation = true, bottomPadding = 0 },
  ref,
) {
  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      customMapStyle={mapStyle}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      mapPadding={{ top: 0, left: 0, right: 0, bottom: bottomPadding }}
      onPress={(e) => {
        if (e.nativeEvent.action !== 'marker-press') onSelect(null);
      }}
    >
      {pros.map((pro) => (
        <ProMarker key={pro.id} pro={pro} selected={pro.id === selectedId} onPress={() => onSelect(pro.id)} />
      ))}
    </MapView>
  );
});

export default MoroccoMapView;

const ProMarker = memo(function ProMarker({
  pro,
  selected,
  onPress,
}: {
  pro: ProListItem;
  selected: boolean;
  onPress: () => void;
}) {
  // Custom marker views are bitmaps on Android: track changes only briefly after an update.
  const [tracks, setTracks] = useState(true);
  const waiting = Math.max(0, pro.last_issued_ticket - pro.current_queue_number);
  const engine = pro.category?.booking_type ?? 'appointment';
  const label =
    engine === 'queue'
      ? `${waiting}`
      : pro.min_price_mad != null && pro.min_price_mad > 0
        ? formatMAD(pro.min_price_mad)
        : null;

  useEffect(() => {
    setTracks(true);
    const id = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(id);
  }, [selected, pro.is_open, label]);

  const Icon = getCategoryIcon(pro.category?.icon);
  const coordinate: LatLng = { latitude: pro.latitude, longitude: pro.longitude };

  return (
    <Marker
      coordinate={coordinate}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={selected ? 10 : pro.is_open ? 2 : 1}
      accessibilityLabel={pro.business_name}
    >
      <View style={[styles.pinWrap, selected && styles.pinSelected]}>
        <View style={[styles.bubble, selected && styles.bubbleSelected, !pro.is_open && styles.bubbleClosed]}>
          <Icon size={16} color={selected ? colors.text.inverse : colors.primary.DEFAULT} strokeWidth={2.4} />
          {!!label && (
            <Text style={[styles.label, selected && { color: colors.text.inverse }]} numberOfLines={1}>
              {label}
            </Text>
          )}
          <View style={[styles.dot, { backgroundColor: pro.is_open ? colors.status.online : colors.status.closed }]} />
        </View>
        <View style={[styles.pointer, selected && { borderTopColor: colors.primary.DEFAULT }]} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  pinWrap: {
    alignItems: 'center',
  },
  pinSelected: {
    transform: [{ scale: 1.12 }],
  },
  bubble: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.background.surface,
    borderWidth: 1.5,
    borderColor: colors.secondary.teal,
  },
  bubbleSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.accent.DEFAULT,
  },
  bubbleClosed: {
    opacity: 0.75,
    borderColor: colors.border.strong,
  },
  label: {
    fontFamily: fontFamilies.fr.bold,
    fontSize: 12,
    color: colors.primary.DEFAULT,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.background.surface,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.secondary.teal,
    marginTop: -1,
  },
});
