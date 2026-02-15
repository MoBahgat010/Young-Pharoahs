/**
 * Pharaohs.AI Design Tokens
 * Extracted from the Google Stitch design system
 */

export const Colors = {
  // Primary
  primary: '#f4c025',
  primaryDim: 'rgba(244, 192, 37, 0.8)',
  primarySubtle: 'rgba(244, 192, 37, 0.3)',
  primaryGlow: 'rgba(244, 192, 37, 0.5)',

  // Backgrounds
  backgroundDark: '#221e10',
  backgroundLight: '#f8f8f5',
  cardDark: 'rgba(34, 30, 16, 0.9)',

  // Text
  textWhite: '#FFFFFF',
  textWhite90: 'rgba(255, 255, 255, 0.9)',
  textWhite80: 'rgba(255, 255, 255, 0.8)',
  textWhite70: 'rgba(255, 255, 255, 0.7)',
  textWhite50: 'rgba(255, 255, 255, 0.5)',
  textWhite40: 'rgba(255, 255, 255, 0.4)',
  textWhite10: 'rgba(255, 255, 255, 0.1)',
  textWhite05: 'rgba(255, 255, 255, 0.05)',

  // Overlays
  overlayDark80: 'rgba(34, 30, 16, 0.80)',
  overlayDark20: 'rgba(34, 30, 16, 0.20)',
  overlayDark95: 'rgba(34, 30, 16, 0.95)',
  overlayBlack80: 'rgba(0, 0, 0, 0.80)',

  // Status
  emerald: '#2ECC71',
  terracotta: '#C0392B',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontSizes = {
  tiny: 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const FontWeights = {
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
