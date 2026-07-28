/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  css: {
    transformer: "lightningcss",
  },
  build: {
    cssMinify: "lightningcss",
  },
  test: {
    environment: "happy-dom",
    globals: false,
  },
  resolve: {
    conditions: ["development", "browser"],
  },
});
