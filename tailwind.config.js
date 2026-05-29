// NOTE: Tailwind v4 is installed. This config file is mostly ignored by v4.
// To customize the theme in v4, use CSS @theme directives in src/index.css instead.
// The content array below has no effect in v4 (v4 auto-scans files).
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
