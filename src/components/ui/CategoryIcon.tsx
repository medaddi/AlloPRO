/**
 * AlloPro — Category icon tile.
 * Maps the `categories.icon` value stored in Supabase ('Scissors', 'Wrench', …)
 * to a lucide-react-native icon on a soft tinted square.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Car, Home, Scissors, Stethoscope, Store, Trophy, Wrench, type LucideIcon } from 'lucide-react-native';

import { categoryVisuals, colors, type CategorySlug } from '../../constants/theme';

const ICONS: Record<string, LucideIcon> = {
  Scissors,
  Stethoscope,
  Wrench,
  Car,
  Trophy,
  Home,
};

export const getCategoryIcon = (name: string | null | undefined): LucideIcon =>
  (name && ICONS[name]) || Store;

export const getCategoryTint = (slug: string | null | undefined): string =>
  (slug && categoryVisuals[slug as CategorySlug]?.tint) || colors.secondary.tealLight;

type Props = {
  icon?: string | null;
  slug?: string | null;
  size?: number;
  radius?: number;
  color?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
};

export default function CategoryIcon({
  icon,
  slug,
  size = 48,
  radius = 14,
  color = colors.primary.DEFAULT,
  background,
  style,
}: Props) {
  const Icon = getCategoryIcon(icon ?? (slug ? categoryVisuals[slug as CategorySlug]?.icon : null));
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: background ?? getCategoryTint(slug),
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon size={Math.round(size * 0.48)} color={color} strokeWidth={2.2} />
    </View>
  );
}
