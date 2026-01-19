import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "meridian-blue": "rgb(var(--meridian-blue))",
                "meridian-gold": "rgb(var(--meridian-gold))",
            },
        },
    },
    plugins: [],
};
export default config;
