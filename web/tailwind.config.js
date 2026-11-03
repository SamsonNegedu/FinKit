/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        midnight: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          // 500 is small muted text, so it has to clear 4.5:1 on midnight-900 (#102a43)
          500: '#7b93aa',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0a1929',
        },
        // Surfaces and ink, so components name their role rather than a shade of navy
        surface: {
          DEFAULT: '#102a43',
          raised: '#16304d',
          page: '#0a1929',
        },
        line: {
          DEFAULT: '#1e3852',
          strong: '#334e68',
        },
        ink: {
          DEFAULT: '#f0f4f8',
          muted: '#9fb3c8',
          faint: '#7b93aa',
        },
        // accent is the clickable green; positive and negative are money, never buttons
        accent: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        positive: '#34d399',
        negative: '#f87171',
        warning: '#fbbf24',
        info: '#7dd3fc',
        expense: '#f87171',
        income: '#34d399',
      },
    },
  },
  plugins: [],
}
