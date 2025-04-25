module.exports = {
    content: [
      "./src/**/*.{js,ts,jsx,tsx}", // Ensure Tailwind scans your files for class usage
    ],
    theme: {
      extend: {
        fontFamily: {
          quicksand: ['"Quicksand"', 'sans-serif'], // Add Quicksand as a custom font
        },
      },
    },
    plugins: [
      require('@tailwindcss/typography')
    ],
  };