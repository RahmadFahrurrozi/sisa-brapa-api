import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";

const transactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  search: z.string().optional(),
  type: z.enum(["all", "income", "expense"]).default("all"),
});

// GET /api/transactions
export const getCombinedTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const query = transactionQuerySchema.parse(req.query);
    const { page, limit, month, year, search, type } = query;

    // Build filter dates if month or year is provided
    let dateFilter: any = undefined;
    if (month || year) {
      const targetYear = year || new Date().getFullYear();
      const targetMonth = month || new Date().getMonth() + 1;
      dateFilter = {
        gte: new Date(targetYear, targetMonth - 1, 1),
        lt: new Date(targetYear, targetMonth, 1),
      };
    }

    // Build base query conditions
    const incomeWhere: any = { userId };
    const expenseWhere: any = { userId };

    if (dateFilter) {
      incomeWhere.date = dateFilter;
      expenseWhere.date = dateFilter;
    }

    if (search) {
      const searchObj = { contains: search, mode: "insensitive" as const };
      incomeWhere.title = searchObj;
      expenseWhere.title = searchObj;
    }

    let combined: any[] = [];

    // Query Incomes if requested
    if (type === "all" || type === "income") {
      const incomes = await prisma.income.findMany({
        where: incomeWhere,
        include: { wallet: { select: { id: true, name: true, provider: true } } },
      });
      combined = combined.concat(
        incomes.map((inc) => ({
          id: inc.id,
          title: inc.title,
          amount: inc.amount,
          category: inc.category,
          date: inc.date,
          note: inc.note,
          type: "income",
          wallet: inc.wallet,
          createdAt: inc.createdAt,
        })),
      );
    }

    // Query Expenses if requested
    if (type === "all" || type === "expense") {
      const expenses = await prisma.expense.findMany({
        where: expenseWhere,
        include: { wallet: { select: { id: true, name: true, provider: true } } },
      });
      combined = combined.concat(
        expenses.map((exp) => ({
          id: exp.id,
          title: exp.title,
          amount: exp.amount,
          category: exp.category,
          date: exp.date,
          note: exp.note,
          type: "expense",
          wallet: exp.wallet,
          createdAt: exp.createdAt,
        })),
      );
    }

    // Sort combined transactions by date descending, then by createdAt descending
    combined.sort((a, b) => {
      const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Pagination
    const totalData = combined.length;
    const totalPages = Math.ceil(totalData / limit);
    const paginatedData = combined.slice((page - 1) * limit, page * limit);

    res.json({
      status: 200,
      message: "Timeline transaksi gabungan berhasil diambil",
      data: paginatedData,
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
