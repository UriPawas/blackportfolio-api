import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus } from 'react-native';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EmailAuthProvider, User, onAuthStateChanged, reauthenticateWithCredential, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { accountApi, clearTwoFactorToken, setTwoFactorToken } from '@/src/data/api';
import { signInWithGoogle as authenticateWithGoogle, signOutFromGoogle } from './google';

type SessionStatus = 'booting' | 'signedOut' | 'twoFactorRequired' | 'locked' | 'authenticated';
type LoginResult = { needsTwoFactor: boolean };
type SessionContextValue = {
  status: SessionStatus;
  user: User | null;
  error: string | null;
  biometricsEnabled: boolean;
  signIn: (email: string, password: string) => Promise<LoginResult>;
  signInWithGoogle: () => Promise<LoginResult>;
  verifyTwoFactor: (code: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  unlockWithPassword: (password: string) => Promise<boolean>;
  enableBiometrics: () => Promise<{ ok: boolean; reason?: string }>;
  disableBiometrics: () => Promise<void>;
  biometricAvailable: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const BIOMETRIC_USER_KEY = 'bp.mobile.biometric.user';
const BACKGROUND_LOCK_DELAY = 20_000;

const messageFor = (error: unknown) => {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Correo o contraseña incorrectos.';
  if (code === 'auth/too-many-requests') return 'Demasiados intentos. Intenta más tarde.';
  if (code === 'auth/network-request-failed') return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  if (code === 'auth/google-cancelled') return 'El inicio de sesión con Google se canceló.';
  if (code === 'auth/google-native-required') return 'Google está disponible en la aplicación Android instalada.';
  if (code === 'auth/google-play-services') return 'Google Play Services no está disponible en este dispositivo.';
  return 'No fue posible continuar. Inténtalo otra vez.';
};

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionStatus>('booting');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAt = useRef(0);
  const freshLoginUntil = useRef(0);

  const resolvePersistedUser = async (nextUser: User | null) => {
    setUser(nextUser);
    if (!nextUser) { setStatus('signedOut'); return; }
    if (freshLoginUntil.current > Date.now()) return;
    const biometricUser = await SecureStore.getItemAsync(BIOMETRIC_USER_KEY);
    setBiometricsEnabled(biometricUser === nextUser.uid);
    setStatus('locked');
  };

  useEffect(() => onAuthStateChanged(firebaseAuth, (nextUser) => { resolvePersistedUser(nextUser).catch(() => setStatus(nextUser ? 'authenticated' : 'signedOut')); }), []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (/inactive|background/.test(nextState)) backgroundedAt.current = Date.now();
      if (nextState === 'active' && appState.current !== 'active' && Date.now() - backgroundedAt.current >= BACKGROUND_LOCK_DELAY && firebaseAuth.currentUser) {
        SecureStore.getItemAsync(BIOMETRIC_USER_KEY).then((uid) => { if (uid === firebaseAuth.currentUser?.uid) setStatus('locked'); });
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const finishFreshLogin = async (nextUser: User) => {
    setUser(nextUser);
    const { enabled } = await accountApi.twoFactorStatus();
    if (enabled) { setStatus('twoFactorRequired'); return { needsTwoFactor: true }; }
    setStatus('authenticated');
    return { needsTwoFactor: false };
  };

  const startFreshLogin = async (authenticate: () => Promise<User>) => {
    setError(null);
    freshLoginUntil.current = Date.now() + 3_000;
    try {
      return await finishFreshLogin(await authenticate());
    } catch (cause) {
      const message = messageFor(cause);
      setError(message);
      throw new Error(message);
    } finally {
      setTimeout(() => { freshLoginUntil.current = 0; }, 3_000);
    }
  };

  const signIn = (email: string, password: string) => startFreshLogin(async () => (await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)).user);
  const signInWithGoogle = () => startFreshLogin(async () => (await authenticateWithGoogle()).user);

  const verifyTwoFactor = async (code: string) => {
    setError(null);
    const result = await accountApi.verifyTwoFactor(code.trim());
    if (!result.valid || !result.token) {
      const message = 'Código incorrecto. Comprueba tu app autenticadora e intenta de nuevo.';
      setError(message);
      throw new Error(message);
    }
    await setTwoFactorToken(result.token);
    setStatus('authenticated');
  };

  const biometricAvailable = async () => {
    const [hardware, enrolled, level] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);
    return hardware && enrolled && level >= LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;
  };

  const unlockWithBiometrics = async () => {
    if (!user || !(await biometricAvailable())) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear BlackPortfolio',
      promptDescription: 'Confirma tu identidad para continuar tu sesión.',
      cancelLabel: 'Cancelar',
      biometricsSecurityLevel: 'strong',
      disableDeviceFallback: true,
    });
    if (result.success) { setStatus('authenticated'); return true; }
    return false;
  };

  const unlockWithPassword = async (password: string) => {
    if (!user?.email || !password) return false;
    setError(null);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      setStatus('authenticated');
      return true;
    } catch (cause) {
      const message = messageFor(cause);
      setError(message);
      throw new Error(message);
    }
  };

  const enableBiometrics = async () => {
    if (!user) return { ok: false, reason: 'Inicia sesión para activar la biometría.' };
    if (!(await biometricAvailable())) return { ok: false, reason: 'No se detectó una huella o biometría fuerte configurada en este dispositivo.' };
    const verified = await unlockWithBiometrics();
    if (!verified) return { ok: false, reason: 'No fue posible verificar tu identidad.' };
    await SecureStore.setItemAsync(BIOMETRIC_USER_KEY, user.uid, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    setBiometricsEnabled(true);
    return { ok: true };
  };

  const disableBiometrics = async () => { await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY); setBiometricsEnabled(false); };
  const endSession = async () => {
    await Promise.all([clearTwoFactorToken(), SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY)]);
    await signOutFromGoogle();
    await signOut(firebaseAuth);
    setUser(null); setBiometricsEnabled(false); setStatus('signedOut');
  };

  const value = useMemo(() => ({ status, user, error, biometricsEnabled, signIn, signInWithGoogle, verifyTwoFactor, unlockWithBiometrics, unlockWithPassword, enableBiometrics, disableBiometrics, biometricAvailable, signOut: endSession }), [status, user, error, biometricsEnabled]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession debe usarse dentro de SessionProvider.');
  return session;
}
