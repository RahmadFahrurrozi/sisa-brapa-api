import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import cookieParser from "cookie-parser"; // <-- Import cookie-parser
import helmet from "helmet"; // <-- Import helmet
import rateLimit from "express-rate-limit"; // <-- Import rate-limit

import { authRoutes } from "./routes/auth.routes";
import { expenseRoutes } from "./routes/expense.routes";
import { budgetRoutes } from "./routes/budget.routes";
import { subscriptionRoutes } from "./routes/subscription.routes";
import { goalRoutes } from "./routes/goal.routes";
import { errorHandler } from "./middlewares/error.middleware";
import logger from "./utils/logger";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── 1. Global Security Middleware ─────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Dinonaktifkan agar file statis Swagger dari CDN/inline script tidak diblokir
  }),
); // Mengamankan header HTTP
app.use(express.json());
app.use(cookieParser()); // Memparsing cookie masuk
app.use(cors());

// ── 2. Rate Limiting Setup ─────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  // Batasan request secara global (maksimal 200 request per 15 menit)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: "Too many requests from this IP, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(globalLimiter);

  // Batasan request khusus login & register (maksimal 20 percobaan per 15 menit)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many authentication attempts, please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
}

// ── Swagger Setup ──
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Expense Tracker API",
      version: "1.0.0",
      description: "REST API untuk mencatat pengeluaran pribadi",
    },
    servers: [
      { url: `http://localhost:${PORT}/api`, description: "Development" },
      ...(process.env.APP_URL
        ? [{ url: `${process.env.APP_URL}/api`, description: "Production" }]
        : []),
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Konfigurasi agar aset Swagger dimuat dari CDN cdnjs
// Ini mencegah error "Unexpected token '<'" karena aset lokal tidak tersaji dengan benar di Vercel Serverless
const swaggerUiOptions = {
  customCssUrl: "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
  customJs: [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js",
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js",
  ],
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/goals", goalRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Welcome / Root Endpoint
app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to Expense Tracker API",
    docs: "/docs",
    health: "/health",
  });
});

// Error handler HARUS paling akhir
app.use(errorHandler);

export default app;
