import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background colors (deep space theme) - EXACT from Varity
        background: '#030712',
        'background-secondary': '#0A0F1C',
        'background-tertiary': '#111827',
        'background-quaternary': '#1E293B',
        
        // Text colors - EXACT from Varity
        foreground: '#F8FAFC',
        'foreground-secondary': '#94A3B8',
        'foreground-muted': '#64748B',
        'foreground-disabled': '#475569',
        
        // Brand teal (primary) - EXACT from Varity
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
        },
        
        // Electric blue - EXACT from Varity
        electric: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#3B82F6',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#1E3A5F',
          950: '#0F172A',
        },
        
        // Cyber purple (accent only) - EXACT from Varity
        cyber: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#A855F7',
          500: '#9333EA',
          600: '#7E22CE',
          700: '#6B21A8',
          800: '#581C87',
          900: '#3B0764',
          950: '#1A0533',
        },
        
        // Deep space (neutral grays) - EXACT from Varity
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
        
        // Semantic colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        
        // Border colors
        border: '#1E293B',
        'border-muted': '#334155',
        'border-accent': '#14B8A6',
      },
      
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      
      fontFamily: {
        // Will default to system fonts, but structure ready for Cabinet/Satoshi
        display: ['var(--font-cabinet)', 'system-ui', 'sans-serif'],
        body: ['var(--font-satoshi)', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        // Display sizes
        'display-2xl': ['4.5rem', { lineHeight: '1.0' }],
        'display-xl': ['3.75rem', { lineHeight: '1.05' }],
        'display-lg': ['3rem', { lineHeight: '1.1' }],
        'display-md': ['2.25rem', { lineHeight: '1.2' }],
        
        // Body sizes
        'body-xl': ['1.25rem', { lineHeight: '1.6' }],
        'body-lg': ['1.125rem', { lineHeight: '1.65' }],
        'body-md': ['1rem', { lineHeight: '1.6' }],
      },
      
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'gradient-flow': 'gradientFlow 4s ease infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        gradientFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      
      boxShadow: {
        'glow': '0 0 20px rgba(20,184,166,0.5), 0 0 40px rgba(20,184,166,0.3)',
        'glow-lg': '0 0 30px rgba(20,184,166,0.4), 0 0 60px rgba(59,130,246,0.3)',
        'glow-xl': '0 20px 40px -15px rgba(20,184,166,0.2)',
      },
    },
  },
  plugins: [],
};

export default config;