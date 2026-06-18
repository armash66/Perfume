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
        background: "var(--background)",
        foreground: "var(--foreground)",
        luxuryDark: "#0a0a0a",
        luxurySurface: "#141414",
        luxuryGold: "#c9a96e",
        luxuryText: "#f0ede8",
        
        // Decant Atelier custom colors
        ivory: "#FAF6F0",
        "ivory-warm": "#FCFAF7",
        "ivory-deep": "#F0E5D8",
        champagne: "#E2C275",
        "champagne-light": "#F4E7C5",
        "champagne-muted": "#FDFBF7",
        bronze: "#C8A855",
        "bronze-deep": "#B09140",
        teal: "#241E1C",
        "teal-deep": "#120E0D",
        "teal-mid": "#3E3532",
        "emerald-brand": "#E2C275",
        charcoal: "#1A1A1A",
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        cormorant: ["var(--font-cormorant)", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;

