import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08111f",
        slate: "#0f1b2e",
        steel: "#6f7d95",
        cloud: "#dbe5f4",
        line: "#20304b",
        glow: "#79f2d2",
        amber: "#f7c96d",
        rose: "#ff7a90",
        paper: "#f5f7fb",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
      },
      boxShadow: {
        panel: "0 20px 80px rgba(8, 17, 31, 0.28)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(121, 242, 210, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(121, 242, 210, 0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
