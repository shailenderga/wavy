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
          bg: '#111b21',
          panel: '#202c33',
          header: '#202c33',
          hover: '#202c33',
          active: '#2a3942',
          border: '#222e35',
          sent: '#005c4b',
          received: '#202c33',
          green: '#00a884',
          greenDark: '#008069',
          tick: '#53bdeb',
          tickGrey: '#8696a0',
          muted: '#8696a0',
          text: '#e9edef',
          input: '#2a3942',
          unread: '#25d366'
        }
      }
    },
  },
  plugins: [],
}
