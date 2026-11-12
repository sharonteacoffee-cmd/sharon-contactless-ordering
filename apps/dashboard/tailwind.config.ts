import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#241C24',
          forest: '#1C4C34',
          leaf: '#34A43C',
          chai: '#A44C14',
          rust: '#7C2C0C',
          amber: '#FC9C34',
          burgundy: '#541424',
          grey: '#D4D4D4',
          cream: '#FAF7F2',
          border: '#E8E3D9',
          muted: '#6E6A67',
        },
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(28, 76, 52, 0.08)',
        elevated: '0 10px 30px -4px rgba(36, 28, 36, 0.12)',
        floating: '0 14px 40px -6px rgba(28, 76, 52, 0.25)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
