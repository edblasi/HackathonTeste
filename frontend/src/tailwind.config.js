/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F7FAF8",
        foreground: "#0F172A",
        card: "#FFFFFF",
        "card-foreground": "#0F172A",
        primary: "#0B5394",
        "primary-foreground": "#FFFFFF",
        secondary: "#F1F5F9",
        "secondary-foreground": "#334155",
        muted: "#F1F5F9",
        "muted-foreground": "#64748B",
        accent: "#E0F2FE",
        "accent-foreground": "#075985",
        destructive: "#C62828",
        "destructive-foreground": "#FFFFFF",
        border: "#E2E8F0",
        input: "#CBD5E1",
        "input-background": "#F8FAFC",
        ring: "#0B5394",
      },
      fontFamily: {
        instrument: ['"Instrument Serif"', "serif"],
        "dm-serif": ['"DM Serif Display"', "serif"],
      },
    },
  },
  plugins: [],
};
