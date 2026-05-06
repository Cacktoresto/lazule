/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        lazule: {
          royal: '#1E3A8A',
          night: '#0F172A',
          blue: '#2563EB',
          slate: '#475569',
          mist: '#F8FAFC',
          gold: '#C8A24D',
        },
      },
      boxShadow: {
        mineral: '0 24px 80px rgba(15, 23, 42, 0.45)',
        aureate: '0 16px 50px rgba(200, 162, 77, 0.16)',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'lazule-depth':
          'radial-gradient(circle at top left, rgba(37, 99, 235, 0.34), transparent 34%), radial-gradient(circle at 80% 10%, rgba(200, 162, 77, 0.18), transparent 26%), linear-gradient(135deg, #0F172A 0%, #1E3A8A 48%, #0F172A 100%)',
      },
    },
  },
  plugins: [],
};
