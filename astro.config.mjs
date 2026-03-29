import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://paul-goldschmidt.de",
  output: "static",
  integrations: [sitemap()],
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
