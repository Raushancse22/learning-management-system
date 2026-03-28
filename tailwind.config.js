/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        halo: "0 26px 60px -28px rgba(15, 118, 110, 0.35)",
      },
    },
  },
  plugins: [],
};
