import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import redis from "../utils/redis";
import {
  incomeQuerySchema,
  createIncomeSchema,
  updateIncomeSchema,
} from "../schemas/income.schema";
import { createIncomeTargetSchema } from "../schemas/income-target.schema";
import { Prisma } from "../generated/prisma";

// Helper untuk invalidate cache
const invalidateUserCache = async (userId: string) => {
  try {
    const summaryKeys = await redis.keys(`summary:${userId}:*`);
    const incomeSummaryKeys = await redis.keys(`income-summary:${userId}:*`);
    const balanceKeys = await redis.keys(`balance:${userId}:*`);
    const keysToDel = [...summaryKeys, ...incomeSummaryKeys, ...balanceKeys];
    if (keysToDel.length > 0) {
      await redis.del(...keysToDel);
    }
  } catch (err) {
    console.error("Cache invalidation error:", err);
  }
};

// POST /api/incomes
export const createIncome = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = createIncomeSchema.parse(req.body);
    const { title, amount, category, date, note, walletId, autoSaveGoalId, autoSavePercentage } =
      body;

    // 1. Validasi Wallet jika ada
    if (walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: { id: walletId, userId },
      });
      if (!wallet) {
        res.status(404).json({ status: 404, message: "Wallet tidak ditemukan", data: null });
        return;
      }
    }

    // 2. Gunakan Prisma Transaction untuk menjamin konsistensi
    const result = await prisma.$transaction(async (tx) => {
      // Buat data Income
      const income = await tx.income.create({
        data: {
          title,
          amount,
          category,
          date: date ? new Date(date) : undefined,
          note,
          userId,
          walletId,
        },
      });

      // Tambah saldo wallet
      if (walletId) {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: amount } },
        });
      }

      // Jalankan Auto-Allocation jika dikirim
      let autoSaveLog = null;
      if (autoSaveGoalId && autoSavePercentage !== undefined && autoSavePercentage > 0) {
        const goal = await tx.goal.findFirst({
          where: { id: autoSaveGoalId, userId },
        });

        if (goal) {
          const saveAmount = amount * (autoSavePercentage / 100);

          // Update progress Goal
          await tx.goal.update({
            where: { id: autoSaveGoalId },
            data: { currentAmount: { increment: saveAmount } },
          });

          // Catat SavingLog
          autoSaveLog = await tx.savingLog.create({
            data: {
              amount: saveAmount,
              note: `Auto-Allocation dari pemasukan: "${title}" (${autoSavePercentage}%)`,
              goalId: autoSaveGoalId,
              userId,
              date: date ? new Date(date) : undefined,
            },
          });
        }
      }

      return { income, autoSaveLog };
    });

    await invalidateUserCache(userId);

    res.status(201).json({
      status: 201,
      message: "Pendapatan berhasil dicatat",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/incomes
export const getAllIncomes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const query = incomeQuerySchema.parse(req.query);
    const { page, limit, category, month, year, search, sortBy, sortOrder } = query;

    const where: Prisma.IncomeWhereInput = { userId };

    if (category) {
      where.category = category;
    }

    if (month || year) {
      const targetYear = year || new Date().getFullYear();
      const targetMonth = month || new Date().getMonth() + 1;
      where.date = {
        gte: new Date(targetYear, targetMonth - 1, 1),
        lt: new Date(targetYear, targetMonth, 1),
      };
    }

    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    const totalData = await prisma.income.count({ where });
    const totalPages = Math.ceil(totalData / limit);

    const incomes = await prisma.income.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        wallet: { select: { id: true, name: true, provider: true } },
      },
    });

    res.json({
      status: 200,
      message: "Data pendapatan berhasil diambil",
      data: incomes,
      pagination: {
        page,
        limit,
        totalData,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/incomes/:id
export const getIncomeById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const income = await prisma.income.findFirst({
      where: { id, userId },
      include: {
        wallet: { select: { id: true, name: true, provider: true } },
      },
    });

    if (!income) {
      res.status(404).json({ status: 404, message: "Pemasukan tidak ditemukan", data: null });
      return;
    }

    res.json({ status: 200, message: "Data pendapatan berhasil diambil", data: income });
  } catch (error) {
    next(error);
  }
};

// PUT /api/incomes/:id
export const updateIncome = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const body = updateIncomeSchema.parse(req.body);
    const { title, amount, category, date, note, walletId } = body;

    const existing = await prisma.income.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ status: 404, message: "Pemasukan tidak ditemukan", data: null });
      return;
    }

    // Validasi wallet baru jika berubah
    if (walletId && walletId !== existing.walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: { id: walletId, userId },
      });
      if (!wallet) {
        res.status(404).json({ status: 404, message: "Wallet tidak ditemukan", data: null });
        return;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Kembalikan saldo wallet lama jika ada
      if (existing.walletId) {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { decrement: existing.amount } },
        });
      }

      // 2. Update Income
      const income = await tx.income.update({
        where: { id },
        data: {
          title,
          amount,
          category,
          date: date ? new Date(date) : undefined,
          note,
          walletId: walletId === undefined ? existing.walletId : walletId,
        },
      });

      // 3. Tambahkan ke saldo wallet baru (atau yang lama jika tidak berubah tapi nominal berubah)
      const targetWalletId = walletId === undefined ? existing.walletId : walletId;
      const targetAmount = amount === undefined ? existing.amount : amount;

      if (targetWalletId) {
        await tx.wallet.update({
          where: { id: targetWalletId },
          data: { balance: { increment: targetAmount } },
        });
      }

      return income;
    });

    await invalidateUserCache(userId);

    res.json({
      status: 200,
      message: "Pemasukan berhasil diubah",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/incomes/:id
export const deleteIncome = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await prisma.income.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ status: 404, message: "Pemasukan tidak ditemukan", data: null });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Kurangi saldo wallet jika terkait
      if (existing.walletId) {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { decrement: existing.amount } },
        });
      }

      // Hapus income
      await tx.income.delete({
        where: { id },
      });
    });

    await invalidateUserCache(userId);

    res.json({
      status: 200,
      message: "Pemasukan berhasil dihapus",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/incomes/summary
export const getIncomeSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { month, year } = req.query;

    const targetYear = Number(year) || new Date().getFullYear();
    const targetMonth = Number(month) || new Date().getMonth() + 1;

    const cacheKey = `income-summary:${userId}:${targetYear}:${targetMonth}`;

    // Coba ambil dari cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json({ ...JSON.parse(cached), fromCache: true });
        return;
      }
    } catch (cacheErr) {
      console.error("Redis cache error:", cacheErr);
    }

    const where: Prisma.IncomeWhereInput = {
      userId,
      date: {
        gte: new Date(targetYear, targetMonth - 1, 1),
        lt: new Date(targetYear, targetMonth, 1),
      },
    };

    const grouped = await prisma.income.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    const summary = grouped.reduce<Record<string, { total: number; count: number }>>(
      (acc, item) => {
        acc[item.category] = {
          total: item._sum.amount || 0,
          count: item._count.id,
        };
        return acc;
      },
      {},
    );

    const grandTotal = grouped.reduce((sum: number, item) => sum + (item._sum.amount || 0), 0);

    const result = {
      status: 200,
      message: "Summary pemasukan berhasil diambil",
      data: {
        period: { month: targetMonth, year: targetYear },
        summary,
        grandTotal,
      },
    };

    // Cache selama 5 menit
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result));
    } catch (cacheErr) {
      console.error("Redis set cache error:", cacheErr);
    }

    res.json({ ...result, fromCache: false });
  } catch (error) {
    next(error);
  }
};

// POST /api/incomes/targets
export const setIncomeTarget = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = createIncomeTargetSchema.parse(req.body);
    const { amount, month, year } = body;

    const target = await prisma.incomeTarget.upsert({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      update: { amount },
      create: {
        amount,
        month,
        year,
        userId,
      },
    });

    await invalidateUserCache(userId);

    res.status(200).json({
      status: 200,
      message: "Target pendapatan berhasil diperbarui/dibuat",
      data: target,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/incomes/targets (untuk bulan & tahun tertentu)
export const getIncomeTarget = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { month, year } = req.query;

    const targetMonth = Number(month) || new Date().getMonth() + 1;
    const targetYear = Number(year) || new Date().getFullYear();

    const target = await prisma.incomeTarget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: targetMonth,
          year: targetYear,
        },
      },
    });

    res.json({
      status: 200,
      message: "Target pendapatan berhasil diambil",
      data: target || { amount: 0, month: targetMonth, year: targetYear },
    });
  } catch (error) {
    next(error);
  }
};
