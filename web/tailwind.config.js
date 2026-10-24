/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        DEFAULT: '2px',
        none: '0',
        sm: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '4px',
        '3xl': '6px',
        full: '9999px',
      },
      fontFamily: {
        serif_jp: ["'Shippori Mincho'", "'Noto Serif TC'", "'Yu Mincho'", "'Source Han Serif'", 'serif'],
        serif_en: ["'Cormorant Garamond'", "'Baskerville'", 'serif'],
        sans_ui: ["'Inter'", "'Noto Sans TC'", '-apple-system', 'sans-serif'],
        cursive: ["'Pinyon Script'", "'La Belle Aurore'", 'cursive'],
        serif: ["'Shippori Mincho'", "'Noto Serif TC'", 'serif'],
        display: ["'Cormorant Garamond'", "'Baskerville'", 'serif'],
        script: ["'Pinyon Script'", 'cursive'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        soft: '0 10px 30px -5px rgba(79, 174, 200, 0.08)',
        glass: '0 8px 32px 0 rgba(79, 174, 200, 0.12)',
        prism: '0 12px 40px -10px rgba(79, 174, 200, 0.18)',
      },
      backgroundImage: {
        'prism-overlay': 'linear-gradient(135deg, rgba(79, 174, 200, 0.25) 0%, rgba(127, 203, 179, 0.2) 50%, rgba(236, 226, 166, 0.15) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.5) 100%)',
      },
      colors: {
        editorial: {
          bg: '#FFFFFF',
          bgSecondary: '#F9FBFA',
          surfaceGlass: 'rgba(255, 255, 255, 0.65)',
          sky: '#4FAEC8',
          mint: '#7FCBB3',
          cyan: '#2E7C94',
          gold: '#ECE2A6',
          text: '#3E4347',
          accent: '#349282',
          muted: '#8A9499',
          decorative: '#92C5B7',
          hairline: 'rgba(79, 174, 200, 0.25)',
          glassBorder: 'rgba(255, 255, 255, 0.8)',
        },
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
          surface: '#F9FBFA',
          surfaceAlt: '#F0F6F5',
          border: 'rgba(79, 174, 200, 0.25)',
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
            DEFAULT: '#4FAEC8',
            dark: '#2E7C94',
            light: '#6CC1D7',
            hover: '#2E7C94'
          },
          gold: {
            DEFAULT: '#349282',
            light: '#ECE2A6',
            hover: '#7FCBB3',
            accent: '#ECE2A6'
          },
          cream: '#FFFFFF',
          darkBg: '#F9FBFA'
        }
      }
    },
  },
  plugins: [],
}
