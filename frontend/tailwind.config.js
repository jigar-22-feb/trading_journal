/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#070A12",
          900: "#0B1221",
          800: "#111A2B",
          700: "#1A2540",
          600: "#243057",
        },
        accent: {
          500: "#4F46E5",
          400: "#6366F1",
        },
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(15, 23, 42, 0.25)",
        glow: "0 0 25px rgba(99, 102, 241, 0.4)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
