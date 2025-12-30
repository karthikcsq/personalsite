module.exports = {
    content: [
      "./src/**/*.{js,ts,jsx,tsx}", // Ensure Tailwind scans your files for class usage
    ],
    theme: {
      extend: {
        fontFamily: {
          'host-grotesk': ['"Host Grotesk"', 'sans-serif'], // Add Host Grotesk as a custom font
        },
        // Premium Swiss-inspired color palette
        colors: {
          premium: {
            // Primary - Slate gray with refined elegance
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
            950: '#020617',
          },
          accent: {
            // Refined gold accent for premium touch
            50: '#fefce8',
            100: '#fef9c3',
            200: '#fef08a',
            300: '#fde047',
            400: '#facc15',
            500: '#eab308',
            600: '#ca8a04',
            700: '#a16207',
            800: '#854d0e',
            900: '#713f12',
          },
        },
        // Premium spacing system - precise and intentional
        spacing: {
          '18': '4.5rem',
          '88': '22rem',
          '100': '25rem',
          '112': '28rem',
          '128': '32rem',
        },
        // Refined animations
        animation: {
          'fade-in': 'fadeIn 0.6s ease-out forwards',
          'slide-up': 'slideUp 0.7s ease-out forwards',
          'float': 'float 3s ease-in-out infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          slideUp: {
            '0%': { opacity: '0', transform: 'translateY(30px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          float: {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-8px)' },
          },
        },
        // Premium shadows
        boxShadow: {
          'premium': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
          'premium-md': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
          'premium-lg': '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
          'premium-xl': '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
        },
      },
    },
    plugins: [
      require('@tailwindcss/typography')
    ],
  };