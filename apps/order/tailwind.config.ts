import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#241C24',
          forest: '#1C4C34',
          forestHover: '#163E2A',
          forestActive: '#102B1D',
          leaf: '#34A43C',
          chai: '#A44C14',
          rust: '#7C2C0C',
          amber: '#FC9C34',
          amberHover: '#E58B2B',
          burgundy: '#541424',
          grey: '#D4D4D4',
          cream: '#FAF7F2',
          border: '#E8E3D9',
          muted: '#6E6A67',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(28, 76, 52, 0.08)',
        elevated: '0 10px 30px -4px rgba(36, 28, 36, 0.12)',
        floating: '0 14px 40px -6px rgba(28, 76, 52, 0.25)',
        primaryBtn: '0 4px 14px -2px rgba(28, 76, 52, 0.25)',
        'amber-glow': '0 0 24px rgba(252, 156, 52, 0.35)',
        'leaf-glow': '0 0 24px rgba(52, 164, 60, 0.32)',
      },
      borderRadius: {
        sheet: '32px',
      },
      keyframes: {
        steam: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)', opacity: '0.85' },
          '50%': { transform: 'translateY(-4px) scale(1.06)', opacity: '1' },
        },
      },
      animation: {
        steam: 'steam 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
