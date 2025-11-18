/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7c3aed',
          accent: '#a855f7'
        }
      },
      fontFamily: {
        sans: ['"SUIT"', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
};
