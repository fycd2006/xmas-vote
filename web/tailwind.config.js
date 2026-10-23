/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        xmas: {
          green: {
            DEFAULT: '#165b33',
            dark: '#0d3820',
            light: '#1e7b46',
            surface: '#092415'
          },
          red: {
            DEFAULT: '#bb2528',
            dark: '#8b1619',
            light: '#dc2626',
            hover: '#a01d20'
          },
          gold: {
            DEFAULT: '#d4af37',
            light: '#f8b229',
            hover: '#e5c158',
            accent: '#fef08a'
          },
          cream: '#fef9f3',
          darkBg: '#081c15'
        }
      }
    },
  },
  plugins: [],
}
