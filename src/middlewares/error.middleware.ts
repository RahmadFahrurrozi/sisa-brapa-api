// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from "express";

// Error handler punya 4 parameter (err, req, res, next)
// Express mengenali ini sebagai error handler dari arity 4-nya
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction, // Wajib ada meski tidak dipakai (Express butuh signature ini)
): void => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);

  // Handle Prisma error — record tidak ditemukan
  if (err.constructor.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as unknown as { code: string };
    if (prismaErr.code === "P2025") {
      res.status(404).json({ error: "Data tidak ditemukan" });
      return;
    }
  }

  // Default: internal server error
  res.status(500).json({
    error: "Internal server error",
    // Jangan tampilkan detail error di production!
    ...(process.env.NODE_ENV === "development" && { detail: err.message }),
  });
};
