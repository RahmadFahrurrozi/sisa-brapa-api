import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";

export const analyticsQuerySchema = z.object({
  range: z.enum(["today", "7d", "30d", "3m", "6m", "12m", "custom"]).default("30d"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getExpenseAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Parse & validasi query params
    const query = analyticsQuerySchema.parse(req.query);
    const { range, startDate, endDate } = query;

    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "7d":
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case "30d":
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case "3m":
        start.setMonth(now.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        break;
      case "6m":
        start.setMonth(now.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case "12m":
        start.setMonth(now.getMonth() - 12);
        start.setHours(0, 0, 0, 0);
        break;
      case "custom":
        if (!startDate || !endDate) {
          res.status(400).json({
            status: 400,
            message: "startDate dan endDate wajib diisi jika range adalah 'custom'",
            data: null,
          });
          return;
        }
        start = new Date(startDate);
        end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          res.status(400).json({
            status: 400,
            message: "Format tanggal tidak valid (gunakan format YYYY-MM-DD)",
            data: null,
          });
          return;
        }
        // Atur agar mencakup seharian penuh
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    // Query data pengeluaran dalam rentang waktu tersebut
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: "asc" },
    });

    // Hitung total pengeluaran
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Hitung sebaran per kategori
    const categoryTotals: Record<string, { total: number; count: number }> = {};
    expenses.forEach((exp) => {
      if (!categoryTotals[exp.category]) {
        categoryTotals[exp.category] = { total: 0, count: 0 };
      }
      categoryTotals[exp.category].total += exp.amount;
      categoryTotals[exp.category].count += 1;
    });

    const byCategory: Record<string, { total: number; count: number; percentage: number }> = {};
    Object.entries(categoryTotals).forEach(([cat, data]) => {
      byCategory[cat] = {
        total: data.total,
        count: data.count,
        percentage: totalSpent > 0 ? Number(((data.total / totalSpent) * 100).toFixed(2)) : 0,
      };
    });

    // Tentukan pengelompokan tren (harian / bulanan)
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    let groupFormat: "hour" | "day" | "month";
    if (range === "today") {
      groupFormat = "hour";
    } else if (range === "7d" || range === "30d" || (range === "custom" && diffDays <= 31)) {
      groupFormat = "day";
    } else {
      groupFormat = "month";
    }

    // Grouping trend
    const trendMap = new Map<string, number>();
    expenses.forEach((exp) => {
      const expDate = new Date(exp.date);
      let key = "";
      if (groupFormat === "hour") {
        key = `${String(expDate.getHours()).padStart(2, "0")}:00`;
      } else if (groupFormat === "day") {
        key = expDate.toISOString().split("T")[0]; // YYYY-MM-DD
      } else {
        key = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
      }
      trendMap.set(key, (trendMap.get(key) || 0) + exp.amount);
    });

    const trend = Array.from(trendMap.entries()).map(([label, total]) => ({
      label,
      total,
    }));

    res.json({
      status: 200,
      message: "Data analytics berhasil diambil",
      data: {
        range,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        totalSpent,
        byCategory,
        trend,
      },
    });
  } catch (error) {
    next(error);
  }
};
