import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true, // Gunakan describe/it/expect tanpa import di file test
    setupFiles: ["./tests/setup.ts"], // File yang dijalankan sebelum test dimulai
    fileParallelism: false, // Jalankan file test satu per satu untuk menghindari konflik DB
  },
});
