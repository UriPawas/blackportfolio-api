import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/src/auth/session';
import { useTheme } from '@/src/design/theme';
import { font, space } from '@/src/design/tokens';
import { Label, Plate, V4Button } from '@/src/components/ui';

export default function SignInScreen() {
  const { status, user, error, biometricsEnabled, signIn, signInWithGoogle, signOut, unlockWithBiometrics, unlockWithPassword, biometricAvailable, verifyTwoFactor } = useSession();
  const { colors } = useTheme();
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlockMethod, setUnlockMethod] = useState<'biometric' | 'password'>('biometric');
  const [biometricReady, setBiometricReady] = useState(false);
  const isLocked = status === 'locked';
  const isTwoFactor = status === 'twoFactorRequired';
  const canUsePassword = user?.providerData.some((provider) => provider.providerId === 'password') ?? false;
  const canUseGoogle = user?.providerData.some((provider) => provider.providerId === 'google.com') ?? false;
  const showBiometric = biometricsEnabled && biometricReady;

  useEffect(() => {
    if (!isLocked) return;
    biometricAvailable().then((available) => {
      setBiometricReady(available);
      setUnlockMethod(biometricsEnabled && available ? 'biometric' : 'password');
    }).catch(() => {
      setBiometricReady(false);
      setUnlockMethod('password');
    });
  }, [biometricsEnabled, isLocked]);

  const submitLogin = async () => {
    setBusy(true); setMessage(null);
    try { const result = await signIn(email, password); if (!result.needsTwoFactor) router.replace('/'); }
    catch (cause) { setMessage((cause as Error).message); }
    finally { setBusy(false); }
  };
  const submitCode = async () => {
    setBusy(true); setMessage(null);
    try { await verifyTwoFactor(code); router.replace('/'); }
    catch (cause) { setMessage((cause as Error).message); }
    finally { setBusy(false); }
  };
  const unlock = async () => {
    setBusy(true); setMessage(null);
    const unlocked = await unlockWithBiometrics();
    if (unlocked) router.replace('/'); else setMessage('La huella no pudo verificarse. Intenta otra vez o inicia sesión con tu contraseña.');
    setBusy(false);
  };
  const unlockPassword = async () => {
    setBusy(true); setMessage(null);
    try { const unlocked = await unlockWithPassword(password); if (unlocked) router.replace('/'); }
    catch (cause) { setMessage((cause as Error).message); }
    finally { setBusy(false); }
  };
  const loginWithGoogle = async () => {
    setBusy(true); setMessage(null);
    try { const result = await signInWithGoogle(); if (!result.needsTwoFactor) router.replace('/'); }
    catch (cause) { setMessage((cause as Error).message); }
    finally { setBusy(false); }
  };
  const changeAccount = async () => {
    setBusy(true); setMessage(null);
    try { await signOut(); setEmail(''); setPassword(''); setCode(''); }
    finally { setBusy(false); }
  };

  const title = isTwoFactor ? 'Verifica tu identidad' : isLocked ? 'Bienvenido de nuevo' : 'Tu cartera, con contexto';
  const subtitle = isTwoFactor ? 'Introduce el código de seis dígitos de tu app autenticadora.' : isLocked ? 'Confirmemos que eres tú antes de abrir tu cartera.' : 'Ingresa para revisar riesgos, posiciones y mercados.';

  return <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: colors.bandDeep }]}>
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={styles.flex}>
      <View style={styles.canvas}>
        <View style={styles.brand}><Text style={[styles.brandBlack, { color: colors.onBand }]}>Black</Text><Text style={[styles.brandPortfolio, { color: colors.onBand2 }]}>Portfolio</Text></View>
        <View style={styles.intro}><Text style={[styles.title, { color: colors.onBand }]}>{title}</Text><Text style={[styles.subtitle, { color: colors.onBand2 }]}>{subtitle}</Text></View>
        <Plate style={styles.formPlate}>
          {isLocked ? <View style={styles.formBody}>
            <Label>Cuenta recordada</Label><Text style={[styles.account, { color: colors.ink }]}>{user?.email}</Text>
            {showBiometric && unlockMethod === 'biometric' ? <>
              <V4Button disabled={busy} onPress={unlock}>Continuar con huella</V4Button>
              {canUsePassword ? <V4Button variant="text" onPress={() => { setMessage(null); setPassword(''); setUnlockMethod('password'); }}>Usar contraseña</V4Button> : null}
            </> : canUsePassword ? <>
              <Input label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" autoFocus onSubmitEditing={unlockPassword} />
              <V4Button disabled={busy || !password} onPress={unlockPassword}>Continuar</V4Button>
              {showBiometric ? <V4Button variant="text" onPress={() => { setMessage(null); setUnlockMethod('biometric'); }}>Usar huella</V4Button> : null}
            </> : canUseGoogle ? <V4Button disabled={busy} onPress={loginWithGoogle}>Continuar con Google</V4Button> : null}
            <V4Button variant="text" disabled={busy} onPress={() => changeAccount().catch(() => undefined)}>No soy yo / cambiar cuenta</V4Button>
          </View> : isTwoFactor ? <View style={styles.formBody}>
            <Input label="Código de autenticación" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} autoFocus />
            <V4Button disabled={busy || code.trim().length < 6} onPress={submitCode}>Verificar y continuar</V4Button>
            <V4Button variant="text" onPress={() => signOut().catch(() => undefined)}>Cancelar</V4Button>
          </View> : <View style={styles.formBody}>
            <Input label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Input label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={submitLogin} />
            <V4Button disabled={busy || !email || !password} onPress={submitLogin}>Iniciar sesión</V4Button>
            <View style={[styles.divider, { borderTopColor: colors.ruleSoft }]}><Text style={[styles.dividerText, { color: colors.ink3, backgroundColor: colors.surface }]}>o</Text></View>
            <V4Button variant="quiet" disabled={busy} onPress={loginWithGoogle}>Continuar con Google</V4Button>
            <Text style={[styles.helper, { color: colors.ink3 }]}>La primera sesión requiere tu segundo factor cuando está activado.</Text>
          </View>}
          {message || error ? <Text style={[styles.error, { color: colors.negative }]}>{message ?? error}</Text> : null}
        </Plate>
        <Text style={[styles.disclaimer, { color: colors.onBand2 }]}>BlackPortfolio ofrece monitoreo y análisis; no ejecuta órdenes ni da asesoría personalizada.</Text>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Input({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { colors } = useTheme();
  return <View style={styles.field}><Label>{label}</Label><TextInput placeholderTextColor={colors.ink3} style={[styles.input, { color: colors.ink, borderColor: colors.ruleStrong, backgroundColor: colors.surface }]} {...props} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 }, canvas: { flex: 1, justifyContent: 'center', padding: space.x5, gap: space.x6, maxWidth: 560, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'baseline' }, brandBlack: { fontFamily: font.serifSemibold, fontSize: 25, letterSpacing: -0.7 }, brandPortfolio: { fontFamily: font.sans, fontSize: 18 },
  intro: { gap: space.x2 }, title: { fontFamily: font.serif, fontSize: 38, lineHeight: 42, letterSpacing: -1.1 }, subtitle: { fontFamily: font.sans, fontSize: 15, lineHeight: 23, maxWidth: 410 },
  formPlate: { shadowOpacity: 0.3 }, formBody: { padding: space.x5, gap: space.x4 }, field: { gap: space.x2 }, input: { minHeight: 48, paddingHorizontal: space.x3, borderWidth: 1, borderRadius: 2, fontFamily: font.sans, fontSize: 16 },
  helper: { fontFamily: font.sans, fontSize: 12, lineHeight: 18 }, account: { fontFamily: font.medium, fontSize: 16 }, divider: { borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', marginVertical: space.x1 }, dividerText: { fontFamily: font.sans, fontSize: 12, paddingHorizontal: space.x2, marginTop: -9, backgroundColor: 'transparent' }, error: { fontFamily: font.medium, fontSize: 13, paddingHorizontal: space.x5, paddingBottom: space.x5, lineHeight: 19 }, disclaimer: { fontFamily: font.sans, fontSize: 11, lineHeight: 17 },
});
