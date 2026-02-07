/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          primary: "#6366f1",
          secondary: "#f1f5f9",
          dark: "#1e293b",
        }
      },
      animation: {
        'aura-pulse': 'auraPulse 2s infinite',
      },
      keyframes: {
        auraPulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.4)' },
          '70%': { boxShadow: '0 0 0 10px rgba(99, 102, 241, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' },
        }
      }
    },
  },
  plugins: [],
}
