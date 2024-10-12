const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: ['./*.html', './content/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      // Set font family
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      // Set theme colors (Required config!)
      colors: {
        primary: colors.blue,
        secondary: colors.slate,
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}