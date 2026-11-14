import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { ACTIVE_BRAND, BRANDS, type Brand, type BrandColors } from './brands';
import { useApp } from '../store/useApp';

export type BrandKey = keyof typeof BRANDS;
export type { Brand };
export type ThemeColors = BrandColors;

/** Resolve a brand key, falling back to ACTIVE_BRAND. All UI color comes from here. */
export function getBrand(key?: string | null): Brand {
  if (key && key in BRANDS) return BRANDS[key as BrandKey];
  return BRANDS[ACTIVE_BRAND];
}

/**
 * Active brand. ACTIVE_BRAND is the one-line production switch; the Account
 * screen can override it at runtime for previewing brand options.
 */
export function useTheme(): Brand {
  const override = useApp((s) => s.brandOverride);
  return getBrand(override);
}

export function useColors(): ThemeColors {
  return useTheme().colors;
}

/** Build a StyleSheet from theme colors, memoized per brand. */
type Styles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function makeStyles<T extends Styles>(factory: (c: ThemeColors) => T & Styles) {
  const cache = new WeakMap<object, Readonly<T>>();
  return function useStyles(): Readonly<T> {
    const c = useColors();
    return useMemo(() => {
      let s = cache.get(c);
      if (!s) {
        s = StyleSheet.create(factory(c));
        cache.set(c, s);
      }
      return s;
    }, [c]);
  };
}
