import { ColorSchemeName } from 'react-native';

export type ThemeName = 'light' | 'dark';

export const light = {
  paper: '#F1F4F8', surface: '#FFFFFF', sunken: '#E8ECF2', band: '#0D2137', bandDeep: '#081827',
  ink: '#0B1524', ink2: '#33415A', ink3: '#5A6980', onBand: '#EAF0F7', onBand2: '#A9BDD5',
  rule: '#D6DDE6', ruleSoft: '#E4E9EF', ruleStrong: '#B5C0CE',
  cobalt: '#13429B', cobaltInk: '#13429B', cobaltLine: '#2A5CBE', cobaltTint: '#E7EDF8',
  positive: '#0A6B4A', negative: '#A11E20', shadow: 'rgba(11, 21, 36, 0.14)',
} as const;

export type Colors = { [Token in keyof typeof light]: string };

export const dark: Colors = {
  paper: '#0A1220', surface: '#101B2B', sunken: '#0C1725', band: '#06101C', bandDeep: '#040B14',
  ink: '#E9EEF6', ink2: '#B4C1D5', ink3: '#8C9BB3', onBand: '#EAF0F7', onBand2: '#A9BDD5',
  rule: '#22314A', ruleSoft: '#1A2739', ruleStrong: '#364964',
  cobalt: '#1E4FD0', cobaltInk: '#7CA0FF', cobaltLine: '#6E97FF', cobaltTint: '#15243E',
  positive: '#45B98A', negative: '#E4787A', shadow: 'rgba(0, 0, 0, 0.42)',
};

export const resolveTheme = (value: ThemeName | 'system', system: ColorSchemeName): ThemeName =>
  value === 'system' ? (system === 'dark' ? 'dark' : 'light') : value;
export const colorsFor = (theme: ThemeName): Colors => theme === 'dark' ? dark : light;

export const font = {
  sans: 'LibreFranklin_400Regular',
  medium: 'LibreFranklin_500Medium',
  semibold: 'LibreFranklin_600SemiBold',
  serif: 'Spectral_500Medium',
  serifSemibold: 'Spectral_600SemiBold',
};

export const space = { x1: 4, x2: 8, x3: 12, x4: 16, x5: 24, x6: 32, x7: 48 } as const;
