import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/src/design/theme';
import { font } from '@/src/design/tokens';

export default function TabLayout() {
  const { colors } = useTheme();
  return <NativeTabs
    backgroundColor={colors.surface}
    tintColor={colors.cobalt}
    iconColor={{ default: colors.ink3, selected: colors.cobalt }}
    labelStyle={{ default: { fontFamily: font.medium, fontSize: 11, color: colors.ink3 }, selected: { fontFamily: font.semibold, fontSize: 11, color: colors.cobalt } }}
    indicatorColor={colors.cobaltTint}
    rippleColor={colors.cobaltTint}
    disableTransparentOnScrollEdge
    tabBarRespectsIMEInsets
  >
    <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Label>Resumen</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon md={{ default: 'home', selected: 'home' }} /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="portfolio"><NativeTabs.Trigger.Label>Cartera</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon md={{ default: 'pie_chart', selected: 'pie_chart' }} /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="markets"><NativeTabs.Trigger.Label>Mercados</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon md={{ default: 'show_chart', selected: 'show_chart' }} /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="more"><NativeTabs.Trigger.Label>Más</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon md={{ default: 'more_horiz', selected: 'more_horiz' }} /></NativeTabs.Trigger>
  </NativeTabs>;
}
