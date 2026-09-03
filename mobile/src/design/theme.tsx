import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, ThemeName, colorsFor, resolveTheme } from './tokens';

type ThemePreference = ThemeName | 'system';
type ThemeContextValue = { preference: ThemePreference; theme: ThemeName; colors: Colors; setPreference: (value: ThemePreference) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = 'bp.mobile.theme';

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const [preference, setStoredPreference] = useState<ThemePreference>('system');

  useEffect(() => { AsyncStorage.getItem(THEME_KEY).then((value) => {
    if (value === 'light' || value === 'dark' || value === 'system') setStoredPreference(value);
  }); }, []);

  const setPreference = (value: ThemePreference) => {
    setStoredPreference(value);
    AsyncStorage.setItem(THEME_KEY, value).catch(() => undefined);
  };
  const theme = resolveTheme(preference, systemTheme);
  const value = useMemo(() => ({ preference, theme, colors: colorsFor(theme), setPreference }), [preference, theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme debe usarse dentro de ThemeProvider.');
  return theme;
}
