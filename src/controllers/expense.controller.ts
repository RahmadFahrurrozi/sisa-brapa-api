import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import redis from "../utils/redis";
import { expenseQuerySchema } from "../schemas/expense.schema";
import { Prisma } from "../generated/prisma";

// GET /api/expenses (dengan pagination, filters, dan search)
export const getAllExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Parse & validasi query params
    const query = expenseQuerySchema.parse(req.query);
    const { page, limit, category, month, year, search, sortBy, sortOrder } = query;

    // Build filter condition
    const where: Prisma.ExpenseWhereInput = { userId };

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
        mode: "insensitive", // Case-insensitive
      };
    }

    // Hitung total data
    const totalData = await prisma.expense.count({ where });
    const totalPages = Math.ceil(totalData / limit);

    // Query data dengan pagination & sorting
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      status: 200,
      message: "Data expense berhasil diambil",
      data: expenses,
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

// GET /api/expenses/:id
export const getExpenseById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const expense = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      res.status(404).json({ status: 404, message: "Expense tidak ditemukan", data: null });
      return;
    }

    res.json({ status: 200, message: "Data expense berhasil diambil", data: expense });
  } catch (error) {
    next(error);
  }
};

// POST /api/expenses
export const createExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, amount, category, date, note } = req.body;

    const expense = await prisma.expense.create({
      data: {
        title,
        amount,
        category,
        date: date ? new Date(date) : undefined,
        note,
        userId,
      },
    });

    // Invalidate Redis cache
    try {
      const keys = await redis.keys(`summary:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (redisErr) {
      console.error("Redis cache invalidation error:", redisErr);
    }

    res.status(201).json({
      status: 201,
      message: "Expense berhasil dibuat",
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/expenses/:id
export const updateExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { title, amount, category, date, note } = req.body;

    // Cek kepemilikan
    const existing = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ status: 404, message: "Expense tidak ditemukan", data: null });
      return;
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        title,
        amount,
        category,
        date: date ? new Date(date) : undefined,
        note,
      },
    });

    // Invalidate Redis cache
    try {
      const keys = await redis.keys(`summary:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (redisErr) {
      console.error("Redis cache invalidation error:", redisErr);
    }

    res.json({
      status: 200,
      message: "Expense berhasil diupdate",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/expenses/:id
export const deleteExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    // Cek kepemilikan
    const existing = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Expense tidak ditemukan" });
      return;
    }

    await prisma.expense.delete({
      where: { id },
    });

    // Invalidate Redis cache
    try {
      const keys = await redis.keys(`summary:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (redisErr) {
      console.error("Redis cache invalidation error:", redisErr);
    }

    res.json({ status: 200, message: "Expense berhasil dihapus", data: null });
  } catch (error) {
    next(error);
  }
};

// GET /api/expenses/summary
export const getExpenseSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { month, year } = req.query;

    const targetYear = Number(year) || new Date().getFullYear();
    const targetMonth = Number(month) || new Date().getMonth() + 1;

    const cacheKey = `summary:${userId}:${targetYear}:${targetMonth}`;

    // Cek cache dulu
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log("Cache HIT — data dari Redis");
        res.json({ ...JSON.parse(cached), fromCache: true });
        return;
      }
    } catch (redisErr) {
      console.error("Redis error when getting cache:", redisErr);
    }

    console.log("Cache MISS — query ke PostgreSQL");

    const where: Prisma.ExpenseWhereInput = {
      userId,
      date: {
        gte: new Date(targetYear, targetMonth - 1, 1),
        lt: new Date(targetYear, targetMonth, 1),
      },
    };

    const grouped = await prisma.expense.groupBy({
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
      {}
    );

    const grandTotal = grouped.reduce((sum: number, item) => sum + (item._sum.amount || 0), 0);

    const result = {
      status: 200,
      message: "Data berhasil diambil",
      data: {
        period: { month: targetMonth, year: targetYear },
        summary,
        grandTotal,
      }
    };

    // Simpan ke cache selama 5 menit (300 detik)
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result));
    } catch (redisErr) {
      console.error("Redis error when setting cache:", redisErr);
    }

    res.json({ ...result, fromCache: false });
  } catch (error) {
    next(error);
  }
};
