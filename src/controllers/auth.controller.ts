import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import redis from "../utils/redis";
import logger from "../utils/logger";

// Helper untuk generate token
const generateTokens = (user: { id: string; email: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" }, // Access Token singkat
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || "fallback_refresh_token_secret",
    { expiresIn: "7d" }, // Refresh Token panjang
  );

  return { accessToken, refreshToken };
};

// Helper untuk memasang HTTP-only Cookie
const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
  });
};

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(400).json({ status: 400, message: "Email already registered" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      profile: {
        create: {
          currency: "IDR",
          language: "id",
          financialType: "balanced",
        },
      },
    },
  });

  const { accessToken, refreshToken } = generateTokens(user);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  setRefreshTokenCookie(res, refreshToken);

  res.status(201).json({
    status: 201,
    message: "Successfully Registered",
    token: accessToken,
    data: { id: user.id, name: user.name, email: user.email },
  });
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(400).json({ status: 400, message: "Email or password is not correct" });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(400).json({ status: 400, message: "Email or password is not correct" });
    return;
  }

  const { accessToken, refreshToken } = generateTokens(user);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  setRefreshTokenCookie(res, refreshToken);

  res.json({
    status: 200,
    message: "Successfully Logged In",
    token: accessToken,
    data: { id: user.id, name: user.name, email: user.email },
  });
};

// POST /api/auth/refresh
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ status: 401, message: "Refresh token tidak ditemukan" });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { refreshToken },
    });

    if (!user) {
      res.status(401).json({ status: 401, message: "Token tidak valid atau sudah dicabut" });
      return;
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || "fallback_refresh_token_secret",
      ) as { id: string };

      if (decoded.id !== user.id) {
        res.status(401).json({ status: 401, message: "Token tidak cocok" });
        return;
      }

      // Generate Access Token baru
      const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, {
        expiresIn: "15m",
      });

      res.json({
        status: 200,
        message: "Token refreshed successfully",
        token: accessToken,
      });
    } catch {
      res.status(401).json({ status: 401, message: "Token kadaluarsa atau tidak valid" });
    }
  } catch (error) {
    logger.error("Token refresh error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

// POST /api/auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (userId) {
      // Hapus refresh token di database
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
    }

    // Bersihkan cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      const decoded = req.user;
      if (decoded && decoded.exp) {
        const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
        if (remainingTime > 0) {
          await redis.setex(`blacklist:${token}`, remainingTime, "true");
        }
      }
    }

    res.json({
      status: 200,
      message: "Successfully Logged Out",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};
