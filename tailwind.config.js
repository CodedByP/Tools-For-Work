/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"], 
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          900: '#1A1B1E', 800: '#25262B', 700: '#373A40', 
          600: '#5C5F66', 500: '#A6A7AB', 400: '#C1C2C5', 
          300: '#E8ECEF', 200: '#F1F3F5', 100: '#F8F9FA',
        },
        blue: { 400: '#4DABF7', 500: '#339AF0', 600: '#228BE6' },
        green: { 400: '#51CF66', 500: '#40C057' }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  }
}