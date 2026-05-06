export const tokens = {
  color: {
    bg0: 'oklch(0.16 0.010 240)',
    bg1: 'oklch(0.20 0.010 240)',
    bg2: 'oklch(0.235 0.012 240)',
    bg3: 'oklch(0.275 0.013 240)',
    bg4: 'oklch(0.32 0.014 240)',
    line: 'oklch(0.32 0.012 240)',
    line2: 'oklch(0.40 0.014 240)',

    text: 'oklch(0.97 0.005 240)',
    textMuted: 'oklch(0.78 0.008 240)',
    textDim: 'oklch(0.60 0.010 240)',
    textFaint: 'oklch(0.45 0.012 240)',

    mint: 'oklch(0.82 0.14 165)',
    mintDim: 'oklch(0.60 0.11 165)',
    mintInk: 'oklch(0.20 0.04 165)',
    indigo: 'oklch(0.72 0.15 270)',
    indigoDim: 'oklch(0.55 0.13 270)',

    warn: 'oklch(0.80 0.13 75)',
    danger: 'oklch(0.72 0.16 25)',
  },

  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 72 },

  font: {
    sans: '"Geist", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    mono: '"Geist Mono", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
    display: '"Geist", "Inter", system-ui, sans-serif',
  },

  radius: { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, pill: 9999 },

  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.4)',
    md: '0 4px 16px rgba(0,0,0,0.3)',
    lg: '0 24px 48px rgba(0,0,0,0.4)',
    glow: '0 0 0 1px oklch(0.82 0.14 165 / 0.25), 0 0 24px oklch(0.82 0.14 165 / 0.15)',
  },
} as const;

export type Tokens = typeof tokens;
export type ColorToken = keyof Tokens['color'];
export type RadiusToken = keyof Tokens['radius'];
export type ShadowToken = keyof Tokens['shadow'];
