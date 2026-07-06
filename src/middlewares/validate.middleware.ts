import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

// Generic middleware — terima schema apapun dari Zod
// <T extends ZodSchema> → TypeScript generic, bisa terima schema apa saja
export const validate = (schema: ZodSchema) => {
  // Return fungsi middleware (higher-order function)
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // schema.parse(req.body) → validasi dan return data yang sudah di-parse
      // Kalau validasi gagal → throw ZodError
      // Kalau berhasil → req.body diganti dengan data yang sudah "bersih"
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // error.errors → array semua field yang gagal validasi
        // e.path → path ke field yang error (misal ["amount"])
        // e.path.join(".") → convert ke string "amount"
        const errors = error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        res.status(400).json({
          error: "Validasi gagal",
          details: errors,
        });
        return;
      }
      next(error);
    }
  };
};
