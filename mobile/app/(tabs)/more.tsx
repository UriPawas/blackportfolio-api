import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/src/auth/session';
import { useTheme } from '@/src/design/theme';
import { font, space, ThemeName } from '@/src/design/tokens';
import { V4_GRAPH } from '@/src/knowledge/v4Graph';
import { Label, Plate, Row, ScreenReveal, V4Button } from '@/src/components/ui';

const sections = [{ slug: 'analyzer', title: 'Analizador', detail: 'Riesgo, desempeño y escenarios' }, { slug: 'optimization', title: 'Optimización', detail: 'MVO, Smart Beta y Black-Litterman' }, { slug: 'topdown', title: 'Top-down', detail: 'Macro, tasas y señales de mercado' }];

export default function MoreScreen() {
  const { colors, preference, setPreference } = useTheme(); const { user, biometricsEnabled, enableBiometrics, disableBiometrics, signOut } = useSession(); const [saving, setSaving] = useState(false);
  const changeBiometrics = async (value: boolean) => { setSaving(true); if (value) { const result = await enableBiometrics(); if (!result.ok) Alert.alert('Biometría no disponible', result.reason); } else await disableBiometrics(); setSaving(false); };
  return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.paper }]}><ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}><ScreenReveal>
    <View style={[styles.heading, { borderBottomColor: colors.rule }]}><Label>Cuenta y herramientas</Label><Text style={[styles.title, { color: colors.ink }]}>{user?.displayName ?? 'Mi espacio'}</Text><Text style={[styles.lede, { color: colors.ink2 }]}>{user?.email}</Text></View>
    <Plate title="Tema" meta="El mismo sistema V4, en ambas condiciones de luz"><View style={styles.segmented}>{(['light', 'system', 'dark'] as const).map((value) => <V4Button key={value} variant={preference === value ? 'primary' : 'quiet'} style={styles.segmentButton} onPress={() => setPreference(value)}>{value === 'light' ? 'Claro' : value === 'dark' ? 'Oscuro' : 'Sistema'}</V4Button>)}</View></Plate>
    <Plate title="Seguridad" meta="Protecciones del dispositivo y de tu cuenta"><Row title="Huella para continuar" detail="Requiere biometría fuerte; se bloquea al volver a la app." trailing={<Switch value={biometricsEnabled} disabled={saving} onValueChange={changeBiometrics} trackColor={{ false: colors.ruleStrong, true: colors.cobalt }} thumbColor={colors.surface} />} /><Row title="Segundo factor" detail="El servidor emite y valida el token 2FA; no se comparte la semilla." trailing={<Text style={[styles.badge, { color: colors.positive, backgroundColor: colors.cobaltTint }]}>ACTIVO</Text>} last /></Plate>
    <View style={styles.sectionTitle}><Text style={[styles.sectionHeading, { color: colors.ink }]}>Herramientas</Text></View><Plate>{sections.map((section, index) => <Row key={section.slug} title={section.title} detail={section.detail} trailing={<Text style={[styles.arrow, { color: colors.cobaltInk }]}>›</Text>} last={index === sections.length - 1} onPress={() => router.push(`/section/${section.slug}`)} />)}</Plate>
    <View style={styles.sectionTitle}><Text style={[styles.sectionHeading, { color: colors.ink }]}>Árbol Graphify</Text><Text style={[styles.sourceLabel, { color: colors.ink3 }]}>V4 → móvil</Text></View><Plate title="Límites de integración" meta="Proyección operativa del grafo del repositorio"><View>{V4_GRAPH.slice(0, 6).map((node, index) => <Row key={node.id} title={node.label} detail={`${node.source} · ${node.role}`} trailing={<Text style={[styles.edge, { color: colors.ink3 }]}>{node.dependsOn.length ? `→ ${node.dependsOn.join(', ')}` : 'origen'}</Text>} last={index === 5} />)}</View></Plate>
    <V4Button variant="quiet" onPress={() => signOut().catch(() => undefined)}>Cerrar sesión</V4Button>
  </ScreenReveal></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, scroll: { padding: space.x4, paddingBottom: space.x7, gap: space.x4 }, heading: { gap: 4, paddingBottom: space.x4, borderBottomWidth: 1 }, title: { fontFamily: font.serif, fontSize: 31, letterSpacing: -0.8 }, lede: { fontFamily: font.sans, fontSize: 13 }, segmented: { padding: space.x3, flexDirection: 'row', gap: 6 }, segmentButton: { flex: 1, minWidth: 0, paddingHorizontal: 6 }, badge: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.8, paddingHorizontal: 7, paddingVertical: 5 }, sectionTitle: { marginTop: space.x2, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }, sectionHeading: { fontFamily: font.serif, fontSize: 23 }, sourceLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }, arrow: { fontFamily: font.serif, fontSize: 28, lineHeight: 28 }, edge: { maxWidth: 82, textAlign: 'right', fontFamily: font.sans, fontSize: 10, lineHeight: 14 } });
