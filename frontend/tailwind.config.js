/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          navy: '#172B4D',
          'navy-dark': '#091E42',
          'navy-light': '#253858',
          'navy-subtle': '#42526E',
          teal: '#087F8C',
          'teal-dark': '#06636D',
          'teal-light': '#E6F4F6',
          'teal-subtle': '#D1ECF0',
          surface: '#F4F5F7',
          'surface-subtle': '#EBECF0',
          'surface-card': '#FFFFFF',
          border: '#DFE1E6',
          'border-strong': '#C1C7D0',
          'border-light': '#EBECF0',
          green: '#00875A',
          'green-light': '#E3FCEF',
          'green-border': '#ABF5D1',
          amber: '#FF8B00',
          'amber-light': '#FFFAE6',
          'amber-border': '#FFE380',
          red: '#DE350B',
          'red-light': '#FFEBE6',
          'red-border': '#FFBDAD',
          blue: '#0052CC',
          'blue-light': '#DEEBFF',
          'blue-border': '#B3D4FF',
          muted: '#6B778C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgba(9, 30, 66, 0.08), 0 0 1px 0 rgba(9, 30, 66, 0.12)',
        'card-hover': '0 3px 6px -1px rgba(9, 30, 66, 0.12), 0 0 1px 0 rgba(9, 30, 66, 0.16)',
        'modal': '0 8px 24px -4px rgba(9, 30, 66, 0.2), 0 0 1px 0 rgba(9, 30, 66, 0.24)',
      }
    },
  },
  plugins: [],
}
