import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import redis from "../utils/redis";

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  // Cek email sudah terdaftar belum
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(400).json({ status: 400, message: "Email already registered" });
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  res.status(201).json({
    status: 201,
    message: "Successfully Registered",
    data: { id: user.id, name: user.name, email: user.email },
  });
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  // Cek user terdaftar
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(400).json({ status: 400, message: "Email or password is not correct" });
    return;
  }

  // Cek password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(400).json({ status: 400, message: "Email or password is not correct" });
    return;
  }

  // Generate JWT Token
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in .env");
  }

  const token = jwt.sign({ id: user.id, email: user.email }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any,
  });

  res.json({
    status: 200,
    message: "Successfully Logged In",
    token,
    data: { id: user.id, name: user.name, email: user.email },
  });
};

// POST /api/auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(400).json({ status: 400, message: "Token tidak ditemukan" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = req.user; // Set by authMiddleware

    if (decoded && decoded.exp) {
      const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
      if (remainingTime > 0) {
        // Simpan ke Redis dengan TTL sisa waktu token
        await redis.setex(`blacklist:${token}`, remainingTime, "true");
      }
    } else {
      // Default TTL 7 hari jika exp tidak terdefinisi
      await redis.setex(`blacklist:${token}`, 604800, "true");
    }

    res.json({
      status: 200,
      message: "Successfully Logged Out",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};
