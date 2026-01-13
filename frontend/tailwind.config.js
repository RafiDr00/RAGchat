/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'geist': ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'geist-mono': ['"Geist Mono"', 'SF Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        'void': '#000000',
        'deep-purple': '#050010',
        'surface': '#0a0a0f',
        'emerald': {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.4)',
        }
      },
      backgroundImage: {
        'radial-vignette': 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.8) 100%)',
        'radial-fog': 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(5, 0, 16, 0.2) 0%, transparent 100%)',
      },
      backdropBlur: {
        '3xl': '60px',
        '4xl': '80px',
      },
      animation: {
        'cursor-pulse': 'cursor-pulse 1.5s ease-in-out infinite',
        'glow-trace': 'glow-trace 3s linear infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
        'float': 'float 2.5s ease-in-out infinite',
        'processing': 'processing 0.5s ease-in-out infinite',
      },
      keyframes: {
        'cursor-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' }
        },
        'glow-trace': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' }
        },
        'processing': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.2)' },
          '100%': { transform: 'rotate(360deg) scale(1)' }
        }
      },
      boxShadow: {
        'glass': '0 4px 20px rgba(0, 0, 0, 0.4), 0 20px 40px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-hover': '0 8px 30px rgba(0, 0, 0, 0.4), 0 30px 60px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'emerald-glow': '0 0 20px rgba(16, 185, 129, 0.4)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }
    },
  },
  plugins: [],
}