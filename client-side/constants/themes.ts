const RED_HACKER_THEME = {
  name: 'Hacker' as const,
  primary: '#FF3131',
  secondary: '#0A0A0A',
  accent: '#FF5E5E',
  background: '#050505',
  surface: '#121212',
  surfaceLight: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#E0E0E0',
  gradient: {
    from: '#FF3131',
    to: '#B31B1B'
  },
  glow: 'rgba(255, 49, 49, 0.15)',
  inputBg: '#121212',
  inputBorder: '#FF3131',
  buttonBg: '#FF3131',
  buttonText: '#FFFFFF',
  buttonBorder: '#FF3131',
  chatBubbleUser: 'rgba(255, 49, 49, 0.4)',
  chatBubbleBot: 'rgba(30, 30, 30, 0.6)',
  heroImage: 'https://i.pinimg.com/736x/76/6b/86/766b86dc6e6c2f60f792bb529142f478.jpg',
  mascotImage: 'https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400&q=80',
};

const GREEN_HACKER_THEME = {
  name: 'Hacker' as const,
  primary: '#00FF88',
  secondary: '#080C10',
  accent: '#00E676',
  background: '#04070A',
  surface: '#0F172A',
  surfaceLight: '#1E293B',
  text: '#ECFDF5',
  textSecondary: '#A7F3D0',
  gradient: {
    from: '#00FF88',
    to: '#059669'
  },
  glow: 'rgba(0, 255, 136, 0.1)',
  inputBg: '#0F172A',
  inputBorder: '#1E293B',
  buttonBg: '#04070A',
  buttonText: '#00FF88',
  buttonBorder: '#00FF88',
  chatBubbleUser: 'rgba(0, 255, 136, 0.35)',
  chatBubbleBot: 'rgba(30, 41, 59, 0.6)',
  heroImage: 'https://i.pinimg.com/736x/7b/42/3c/7b423cb0f55303d70f95091c704f2af5.jpg',
  mascotImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&q=80',
};

export const THEMES = {
  'hacker': RED_HACKER_THEME,
  'terminal': GREEN_HACKER_THEME,
};

export type ThemeType = typeof RED_HACKER_THEME | typeof GREEN_HACKER_THEME;
export type ThemeName = 'hacker' | 'terminal';
