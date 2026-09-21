/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wa: {
          bg: 'rgba(10, 15, 29, 0.65)',
          panel: 'rgba(255, 255, 255, 0.05)',
          header: 'rgba(15, 23, 42, 0.65)',
          hover: 'rgba(255, 255, 255, 0.08)',
          active: 'rgba(255, 255, 255, 0.12)',
          border: 'rgba(255, 255, 255, 0.08)',
          sent: 'rgba(16, 185, 129, 0.82)',
          received: 'rgba(30, 41, 59, 0.72)',
          green: '#10b981',
          greenDark: '#059669',
          tick: '#38bdf8',
          tickGrey: '#94a3b8',
          muted: '#94a3b8',
          text: '#f8fafc',
          input: 'rgba(255, 255, 255, 0.06)',
          unread: '#10b981'
        }
      }
    },
  },
  plugins: [],
}
