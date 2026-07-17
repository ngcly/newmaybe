// Canvas poster theme colors with watermark support
export const POSTER_THEMES = {
  paper: {
    bg: '#F7F3EC',
    text: '#2B2722',
    accent: '#A8643C',
    line: '#D9CFBF',
    watermark: 'rgba(168, 100, 60, 0.045)',
  },
  dark: {
    bg: '#1E1B18',
    text: '#E8E0D5',
    accent: '#C4814E',
    line: '#3A3430',
    watermark: 'rgba(232, 224, 213, 0.045)',
  },
  ochre: {
    bg: '#A8643C',
    text: '#F7F3EC',
    accent: '#2B2722',
    line: '#8A4F2E',
    watermark: 'rgba(43, 39, 34, 0.08)',
  },
  bamboo: {
    bg: '#EAF2EC',
    text: '#1C2E24',
    accent: '#6B8E7B',
    line: '#C5D6C9',
    watermark: 'rgba(28, 46, 36, 0.045)',
  },
  sunset: {
    bg: '#F7ECE6',
    text: '#2E221B',
    accent: '#C97B6B',
    line: '#E5D0C5',
    watermark: 'rgba(46, 34, 27, 0.045)',
  },
  cinnabar: {
    bg: '#FAF3F0',
    text: '#2B1E1D',
    accent: '#C53D31',
    line: '#E8D0CC',
    watermark: 'rgba(197, 61, 49, 0.045)',
  },
  withered: {
    bg: '#EDE6DF',
    text: '#4A423B',
    accent: '#8A7665',
    line: '#D1C2B4',
    watermark: 'rgba(74, 66, 59, 0.045)',
  },
} as const;

export type PosterTheme = keyof typeof POSTER_THEMES;
