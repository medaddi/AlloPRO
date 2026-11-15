/**
 * AlloPro — Client Mode tab bar (Accueil, Carte, Réservations, Profil).
 * The pro profile route lives in this group but is hidden from the tab bar.
 */
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarCheck, House, Map, UserRound } from 'lucide-react-native';

import { colors, getFontFamily } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';

export default function ClientLayout() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.DEFAULT,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.background.surface,
          borderTopColor: colors.border.DEFAULT,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: getFontFamily(lang, 'semibold'),
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen name="pro/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
