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
        // Surfaces — one navy hue, stepping up in lightness only.
        base:        '#10121D',   // page canvas
        well:        '#0C0E17',   // inset: inputs sit *below* the surface
        surface:     '#1A1D2D',   // cards, sticky headers
        surface2:    '#252836',   // popovers, pills, hover on cards
        surface3:    '#2E3243',   // hover on surface2
        divider:     '#262A3D',   // solid rule (charts, legacy)
        // Hairlines — translucent so they sit quietly on any surface.
        // No opacity modifiers on these (Tailwind would *replace* the alpha).
        line:        'rgba(255,255,255,0.07)',
        'line-strong': 'rgba(255,255,255,0.12)',
        // Brand / primary action. Use sparingly: CTAs, selection, focus.
        accent:      '#00D689',
        'accent-2':  '#00B575',
        // Text ramp: primary → secondary → tertiary → disabled.
        ink:         '#FFFFFF',
        muted:       '#94A3B8',
        mutedDim:    '#64748B',
        faint:       '#475066',
        // Spend semantics only (less spent = up/green, more spent = down/red).
        up:          '#22C55E',
        down:        '#EF4444',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        // Dark UI: depth reads from a 1px ring, not a drop shadow.
        card:    '0 0 0 1px rgba(255,255,255,0.06)',
        popover: '0 0 0 1px rgba(255,255,255,0.08), 0 16px 40px -12px rgba(0,0,0,0.7)',
      },
      transitionTimingFunction: {
        crisp: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

export default config
