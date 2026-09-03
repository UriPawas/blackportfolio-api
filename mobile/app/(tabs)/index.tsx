import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { accountApi } from '@/src/data/api';
import { useSession } from '@/src/auth/session';
import { useTheme } from '@/src/design/theme';
import { font, space } from '@/src/design/tokens';
import { Delta, Label, Metric, Plate, Row, ScreenReveal, Sparkline, V4Button } from '@/src/components/ui';

const watchlist = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: '$214.05', delta: 1.18 },
  { symbol: 'BTC-USD', name: 'Bitcoin', price: '$106,784', delta: -0.64 },
  { symbol: 'NAFTRAC.MX', name: 'iShares Naftrac', price: '$61.92', delta: 0.42 },
];

export default function HomeScreen() {
  const { user } = useSession(); const { colors } = useTheme(); const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false); const [portfolioCount, setPortfolioCount] = useState<number | null>(null);
  const isWide = width >= 720;
  const sync = useCallback(async () => {
    setRefreshing(true);
    try { const data = await accountApi.bootstrap(); setPortfolioCount(data.portfolios?.length ?? 0); }
    catch { setPortfolioCount(null); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { sync().catch(() => undefined); }, [sync]);

  return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.paper }]}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={sync} tintColor={colors.cobalt} />} contentContainerStyle={styles.scroll}>
      <ScreenReveal>
        <View style={styles.topline}><View><Text style={[styles.brand, { color: colors.ink }]}><Text style={{ fontFamily: font.serifSemibold }}>Black</Text>Portfolio</Text><Text style={[styles.greeting, { color: colors.ink3 }]}>Centro de inversión · {user?.displayName ?? 'Usuario'}</Text></View><Text style={[styles.plan, { color: colors.cobaltInk, borderColor: colors.ruleStrong }]}>Advisor Pro</Text></View>
        <View style={[styles.heading, { borderBottomColor: colors.rule }]}><View><Text style={[styles.pageTitle, { color: colors.ink }]}>Tu lectura de hoy</Text><Text style={[styles.lede, { color: colors.ink2 }]}>Primero lo que cambió; después, dónde mirar.</Text></View><V4Button variant="quiet" onPress={() => router.push('/section/analyzer')}>Ver riesgo</V4Button></View>

        <View style={[styles.primaryRow, isWide && styles.primaryRowWide]}>
          <Plate title="Núcleo global" meta="Valor consolidado · cierre de hoy" style={[styles.heroPlate, isWide && styles.heroPlateWide]}>
            <View style={styles.heroBody}><Metric label="Valor actual" value="$85,008.65" delta={1.39} /><View style={styles.heroStats}><View><Label>Retorno total</Label><Text style={[styles.stat, { color: colors.positive }]}>+42.55%</Text></View><View><Label>Posiciones</Label><Text style={[styles.stat, { color: colors.ink }]}>{portfolioCount === null ? '6' : portfolioCount}</Text></View><View><Label>Efectivo</Label><Text style={[styles.stat, { color: colors.ink }]}>$3,412</Text></View></View></View>
            <View style={[styles.sparkRule, { borderTopColor: colors.ruleSoft }]}><Sparkline fill values={[35, 34, 37, 36, 44, 42, 48, 55, 53, 66, 68]} /></View>
          </Plate>
          <Plate title="Riesgo" meta="Ventana de 1 año" style={styles.riskPlate}>
            <View>{[['Volatilidad anual', '18.61%'], ['VaR 95% diario', '−2.11%'], ['Sharpe', '1.42'], ['Mayor exposición', 'BTC · 31.5%']].map(([label, value], index) => <Row key={label} title={label} trailing={<Text style={[styles.rowValue, { color: value.startsWith('−') ? colors.negative : colors.ink }]}>{value}</Text>} last={index === 3} />)}</View>
          </Plate>
        </View>

        <View style={[styles.sectionTitle, { borderBottomColor: colors.rule }]}><Text style={[styles.sectionHeading, { color: colors.ink }]}>Mercado bajo observación</Text><V4Button variant="text" onPress={() => router.push('/markets')}>Abrir mercados</V4Button></View>
        <Plate><View>{watchlist.map((item, index) => <Row key={item.symbol} title={item.symbol} detail={item.name} trailing={<View style={styles.quote}><Text style={[styles.quotePrice, { color: colors.ink }]}>{item.price}</Text><Delta value={item.delta} /></View>} last={index === watchlist.length - 1} onPress={() => router.push('/markets')} />)}</View></Plate>

        <View style={[styles.twoColumn, isWide && styles.twoColumnWide]}>
          <Plate title="Sectores hoy" meta="Rendimiento de mercado"><View style={styles.heatmap}><HeatCell label="Tecnología" value="+1.4%" flex={4} /><HeatCell label="Salud" value="+0.3%" flex={2} /><HeatCell label="Finanzas" value="−0.6%" flex={3} /><HeatCell label="Energía" value="+0.7%" flex={2} /></View></Plate>
          <Plate title="Próximos eventos" meta="30 días"><View><Row title="Resultados AAPL" detail="31 julio · posterior al cierre" trailing={<Text style={[styles.event, { color: colors.cobaltInk }]}>6 d</Text>} /><Row title="Dividendo NAFTRAC" detail="8 agosto · fecha ex-dividendo" trailing={<Text style={[styles.event, { color: colors.cobaltInk }]}>14 d</Text>} last /></View></Plate>
        </View>
        <Text style={[styles.caption, { color: colors.ink3 }]}>Las cifras se actualizan desde tu cuenta cuando hay conexión. Los módulos de análisis mantienen sus límites de plan en servidor.</Text>
      </ScreenReveal>
    </ScrollView>
  </SafeAreaView>;
}

