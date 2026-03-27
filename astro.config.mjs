import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  redirects: {
    "/impressum": "/imprint",
    "/datenschutz": "/privacy",
  },
});
