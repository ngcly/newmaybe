// Theme color palettes shared across tools and studio apps
// Mirrors tokens.css design tokens
export const CARD_THEMES = {
  paper: {
    bg: '#F7F3EC',
    text: '#2B2722',
    accent: '#A8643C',
    line: '#D9CFBF',
    textSoft: '#5A544C',
    textFaint: '#8C8275',
  },
  dark: {
    bg: '#1E1B18',
    text: '#E8E0D5',
    accent: '#C4814E',
    line: '#3A3430',
    textSoft: '#B5AFA5',
    textFaint: '#7A746E',
  },
  ochre: {
    bg: '#A8643C',
    text: '#F7F3EC',
    accent: '#2B2722',
    line: '#8A4F2E',
    textSoft: '#E6DCCF',
    textFaint: '#C4814E',
  },
  bamboo: {
    bg: '#EAF2EC',
    text: '#1C2E24',
    accent: '#6B8E7B',
    line: '#C5D6C9',
    textSoft: '#3C5245',
    textFaint: '#7F9E8B',
  },
  cinnabar: {
    bg: '#FAF3F0',
    text: '#2B1E1D',
    accent: '#C53D31',
    line: '#E8D0CC',
    textSoft: '#6E504C',
    textFaint: '#A6827D',
  },
  withered: {
    bg: '#EDE6DF',
    text: '#4A423B',
    accent: '#8A7665',
    line: '#D1C2B4',
    textSoft: '#73685E',
    textFaint: '#A39588',
  },
} as const;

export type CardTheme = keyof typeof CARD_THEMES;
