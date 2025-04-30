// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
    theme: {
      extend: {
        fontFamily: {
          sans: ["var(--font-rabbid)", "sans-serif"],  // default sans → Rabbid
        },
      },
    },
    plugins: [],
  };
  