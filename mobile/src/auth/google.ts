import { Platform } from 'react-native';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, UserCredential, signInWithCredential } from 'firebase/auth';
import { firebaseAuth } from './firebase';

const GOOGLE_WEB_CLIENT_ID = '875656821131-89dra5djfobbfqrslq64uobp1k02uuhn.apps.googleusercontent.com';
let configured = false;

function configureGoogle() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  configured = true;
}

function authError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}

export async function signInWithGoogle(): Promise<UserCredential> {
  if (Platform.OS === 'web') throw authError('auth/google-native-required', 'Google requiere la compilación Android de BlackPortfolio.');
  configureGoogle();
  const playServicesAvailable = await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  if (!playServicesAvailable) throw authError('auth/google-play-services', 'Google Play Services no está disponible en este dispositivo.');

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) throw authError('auth/google-cancelled', 'El inicio de sesión con Google se canceló.');
  if (!response.data.idToken) throw authError('auth/google-token-missing', 'Google no devolvió una credencial válida. Intenta otra vez.');

  return signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(response.data.idToken));
}

export async function signOutFromGoogle() {
  if (Platform.OS !== 'web') await GoogleSignin.signOut().catch(() => undefined);
}
