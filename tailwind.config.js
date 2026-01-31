/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'lg': '1100px',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif SC', 'Songti SC', 'Times New Roman', 'serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      scale: {
        '102': '1.02',
      },
      borderRadius: {
        '2xl': '1.5rem', // 24px
        '3xl': '2rem',
      }
    },
  },
  plugins: [],
}
