import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWTPayload } from "../types/express";
import redis from "../utils/redis";

// Middleware = fungsi yang jalan di ANTARA request masuk dan controller
// Signature: (req, res, next) => void
// next() = "lanjut ke middleware/controller berikutnya"
// next(error) = "ada error, lewati ke error handler"
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Ambil token dari header Authorization
  // Format yang benar: "Bearer eyJhbGciOiJIUzI1NiIsInR..."
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token tidak ditemukan" });
    return;
  }

  // Split "Bearer TOKEN" → ambil bagian kedua (index 1)
  const token = authHeader.split(" ")[1];

  try {
    // Cek apakah token masuk dalam blacklist di Redis (misalnya karena logout)
    const isBlacklisted = await redis.get(`blacklist:${token}`).catch((err) => {
      console.error("Redis error checking blacklist:", err);
      return null;
    });

    if (isBlacklisted) {
      res.status(401).json({ error: "Token tidak valid atau sudah logout" });
      return;
    }

    // jwt.verify(token, secret) → validasi signature + expiry
    // Kalau token palsu atau expired → throw error
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!, // ! = kita yakin ini tidak undefined
    ) as JWTPayload;

    // Simpan info user ke request — bisa diakses di controller
    req.user = decoded;

    // Panggil next() untuk lanjut ke controller
    next();
  } catch {
    res.status(401).json({ error: "Token tidak valid atau sudah expired" });
  }
};
