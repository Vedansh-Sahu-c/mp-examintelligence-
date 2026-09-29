/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0B1F4B",
        indigo: "#3B4BA8",
        saffron: "#F28C28",
        green: {
          DEFAULT: "#1E8E5A",
          verified: "#1E8E5A",
        },
        amber: {
          DEFAULT: "#D99A1C",
          review: "#D99A1C",
        },
        red: {
          DEFAULT: "#C0392B",
          critical: "#C0392B",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F5F7FA",
        },
        border: "#E2E6EE",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        devanagari: ["Noto Sans Devanagari", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        md: "10px",
      }
    },
  },
  plugins: [],
}
