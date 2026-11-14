// Brand directions for the app. Dark-mode-first.
// See /mnt/project-files/bestball/brand-options.md for rationale and availability notes.

export type BrandColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  QB: string;
  RB: string;
  WR: string;
  TE: string;
};

export type Brand = {
  name: string;
  tagline: string;
  colors: BrandColors;
};

export const BRANDS = {
  coil: {
    name: 'Coil',
    tagline: 'Best ball, wound tight.',
    colors: {
      bg: '#0B0B14',
      surface: '#15152A',
      surfaceAlt: '#1E1E38',
      border: '#2C2C4A',
      text: '#F4F3FF',
      textMuted: '#9A98B8',
      primary: '#7C5CFF',
      primaryText: '#FFFFFF',
      accent: '#2EE6C5',
      success: '#3DDC84',
      warning: '#FFB547',
      danger: '#FF5D5D',
      QB: '#FF6B9A',
      RB: '#3BD9A0',
      WR: '#5AB0FF',
      TE: '#FFA24C',
    },
  },
  gridhouse: {
    name: 'Gridhouse',
    tagline: 'The home of best ball.',
    colors: {
      bg: '#0A1210',
      surface: '#121E1A',
      surfaceAlt: '#1A2924',
      border: '#26392F',
      text: '#EEF6F1',
      textMuted: '#93A89D',
      primary: '#1FB86B',
      primaryText: '#04140B',
      accent: '#FF7A1A',
      success: '#4ADE80',
      warning: '#FBBF24',
      danger: '#F25555',
      QB: '#FF6F91',
      RB: '#2FD3C0',
      WR: '#6AA8FF',
      TE: '#C792FF',
    },
  },
  ceiling: {
    name: 'Ceiling',
    tagline: 'Draft for the ceiling.',
    colors: {
      bg: '#0A0F1C',
      surface: '#121A2C',
      surfaceAlt: '#1A2440',
      border: '#2A3656',
      text: '#F2F5FC',
      textMuted: '#8A94B8',
      primary: '#3D8BFF',
      primaryText: '#FFFFFF',
      accent: '#FF5C7A',
      success: '#34D399',
      warning: '#F5A524',
      danger: '#F0525C',
      QB: '#FF7AB6',
      RB: '#3DDBA4',
      WR: '#7CC4FF',
      TE: '#FFAE57',
    },
  },
  snakebite: {
    name: 'Snakebite',
    tagline: 'Best ball with bite.',
    colors: {
      bg: '#100A0C',
      surface: '#1C1316',
      surfaceAlt: '#281B20',
      border: '#3A272E',
      text: '#FFF2F5',
      textMuted: '#B3979F',
      primary: '#FF3D6E',
      primaryText: '#FFFFFF',
      accent: '#B8F03A',
      success: '#22C55E',
      warning: '#FF9F1C',
      danger: '#FF4D4D',
      QB: '#FF8A5C',
      RB: '#3EDC9B',
      WR: '#5FB2FF',
      TE: '#D69CFF',
    },
  },
} as const satisfies Record<string, Brand>;

export type BrandSlug = keyof typeof BRANDS;

export const ACTIVE_BRAND: BrandSlug = 'coil';
