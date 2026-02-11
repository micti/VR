import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sync } from "glob";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Auto-discover all HTML files in the web directory
const htmlFiles = sync("web/**/*.html", {
  ignore: ["node_modules/**", "dist/**"],
  absolute: false,
});

// Create input object for Vite's build.rollupOptions.input
const input = {};
htmlFiles.forEach((file) => {
  // Use the file path (without .html) as the key
  const name = file
    .replace(/^web\//, "")
    .replace(/\.html$/, "")
    .replace(/\//g, "-");
  input[name] = resolve(__dirname, file);
});

export default defineConfig({
  plugins: [tailwindcss()],

  root: "web", // Set web as root directory
  publicDir: "../public", // Public folder for static assets (images, data, etc.)

  server: {
    port: 5467,
    host: "localhost",
    open: "/index.html", // Open index.html by default
    fs: {
      // Allow serving files from parent directory
      strict: false,
      allow: [".."],
    },
  },

  build: {
    rollupOptions: {
      input: input,
    },
    outDir: "../dist", // Build output to dist in project root
  },

  resolve: {
    alias: {
      // Alias for importing CSS/JS modules
      "/client": resolve(__dirname, "client"),
      "/kehoach": resolve(__dirname, "web/kehoach"),
      "/src": resolve(__dirname, "src"),
    },
  },
});