function HeatCell({ label, value, flex }: { label: string; value: string; flex: number }) {
  const { colors } = useTheme(); const positive = value.startsWith('+');
  return <View style={[styles.heatCell, { flex, backgroundColor: positive ? colors.cobaltTint : colors.sunken, borderColor: colors.rule }]}><Text style={[styles.heatLabel, { color: colors.ink }]}>{label}</Text><Text style={[styles.heatValue, { color: positive ? colors.positive : colors.negative }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, scroll: { padding: space.x4, paddingBottom: space.x7, gap: space.x5 }, topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.x3 }, brand: { fontFamily: font.sans, fontSize: 18, letterSpacing: -0.45 }, greeting: { fontFamily: font.sans, fontSize: 12, marginTop: 3 }, plan: { fontFamily: font.semibold, fontSize: 11, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 2 },
  heading: { paddingBottom: space.x4, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.x3 }, pageTitle: { fontFamily: font.serif, fontSize: 31, letterSpacing: -0.85 }, lede: { fontFamily: font.sans, fontSize: 13, marginTop: 5 },
  primaryRow: { gap: space.x4 }, primaryRowWide: { flexDirection: 'row', alignItems: 'stretch' }, heroPlate: { minHeight: 225 }, heroPlateWide: { flex: 1.28 }, riskPlate: { flex: 0.72 }, heroBody: { padding: space.x4, gap: space.x5 }, heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.x5 }, stat: { fontFamily: font.semibold, fontSize: 14, marginTop: 4, fontVariant: ['tabular-nums'] }, sparkRule: { paddingHorizontal: space.x4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  rowValue: { fontFamily: font.semibold, fontSize: 13, fontVariant: ['tabular-nums'] }, sectionTitle: { paddingBottom: space.x2, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionHeading: { fontFamily: font.serif, fontSize: 23, letterSpacing: -0.45 }, quote: { alignItems: 'flex-end', gap: 2 }, quotePrice: { fontFamily: font.semibold, fontSize: 13, fontVariant: ['tabular-nums'] },
  twoColumn: { gap: space.x4 }, twoColumnWide: { flexDirection: 'row' }, heatmap: { minHeight: 190, padding: space.x3, gap: space.x2, flexDirection: 'row', flexWrap: 'wrap' }, heatCell: { minHeight: 76, padding: space.x3, justifyContent: 'space-between', borderWidth: 1 }, heatLabel: { fontFamily: font.medium, fontSize: 12 }, heatValue: { fontFamily: font.semibold, fontSize: 12, fontVariant: ['tabular-nums'] }, event: { fontFamily: font.semibold, fontSize: 13 }, caption: { fontFamily: font.sans, fontSize: 11, lineHeight: 17, maxWidth: 610 },
});
