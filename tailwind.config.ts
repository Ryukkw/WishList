import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FAF7F2",
        charcoal: "#1C1C1E",
        coral: "#E8604A",
        sage: "#8BAF8B",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(28, 28, 30, 0.06)",
        "card-hover": "0 8px 24px rgba(28, 28, 30, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
