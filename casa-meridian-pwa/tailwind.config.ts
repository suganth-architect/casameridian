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
                // Casa Meridian brand colours — also registered via @theme in globals.css
                "meridian-blue": "rgb(var(--meridian-blue))",
                "meridian-gold": "rgb(var(--meridian-gold))",
            },
            fontFamily: {
                // Montserrat Variable font bundled via @fontsource-variable/montserrat
                montserrat: ['"Montserrat Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
