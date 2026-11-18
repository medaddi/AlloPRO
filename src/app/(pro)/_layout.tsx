/**
 * ALLO LM3LM — Pro Mode tab bar (Guichet, Services, Caisse, Réglages).
 * Pros without a shop yet see the shop setup instead of the tabs.
 */
import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, Settings, Ticket, Wallet } from 'lucide-react-native';

import ProShopSetup from '../../components/pro/ProShopSetup';
import { colors, getFontFamily } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { supabase, type ProProfileRow } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';

export default function ProLayout() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();
  const proProfile = useAppStore((s) => s.proProfile);
  const proId = proProfile?.id;

  // Keep the shop profile in sync (open/closed, counters, subscription) from any device.
  useEffect(() => {
    if (!proId) return;
    const channel = supabase
      .channel(`pro-self:${proId}:${Date.now().toString(36)}`)
      .on<ProProfileRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pro_profiles', filter: `id=eq.${proId}` },
        (payload) => {
          if (payload.new && 'id' in payload.new) useAppStore.getState().setProProfile(payload.new as ProProfileRow);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [proId]);

  if (!proProfile) return <ProShopSetup />;

  return (
    <Tabs
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
          title: t('tabs.guichet'),
          tabBarIcon: ({ color, size }) => <Ticket color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: t('tabs.catalog'),
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="caisse"
        options={{
          title: t('tabs.caisse'),
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}
