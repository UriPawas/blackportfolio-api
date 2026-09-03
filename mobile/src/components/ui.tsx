import * as Haptics from 'expo-haptics';
import { PropsWithChildren, ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useTheme } from '@/src/design/theme';
import { font, space } from '@/src/design/tokens';

type ButtonProps = PropsWithChildren<{ onPress: () => void; variant?: 'primary' | 'quiet' | 'text'; disabled?: boolean; style?: StyleProp<ViewStyle> }>;

export function V4Button({ children, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const { colors } = useTheme();
  const palette = variant === 'primary'
    ? { backgroundColor: colors.cobalt, borderColor: colors.cobalt, color: '#FFFFFF' }
    : variant === 'quiet'
      ? { backgroundColor: 'transparent', borderColor: colors.ruleStrong, color: colors.ink2 }
      : { backgroundColor: 'transparent', borderColor: 'transparent', color: colors.cobaltInk };
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress(); }}
      style={({ pressed }) => [styles.button, palette, variant === 'text' && styles.textButton, disabled && styles.disabled, pressed && styles.pressed, style]}
    >
      <Text style={[styles.buttonText, { color: palette.color }, variant === 'text' && styles.textButtonLabel]}>{children}</Text>
    </Pressable>
  );
}

export function Plate({ title, meta, action, children, style }: PropsWithChildren<{ title?: string; meta?: string; action?: ReactNode; style?: StyleProp<ViewStyle> }>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.plate, { backgroundColor: colors.surface, borderColor: colors.rule, shadowColor: colors.shadow }, style]}>
      <View style={[styles.emissionRule, { backgroundColor: colors.cobalt }]} />
      {(title || meta || action) ? <View style={[styles.plateHead, { borderBottomColor: colors.ruleSoft }]}>
        <View style={styles.plateTitleBlock}>{title ? <Text style={[styles.plateTitle, { color: colors.ink }]}>{title}</Text> : null}{meta ? <Text style={[styles.meta, { color: colors.ink3 }]}>{meta}</Text> : null}</View>
        {action}
      </View> : null}
      {children}
    </View>
  );
}

export function Label({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.ink3 }, style]}>{children}</Text>;
}

export function Delta({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const { colors } = useTheme();
  const positive = value >= 0;
  return <Text style={[styles.delta, { color: positive ? colors.positive : colors.negative }]}>{positive ? '+' : '−'}{Math.abs(value).toFixed(2)}{suffix}</Text>;
}

export function Metric({ label, value, delta, compact }: { label: string; value: string; delta?: number; compact?: boolean }) {
  const { colors } = useTheme();
  return <View style={[styles.metric, compact && styles.metricCompact]}><Label>{label}</Label><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, compact && styles.metricValueCompact, { color: colors.ink }]}>{value}</Text>{delta !== undefined ? <Delta value={delta} /> : null}</View>;
}

export function Row({ leading, title, detail, trailing, onPress, last }: { leading?: ReactNode; title: string; detail?: string; trailing?: ReactNode; onPress?: () => void; last?: boolean }) {
  const { colors } = useTheme();
  const content = <View style={[styles.row, !last && { borderBottomColor: colors.ruleSoft, borderBottomWidth: StyleSheet.hairlineWidth }]}>{leading}<View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.ink }]}>{title}</Text>{detail ? <Text style={[styles.rowDetail, { color: colors.ink3 }]}>{detail}</Text> : null}</View>{trailing}</View>;
  if (!onPress) return content;
  return <Pressable onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress(); }} style={({ pressed }) => pressed && styles.pressed}>{content}</Pressable>;
}

export function Sparkline({ values, color, fill }: { values: number[]; color?: string; fill?: boolean }) {
  const { colors } = useTheme();
  const max = Math.max(...values); const min = Math.min(...values); const range = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${35 - ((value - min) / range) * 28}`).join(' ');
  const lineColor = color ?? colors.cobaltLine;
  const area = `M 0 36 L ${points.replace(/ /g, ' L ')} L 100 36 Z`;
  return <Svg width="100%" height={40} viewBox="0 0 100 40" preserveAspectRatio="none">{fill ? <Path d={area} fill={lineColor} fillOpacity={0.12} /> : null}<Polyline points={points} fill="none" stroke={lineColor} strokeWidth={1.75} vectorEffect="non-scaling-stroke" /></Svg>;
}

export function ScreenReveal({ children }: PropsWithChildren) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => { Animated.parallel([
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
  ]).start(); }, [opacity, translateY]);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export const styles = StyleSheet.create({
  button: { minHeight: 44, paddingHorizontal: space.x4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 2 },
  buttonText: { fontFamily: font.semibold, fontSize: 13, textAlign: 'center' }, textButton: { minHeight: 32, paddingHorizontal: 0, alignItems: 'flex-start' }, textButtonLabel: { textDecorationLine: 'underline', textDecorationStyle: 'solid', textDecorationColor: 'currentColor' },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.86 }, disabled: { opacity: 0.45 },
  plate: { borderWidth: 1, borderRadius: 2, overflow: 'hidden', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 2 },
  emissionRule: { height: 2 }, plateHead: { minHeight: 56, paddingHorizontal: space.x4, paddingVertical: space.x3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, gap: space.x3 }, plateTitleBlock: { flex: 1, gap: 3 }, plateTitle: { fontFamily: font.serif, fontSize: 19, letterSpacing: -0.25 },
  meta: { fontFamily: font.medium, fontSize: 11, lineHeight: 15 }, label: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  delta: { fontFamily: font.semibold, fontSize: 12, fontVariant: ['tabular-nums'] }, metric: { gap: 4, flex: 1, minWidth: 132 }, metricCompact: { minWidth: 92 }, metricValue: { fontFamily: font.serif, fontSize: 30, letterSpacing: -0.8, fontVariant: ['tabular-nums'] }, metricValueCompact: { fontSize: 21 },
  row: { minHeight: 64, paddingHorizontal: space.x4, paddingVertical: space.x3, flexDirection: 'row', alignItems: 'center', gap: space.x3 }, rowCopy: { flex: 1, gap: 3 }, rowTitle: { fontFamily: font.medium, fontSize: 14 }, rowDetail: { fontFamily: font.sans, fontSize: 12, lineHeight: 17 },
});
