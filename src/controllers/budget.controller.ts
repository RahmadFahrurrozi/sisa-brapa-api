import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";
import { CATEGORIES } from "../schemas/expense.schema";

const budgetSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category: z.enum([...CATEGORIES, "all"], {
    message: "Category must be a valid expense category or 'all'",
  }),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const setBudget = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = budgetSchema.parse(req.body);
    const { amount, category, month, year } = body;

    // Upsert budget (create or update)
    const budget = await prisma.budget.upsert({
      where: {
        userId_category_month_year: {
          userId,
          category,
          month,
          year,
        },
      },
      update: { amount },
      create: {
        amount,
        category,
        month,
        year,
        userId,
      },
    });

    res.status(200).json({
      status: 200,
      message: "Budget berhasil dikonfigurasi",
      data: budget,
    });
  } catch (error) {
    next(error);
  }
};

export const getBudgetStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { month, year } = req.query;

    const targetMonth = Number(month) || new Date().getMonth() + 1;
    const targetYear = Number(year) || new Date().getFullYear();

    // Ambil semua budget user pada bulan & tahun tersebut
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        month: targetMonth,
        year: targetYear,
      },
    });

    // Rentang tanggal untuk menghitung pengeluaran
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 1);

    // Ambil data pengeluaran asli untuk mencocokkan total pengeluaran per kategori
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const statusList = budgets.map((budget) => {
      // Hitung total pengeluaran untuk budget ini
      let spent = 0;
      if (budget.category === "all") {
        spent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      } else {
        spent = expenses
          .filter((exp) => exp.category === budget.category)
          .reduce((sum, exp) => sum + exp.amount, 0);
      }

      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? Number(((spent / budget.amount) * 100).toFixed(2)) : 0;

      return {
        id: budget.id,
        category: budget.category,
        amount: budget.amount,
        spent,
        remaining,
        percentage,
        month: budget.month,
        year: budget.year,
      };
    });

    res.json({
      status: 200,
      message: "Status budget berhasil diambil",
      data: statusList,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/budgets/alerts
export const getBudgetAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Ambil semua budget user untuk bulan & tahun ini
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        month: currentMonth,
        year: currentYear,
      },
    });

    if (budgets.length === 0) {
      res.json({
        status: 200,
        message: "Tidak ada anggaran yang dikonfigurasi bulan ini",
        data: [],
      });
      return;
    }

    // Rentang tanggal untuk menghitung pengeluaran
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 1);

    // 2. Ambil data pengeluaran bulan ini
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    // 3. Filter budget yang mencapai batas >= 80%
    const alerts = budgets
      .map((budget) => {
        let spent = 0;
        if (budget.category === "all") {
          spent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        } else {
          spent = expenses
            .filter((exp) => exp.category === budget.category)
            .reduce((sum, exp) => sum + exp.amount, 0);
        }

        const remaining = budget.amount - spent;
        const percentage = budget.amount > 0 ? Number(((spent / budget.amount) * 100).toFixed(2)) : 0;

        let level: "warning" | "danger" | null = null;
        let message = "";

        if (percentage >= 100) {
          level = "danger";
          message = `Anggaran untuk kategori '${budget.category}' telah habis! Anda sudah melebihi batas anggaran bulanan (${percentage}% terpakai).`;
        } else if (percentage >= 80) {
          level = "warning";
          message = `Pengeluaran untuk kategori '${budget.category}' hampir habis! Anda sudah menggunakan ${percentage}% dari total anggaran.`;
        }

        return {
          id: budget.id,
          category: budget.category,
          amount: budget.amount,
          spent,
          remaining,
          percentage,
          level,
          message,
        };
      })
      .filter((alert) => alert.level !== null); // Hanya ambil yang level-nya warning atau danger

    res.json({
      status: 200,
      message: "Data budget alerts berhasil diambil",
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};

