import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { cloudflare } from "@cloudflare/vite-plugin";

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: { alias: { "@": path.resolve(directory, "./src") } },
});