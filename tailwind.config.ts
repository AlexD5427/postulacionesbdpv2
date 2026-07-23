import type { Config } from 'tailwindcss';

/**
 * Tailwind is configured to consume the design tokens declared as CSS custom
 * properties in `src/design-system/tokens/*.css` (imported via globals.css).
 * Raw hex/spacing values must NOT be scattered in components — reference the
 * semantic scale here instead. See DESIGN_SYSTEM.md.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Semantic surface + text tokens (resolve to CSS variables).
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        muted: {
          DEFAULT: 'rgb(var(--color-muted) / <alpha-value>)',
          foreground: 'rgb(var(--color-muted-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--color-secondary-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          foreground: 'rgb(var(--color-accent-foreground) / <alpha-value>)',
        },
        'on-brand': {
          DEFAULT: 'rgb(var(--on-brand) / <alpha-value>)',
          muted: 'rgb(var(--on-brand-muted) / <alpha-value>)',
        },
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        ring: 'rgb(var(--color-ring) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        '4xl': 'var(--radius-4xl)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        reading: ['var(--font-reading)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '6xl': 'var(--text-6xl)',
        '7xl': 'var(--text-7xl)',
      },
      boxShadow: {
        'glass-sm': 'var(--shadow-glass-sm)',
        'glass-md': 'var(--shadow-glass-md)',
        'glass-lg': 'var(--shadow-glass-lg)',
        'glass-xl': 'var(--shadow-glass-xl)',
      },
      zIndex: {
        base: 'var(--z-base)',
        content: 'var(--z-content)',
        surface: 'var(--z-surface)',
        nav: 'var(--z-nav)',
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        a11y: 'var(--z-a11y)',
        toast: 'var(--z-toast)',
        preloader: 'var(--z-preloader)',
      },
      transitionTimingFunction: {
        'glass-in': 'var(--ease-in)',
        'glass-out': 'var(--ease-out)',
        'glass-standard': 'var(--ease-standard)',
        ios: 'var(--ease-ios)',
        'spring-soft': 'var(--ease-spring-soft)',
        'spring-bounce': 'var(--ease-spring-bounce)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          from: { transform: 'translateX(-50%)' },
          to: { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in var(--duration-md) var(--ease-standard) both',
        shimmer: 'shimmer 1.6s infinite',
        marquee: 'marquee var(--marquee-duration, 40s) linear infinite',
        'marquee-reverse': 'marquee-reverse var(--marquee-duration, 40s) linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
