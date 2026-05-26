/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 32px rgba(34, 211, 238, 0.3)"
      }
    }
  },
  plugins: []
};
