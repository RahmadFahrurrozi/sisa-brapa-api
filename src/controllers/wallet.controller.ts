import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { createWalletSchema, updateWalletSchema } from "../schemas/wallet.schema";

// POST /api/wallets
export const createWallet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = createWalletSchema.parse(req.body);
    const { name, type, provider, balance } = body;

    // Check duplicate name
    const existing = await prisma.wallet.findFirst({
      where: { userId, name: { equals: name, mode: "insensitive" } },
    });

    if (existing) {
      res.status(400).json({
        status: 400,
        message: `Wallet dengan nama "${name}" sudah ada.`,
        data: null,
      });
      return;
    }

    const wallet = await prisma.wallet.create({
      data: {
        name,
        type,
        provider,
        balance,
        userId,
      },
    });

    res.status(201).json({
      status: 201,
      message: "Wallet berhasil dibuat",
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/wallets
export const getAllWallets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });

    res.json({
      status: 200,
      message: "Daftar wallet berhasil diambil",
      data: wallets,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/wallets/:id
export const getWalletById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const wallet = await prisma.wallet.findFirst({
      where: { id, userId },
    });

    if (!wallet) {
      res.status(404).json({
        status: 404,
        message: "Wallet tidak ditemukan",
        data: null,
      });
      return;
    }

    res.json({
      status: 200,
      message: "Data wallet berhasil diambil",
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/wallets/:id
export const updateWallet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const body = updateWalletSchema.parse(req.body);
    const { name } = body;

    // Check ownership
    const existing = await prisma.wallet.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({
        status: 404,
        message: "Wallet tidak ditemukan",
        data: null,
      });
      return;
    }

    // Check duplicate name if changing
    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.wallet.findFirst({
        where: { userId, name: { equals: name, mode: "insensitive" } },
      });

      if (duplicate) {
        res.status(400).json({
          status: 400,
          message: `Wallet dengan nama "${name}" sudah ada.`,
          data: null,
        });
        return;
      }
    }

    const updated = await prisma.wallet.update({
      where: { id },
      data: { name },
    });

    res.json({
      status: 200,
      message: "Wallet berhasil diupdate",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/wallets/:id
export const deleteWallet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await prisma.wallet.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({
        status: 404,
        message: "Wallet tidak ditemukan",
        data: null,
      });
      return;
    }

    await prisma.wallet.delete({
      where: { id },
    });

    res.json({
      status: 200,
      message: "Wallet berhasil dihapus",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
