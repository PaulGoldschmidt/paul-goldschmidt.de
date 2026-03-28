import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  redirects: {
    "/impressum": "/imprint",
    "/datenschutz": "/privacy",
    "/calendar": "/kalender",
    "/instagram": "https://www.instagram.com/_paulgoldschmidt/",
    "/twitter": "https://twitter.com/PauIGoldschmidt",
    "/blog": "https://p3g3.de/",
    "/test": "https://youtu.be/dQw4w9WgXcQ",
  },
});
