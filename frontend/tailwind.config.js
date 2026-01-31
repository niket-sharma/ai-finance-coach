/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom dark theme palette
        bg: {
          primary: "#0f1117",
          secondary: "#161822",
          card: "#1a1d2e",
          cardHover: "#1f2340",
          input: "#252a3a",
        },
        text: {
          primary: "#eef2ff",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
        accent: {
          primary: "#6366f1",    // Indigo
          primaryHover: "#4f46e5",
          success: "#22c55e",
          successDim: "#166534",
          danger: "#ef4444",
          dangerDim: "#7f1d1d",
          warning: "#f59e0b",
          warningDim: "#78350f",
          info: "#3b82f6",
          infoDim: "#1e3a5f",
        },
        border: {
          default: "#2a2f44",
          light: "#353b55",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
