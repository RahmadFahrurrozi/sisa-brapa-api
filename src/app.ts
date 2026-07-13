import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { authRoutes } from "./routes/auth.routes";
import { expenseRoutes } from "./routes/expense.routes";
import { budgetRoutes } from "./routes/budget.routes";
import { subscriptionRoutes } from "./routes/subscription.routes";
import { errorHandler } from "./middlewares/error.middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware Global ─────────────────────────────────────
app.use(express.json());
app.use(cors());

// ── Swagger Setup ─────────────────────────────────────────
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
      // { url: `${process.env.APP_URL}/api`, description: "Production" },
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
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));



// ── Routes ───────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Welcome / Root Endpoint
app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to Expense Tracker API",
    docs: "/docs",
    health: "/health"
  });
});

// Error handler HARUS paling akhir
app.use(errorHandler);

export default app;
