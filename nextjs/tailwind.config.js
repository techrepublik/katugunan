/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981',
          700: '#044a27', // deep emerald brand
          800: '#043e20',
          900: '#022d16',
        },
        gold: {
          400: '#f6d33f',
          500: '#f1c40f', // brand gold
          600: '#d4ac0d',
        }
      },
      fontFamily: {
        outfit: ['var(--font-outfit)', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
