/**
 * AlloPro — 1-to-5 star review after a completed booking.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Star } from 'lucide-react-native';

import { colors, getFontFamily, motion } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { submitReview } from '../../lib/clientData';
import PrimaryButton, { triggerHaptic } from '../ui/PrimaryButton';
import SheetModal from '../ui/SheetModal';
import TextField from '../ui/TextField';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  bookingId: string;
  clientId: string;
  proId: string;
  proName: string;
};

const LABEL_KEYS = ['review.star1', 'review.star2', 'review.star3', 'review.star4', 'review.star5'] as const;

export default function ReviewModal({ visible, onClose, onSubmitted, bookingId, clientId, proId, proName }: Props) {
  const { t, lang } = useAppLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment('');
      setError(null);
    }
  }, [visible]);

  const submit = async () => {
    if (!rating) return;
    setSaving(true);
    setError(null);
    try {
      await submitReview({ bookingId, clientId, proId, rating, comment });
      triggerHaptic('success');
      onSubmitted();
    } catch {
      setError(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={t('review.title')}
      subtitle={`${proName} • ${t('review.subtitle')}`}
      footer={<PrimaryButton title={t('review.submit')} disabled={!rating} loading={saving} onPress={submit} />}
    >
      <View style={styles.stars} accessibilityRole="adjustable" accessibilityValue={{ min: 1, max: 5, now: rating }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarButton
            key={n}
            filled={n <= rating}
            onPress={() => {
              triggerHaptic('light');
              setRating(n);
            }}
            label={t(LABEL_KEYS[n - 1])}
          />
        ))}
      </View>
      <Text style={[styles.ratingLabel, { fontFamily: getFontFamily(lang, 'bold') }]}>
        {rating ? t(LABEL_KEYS[rating - 1]) : ' '}
      </Text>
      <TextField
        value={comment}
        onChangeText={setComment}
        placeholder={t('review.commentPlaceholder')}
        multiline
        maxLength={400}
        error={error}
      />
    </SheetModal>
  );
}

function StarButton({ filled, onPress, label }: { filled: boolean; onPress: () => void; label: string }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={() => {
        scale.value = withSequence(withTiming(1.25, { duration: 90 }), withSpring(1, motion.spring.elastic));
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
    >
      <Animated.View style={style}>
        <Star
          size={40}
          color={filled ? colors.accent.DEFAULT : colors.border.strong}
          fill={filled ? colors.accent.DEFAULT : 'transparent'}
          strokeWidth={1.8}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stars: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 4,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 15,
    color: colors.accent.dark,
  },
});
