import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyC4MLLdR6N_8Kt9kpKylpVhtACmCH7yqXw',
  authDomain: 'portify-6467f.firebaseapp.com',
  projectId: 'portify-6467f',
  storageBucket: 'portify-6467f.firebasestorage.app',
  messagingSenderId: '875656821131',
  appId: '1:875656821131:web:98b9c8d35b8cd46366978e',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firebase 12 no longer exports getReactNativePersistence. This compatible adapter keeps only
// Firebase's refresh session between launches; the UI is still locked by biometrics/password.
class ReactNativePersistence {
  static type = 'LOCAL' as const;
  readonly type = ReactNativePersistence.type;

  async _isAvailable() { return true; }
  async _set(key: string, value: unknown) { await AsyncStorage.setItem(key, JSON.stringify(value)); }
  async _get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  }
  async _remove(key: string) { await AsyncStorage.removeItem(key); }
  _addListener() { return undefined; }
  _removeListener() { return undefined; }
}

export const firebaseAuth: Auth = (() => {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, { persistence: ReactNativePersistence as never });
  } catch {
    return getAuth(app);
  }
})();
