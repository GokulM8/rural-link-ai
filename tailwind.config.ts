import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#1D9E75",
          50: "#E7F7F1",
          100: "#C5ECDD",
          200: "#9BDFC6",
          300: "#6BCFAA",
          400: "#3FBE91",
          500: "#1D9E75",
          600: "#177F5E",
          700: "#136349",
          800: "#0F4D39",
          900: "#0B3A2B",
        },
      },
    },
  },
  plugins: [],
};
export default config;
