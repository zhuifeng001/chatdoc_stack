import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default <Partial<Config>>{
  content: [
    './pages/**/*.vue', //
    './containers/**/*.vue',
    './components/**/*.vue',
    './app.vue'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        'hover:primary-color': '#1a66ff',
        'primary-color': '#1a66ff',
        'hover:secondary-color': '#2f4dff',
        'secondary-color': '#2f4dff'
      }
    }
  },
  darkMode: ['class'],
  safelist: ['ProseMirror'],
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')]
}
