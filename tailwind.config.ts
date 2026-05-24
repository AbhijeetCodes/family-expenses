import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base:        '#10121D',
        surface:     '#1A1D2D',
        surface2:    '#252836',
        divider:     '#262A3D',
        accent:      '#00D689',
        'accent-2':  '#00B575',
        ink:         '#FFFFFF',
        muted:       '#94A3B8',
        mutedDim:    '#64748B',
        up:          '#22C55E',
        down:        '#EF4444',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

export default config
