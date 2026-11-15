/**
 * Entry route ("/"). Renders the brand canvas only; the root layout's guard
 * immediately redirects to welcome, sign-up completion, or the active mode.
 */
import { View } from 'react-native';
import { colors } from '../constants/theme';

export default function EntryScreen() {
  return <View style={{ flex: 1, backgroundColor: colors.background.main }} />;
}
