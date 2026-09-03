import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/src/design/theme';
import { font, space } from '@/src/design/tokens';
import { Delta, Label, Plate, Row, ScreenReveal, Sparkline } from '@/src/components/ui';

type Section = { title: string; lede: string; label: string; metrics: Array<[string, string, number?]>; note: string };
const content: Record<string, Section> = {
  analyzer: { title: 'Analizador', label: 'Riesgo de cartera', lede: 'Mide la exposición antes de decidir si rebalancear.', metrics: [['Volatilidad anual', '18.61%'], ['VaR 95% diario', '−2.11%', -2.11], ['Máximo drawdown', '−22.41%', -22.41], ['Sharpe', '1.42']], note: 'La concentración en BTC explica la mayor parte del riesgo observado.' },
  optimization: { title: 'Optimización', label: 'Propuesta de asignación', lede: 'Compara una estructura objetivo con tu cartera actual.', metrics: [['Renta variable global', '44%', 1], ['Renta fija corta', '24%', 1], ['Criptoactivos', '20%', -1], ['Efectivo táctico', '12%', 1]], note: 'La propuesta es analítica y no constituye una recomendación personalizada.' },
  topdown: { title: 'Top-down', label: 'Contexto macro', lede: 'Tasas, liquidez y rotación sectorial en una sola lectura.', metrics: [['VIX', '16.8'], ['Tasa Fed', '4.25%'], ['Dólar DXY', '101.3', -1], ['Petróleo WTI', '$68.42', 1]], note: 'El entorno sigue favoreciendo calidad y duración corta; verifica la fuente antes de operar.' },
};

export default function DetailSection() {
  const { slug } = useLocalSearchParams<{ slug: string }>(); const { colors } = useTheme(); const section = content[slug ?? ''] ?? content.analyzer;
  return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.paper }]}><ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}><ScreenReveal>
    <View style={[styles.heading, { borderBottomColor: colors.rule }]}><Label>Herramienta V4</Label><Text style={[styles.title, { color: colors.ink }]}>{section.title}</Text><Text style={[styles.lede, { color: colors.ink2 }]}>{section.lede}</Text></View>
    <Plate title={section.label} meta="Datos ilustrativos para la beta"><View style={styles.chart}><Sparkline fill values={[12, 14, 13, 18, 17, 22, 20, 25, 27, 30]} /></View><View>{section.metrics.map(([label, value, delta], index) => <Row key={label} title={label} trailing={delta === undefined ? <Text style={[styles.value, { color: colors.ink }]}>{value}</Text> : <View style={styles.deltaValue}><Text style={[styles.value, { color: colors.ink }]}>{value}</Text><Delta value={delta} suffix="" /></View>} last={index === section.metrics.length - 1} />)}</View></Plate>
    <Plate title="Lectura" meta="Cómo usar este módulo"><Text style={[styles.note, { color: colors.ink2 }]}>{section.note}</Text></Plate>
  </ScreenReveal></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, scroll: { padding: space.x4, paddingBottom: space.x7, gap: space.x5 }, heading: { gap: 4, paddingBottom: space.x4, borderBottomWidth: 1 }, title: { fontFamily: font.serif, fontSize: 32, letterSpacing: -0.8 }, lede: { fontFamily: font.sans, fontSize: 14, lineHeight: 21 }, chart: { padding: space.x4, paddingBottom: space.x2 }, value: { fontFamily: font.semibold, fontSize: 14, fontVariant: ['tabular-nums'] }, deltaValue: { alignItems: 'flex-end', gap: 2 }, note: { fontFamily: font.sans, padding: space.x4, fontSize: 14, lineHeight: 22 } });
