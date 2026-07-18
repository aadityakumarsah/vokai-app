// Clario's warm, light visual system, reused for VOKAI's coding journey.
export const colors = {
  canvas: '#FAF6F1',
  paper: '#FFFFFF',
  ink: '#3A2E2A',
  muted: '#8A7468',
  border: '#E8DED2',
  forest: '#6F9A6E',
  moss: '#8FA87C',
  mint: '#DDE4E0',
  lime: '#E8E4D5',
  sun: '#F0D9A8',
  peach: '#F2E6DD',
  lilac: '#D8C7DB',
  sky: '#FBEFD6',
  red: '#993356',
  amberRich: '#E0A94A',
  lavenderDeep: '#B79BBF',
} as const;

export const fonts = {
  serif: 'Georgia',
  sans: 'System',
} as const;

export const gradients = {
  learn: ['#FBEFD6', '#E8C98A'] as const,
  build: ['#E4EDE2', '#9FBE93'] as const,
  reflect: ['#EDE4F0', '#C3A9CB'] as const,
};

export const shadow = {
  shadowColor: colors.ink,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.10,
  shadowRadius: 14,
  elevation: 4,
};
