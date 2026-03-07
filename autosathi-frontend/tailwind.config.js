/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        saffron: {
          50:  "#fff8ed",
          100: "#ffefd3",
          200: "#ffdaa6",
          300: "#ffc06e",
          400: "#ff9c33",
          500: "#ff7c0a",
          600: "#f06000",
          700: "#c74900",
          800: "#9e3b04",
          900: "#7f3207",
        },
        auto: {
          yellow: "#FFB800",
          dark:   "#1A1A2E",
          card:   "#16213E",
          accent: "#0F3460",
          light:  "#F5F5F0",
        }
      },
      fontFamily: {
        display: ["'Baloo 2'", "cursive"],
        body: ["'Nunito'", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        "pulse-slow": "pulse 3s infinite",
        "spin-slow": "spin 3s linear infinite",
        "bounce-slow": "bounce 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "road-pattern": "repeating-linear-gradient(90deg, transparent, transparent 48%, #FFB800 48%, #FFB800 52%)",
      },
    },
  },
  plugins: [],
};
