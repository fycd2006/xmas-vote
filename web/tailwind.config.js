/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Noto Serif TC"', 'Songti TC', 'Source Han Serif TC', 'PMingLiU', 'serif'],
        display: ['"Playfair Display"', 'Baskerville', 'Times New Roman', 'serif'],
        script: ['"Alex Brush"', 'cursive'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        airy: {
          white: '#FFFFFF',
          sky: {
            DEFAULT: '#4FAEC8',
            light: '#6CC1D7',
            dark: '#3A95AD',
            soft: '#E8F5F8',
          },
          mint: {
            DEFAULT: '#7FCBB3',
            light: '#9ADBC7',
            dark: '#62B49B',
            soft: '#EDF8F4',
          },
          pine: {
            DEFAULT: '#349282',
            light: '#45A897',
            dark: '#267064',
          },
          sea: {
            DEFAULT: '#2E7C94',
            light: '#3C95B0',
            dark: '#205E72',
          },
          graphite: {
            DEFAULT: '#3E4347',
            light: '#61676C',
            dark: '#26292C',
            muted: '#8B9298',
          },
          sage: {
            DEFAULT: '#92C5B7',
            light: '#B2D9CE',
            dark: '#73A899',
          },
          lemon: {
            DEFAULT: '#ECE2A6',
            light: '#F5EEC4',
            dark: '#D8CC86',
          },
          surface: '#F9FCFB',
          surfaceAlt: '#F0F6F5',
          border: 'rgba(127, 203, 179, 0.3)',
          borderSubtle: 'rgba(79, 174, 200, 0.15)',
        },
        xmas: {
          green: {
            DEFAULT: '#349282',
            dark: '#267064',
            light: '#7FCBB3',
            surface: '#EDF8F4'
          },
          red: {
            DEFAULT: '#2E7C94',
            dark: '#205E72',
            light: '#4FAEC8',
            hover: '#3C95B0'
          },
          gold: {
            DEFAULT: '#349282',
            light: '#ECE2A6',
            hover: '#7FCBB3',
            accent: '#ECE2A6'
          },
          cream: '#FFFFFF',
          darkBg: '#F9FCFB'
        }
      }
    },
  },
  plugins: [],
}
