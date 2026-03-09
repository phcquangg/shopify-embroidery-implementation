/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './layout/**/*.liquid',
    './sections/**/*.liquid',
    './snippets/**/*.liquid',
    './templates/**/*.liquid',
    './templates/**/*.json',
    './assets/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        'text-1e': 'oklch(23.50% 0.000 0)', // #1e1e1e
      },
      borderColor: {
        'border-b3': 'oklch(76.68% 0.000 0)', // #b3b3b3
        'border-d9': 'oklch(88.53% 0.000 0)', // #d9d9d9
      }
    },
  },
  // Disable Tailwind's base reset to avoid conflicts with Dawn's existing CSS
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
