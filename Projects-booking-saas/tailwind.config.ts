import type { Config } from "tailwindcss";

export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050608",
        surface: "#060712",
        surfaceMuted: "#0B0D14",
        borderMuted: "#27272F",
        accent: "#F5C76A",
        accentSoft: "#FDE9B5",
        accentMuted: "#A67C33",
        danger: "#EF4444",
        success: "#22C55E",
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "Fira Sans",
          "Droid Sans",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
    },
  },
  darkMode: "class",
} satisfies Config;

