/**
 * Varity Tailwind CSS Preset
 *
 * A premium design system inspired by Linear, Arbitrum, and modern Web3 sites.
 * Use this preset as the foundation for all Varity marketing and dashboard projects.
 *
 * @version 1.0.0
 * @author Varity Design System
 * @license MIT
 *
 * Usage:
 * // tailwind.config.js
 * module.exports = {
 *   presets: [require('./brand/tailwind.preset.js')],
 *   // your customizations...
 * }
 */

const plugin = require('tailwindcss/plugin')

module.exports = {
  theme: {
    extend: {
      // ========================================
      // COLORS
      // ========================================
      colors: {
        // Background colors (deep space theme)
        background: {
          DEFAULT: '#030712',    // Near black - primary background
          secondary: '#0A0F1C',  // Deep navy - card backgrounds
          tertiary: '#111827',   // Dark slate - elevated surfaces
          quaternary: '#1E293B', // Slate - hover states
        },

        // Brand teal (primary)
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',  // Primary brand teal
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
        },

        // Electric blue (trust/technology)
        'electric-blue': {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#3B82F6',  // Primary electric blue
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#1E3A5F',
          950: '#0F172A',
        },

        // Cyber purple (Web3/innovation)
        'cyber-purple': {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#A855F7',  // Primary cyber purple
          500: '#9333EA',
          600: '#7E22CE',
          700: '#6B21A8',
          800: '#581C87',
          900: '#3B0764',
          950: '#1A0533',
        },

        // Neon teal (encryption/privacy)
        'neon-teal': {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#14B8A6',  // Primary neon teal
          500: '#0D9488',
          600: '#0F766E',
          700: '#115E59',
          800: '#134E4A',
          900: '#042F2E',
          950: '#021716',
        },

        // Deep space (neutral grays)
        'deep-space': {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#030712',
        },

        // Charcoal (dark theme)
        charcoal: {
          700: '#1C1C1F',
          800: '#141416',
          900: '#0A0A0C',
        },

        // Semantic colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',

        // Border colors
        border: {
          DEFAULT: '#1E293B',
          muted: '#334155',
          accent: '#14B8A6',
        },
      },

      // ========================================
      // TYPOGRAPHY
      // ========================================
      fontFamily: {
        display: ['Cabinet Grotesk', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        body: ['Satoshi', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },

      fontSize: {
        // Display sizes
        'display-2xl': ['4.5rem', { lineHeight: '1.0', letterSpacing: '-0.04em', fontWeight: '700' }],
        'display-xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '600' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-sm': ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],

        // Heading sizes
        'heading-xl': ['1.5rem', { lineHeight: '1.33', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-lg': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-md': ['1.125rem', { lineHeight: '1.44', letterSpacing: '-0.005em', fontWeight: '600' }],
        'heading-sm': ['1rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '600' }],

        // Body sizes
        'body-xl': ['1.25rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'body-lg': ['1.125rem', { lineHeight: '1.65', letterSpacing: '0', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],

        // Utility sizes
        caption: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '400' }],
        overline: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.1em', fontWeight: '600', textTransform: 'uppercase' }],
        code: ['0.875rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
      },

      // ========================================
      // SPACING (8px grid)
      // ========================================
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '28': '112px',
        '32': '128px',
        '36': '144px',
        '40': '160px',
        '44': '176px',
        '48': '192px',
        '52': '208px',
        '56': '224px',
        '60': '240px',
        '64': '256px',
        '72': '288px',
        '80': '320px',
        '96': '384px',
      },

      // ========================================
      // BORDER RADIUS
      // ========================================
      borderRadius: {
        none: '0px',
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px',
        full: '9999px',
      },

      // ========================================
      // SHADOWS
      // ========================================
      boxShadow: {
        none: 'none',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

        // Glow effects
        'glow-teal': '0 0 40px rgba(20, 184, 166, 0.4)',
        'glow-blue': '0 0 40px rgba(59, 130, 246, 0.4)',
        'glow-purple': '0 0 40px rgba(168, 85, 247, 0.4)',
        'card-hover': '0 20px 40px -15px rgba(20, 184, 166, 0.2), 0 0 20px rgba(20, 184, 166, 0.1)',
        'button-glow': '0 0 20px rgba(20, 184, 166, 0.5), 0 0 40px rgba(20, 184, 166, 0.3)',

        // Dark mode shadows
        'dark-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
      },

      // ========================================
      // ANIMATION
      // ========================================
      transitionDuration: {
        instant: '0ms',
        fastest: '50ms',
        faster: '100ms',
        fast: '150ms',
        DEFAULT: '200ms',
        slow: '300ms',
        slower: '400ms',
        slowest: '500ms',
        'extra-slow': '700ms',
        page: '1000ms',
      },

      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        linear: 'linear',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        snappy: 'cubic-bezier(0.2, 0, 0, 1)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-left': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-right': {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(20, 184, 166, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)',
        'slide-down': 'slide-down 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)',
        'slide-left': 'slide-left 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)',
        'slide-right': 'slide-right 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
        pulse: 'pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        glow: 'glow 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      },

      // ========================================
      // LAYOUT
      // ========================================
      maxWidth: {
        container: '1400px',
      },

      // ========================================
      // GRADIENTS
      // ========================================
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #14B8A6 0%, #3B82F6 50%, #A855F7 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
        'gradient-glow-teal': 'radial-gradient(circle, rgba(20, 184, 166, 0.3) 0%, transparent 70%)',
        'gradient-glow-blue': 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
        'gradient-glow-purple': 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
        'gradient-text': 'linear-gradient(135deg, #14B8A6 0%, #3B82F6 50%, #A855F7 100%)',
        'gradient-dark': 'linear-gradient(180deg, #030712 0%, #0A0F1C 100%)',
      },
    },
  },

  plugins: [
    // Custom utilities plugin
    plugin(function({ addUtilities, addComponents, theme }) {
      // Text gradient utility
      addUtilities({
        '.text-gradient': {
          backgroundImage: theme('backgroundImage.gradient-text'),
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        '.text-gradient-hero': {
          backgroundImage: theme('backgroundImage.gradient-hero'),
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
      })

      // Glassmorphism utilities
      addUtilities({
        '.glass': {
          backgroundColor: 'rgba(10, 15, 28, 0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(30, 41, 59, 0.5)',
        },
        '.glass-dark': {
          backgroundColor: 'rgba(3, 7, 18, 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(30, 41, 59, 0.3)',
        },
      })

      // Section container component
      addComponents({
        '.section-container': {
          maxWidth: theme('maxWidth.container'),
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: theme('spacing.5'),
          paddingRight: theme('spacing.5'),
          '@screen md': {
            paddingLeft: theme('spacing.8'),
            paddingRight: theme('spacing.8'),
          },
          '@screen lg': {
            paddingLeft: theme('spacing.12'),
            paddingRight: theme('spacing.12'),
          },
        },
        '.section-padding': {
          paddingTop: theme('spacing.16'),
          paddingBottom: theme('spacing.16'),
          '@screen md': {
            paddingTop: theme('spacing.20'),
            paddingBottom: theme('spacing.20'),
          },
          '@screen lg': {
            paddingTop: theme('spacing.24'),
            paddingBottom: theme('spacing.24'),
          },
        },
      })

      // Button component styles
      addComponents({
        '.btn-primary': {
          backgroundColor: theme('colors.brand.500'),
          color: theme('colors.deep-space.950'),
          fontWeight: '600',
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.DEFAULT'),
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: theme('colors.brand.400'),
            boxShadow: theme('boxShadow.button-glow'),
          },
        },
        '.btn-secondary': {
          backgroundColor: 'transparent',
          color: theme('colors.deep-space.50'),
          fontWeight: '500',
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.DEFAULT'),
          border: `1px solid ${theme('colors.border.DEFAULT')}`,
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: theme('colors.background.quaternary'),
            borderColor: theme('colors.brand.500'),
          },
        },
      })

      // Card component styles
      addComponents({
        '.card': {
          backgroundColor: theme('colors.background.secondary'),
          borderRadius: theme('borderRadius.lg'),
          border: `1px solid ${theme('colors.border.DEFAULT')}`,
          padding: theme('spacing.6'),
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.card-hover': {
          '&:hover': {
            borderColor: theme('colors.brand.500'),
            boxShadow: theme('boxShadow.card-hover'),
            transform: 'translateY(-2px)',
          },
        },
      })
    }),
  ],
}
