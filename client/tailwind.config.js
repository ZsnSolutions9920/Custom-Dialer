/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f0fe',
          100: '#ece2fd',
          200: '#d4bafb',
          300: '#b888f7',
          400: '#a25ef3',
          500: '#8D34F0',
          600: '#7a2bd4',
          700: '#6622b0',
          800: '#531c8c',
          900: '#3d1568',
          950: '#2a0e4a',
        },
        page: '#F4F5F7',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};
