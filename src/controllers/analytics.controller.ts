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

// GET /api/analytics/comparison
export const getExpenseComparison = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    // 1. Definisikan rentang waktu Bulan Ini (s.d saat ini/detik ini)
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);
    const endOfCurrentPeriod = new Date(now);

    // 2. Definisikan rentang waktu Bulan Lalu (s.d tanggal & jam yang sama)
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    startOfPreviousMonth.setHours(0, 0, 0, 0);

    // Cari hari maksimal di bulan lalu untuk mencegah bug overflow (contoh: 31 Juli -> 30 Juni)
    const daysInPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const targetDay = Math.min(now.getDate(), daysInPreviousMonth);

    const endOfPreviousPeriod = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      targetDay,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );

    // 3. Query total pengeluaran bulan ini (s.d saat ini)
    const currentAggregate = await prisma.expense.aggregate({
      where: {
        userId,
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentPeriod,
        },
      },
      _sum: { amount: true },
    });
    const currentTotal = currentAggregate._sum.amount || 0;

    // 4. Query total pengeluaran bulan lalu (s.d saat ini)
    const previousAggregate = await prisma.expense.aggregate({
      where: {
        userId,
        date: {
          gte: startOfPreviousMonth,
          lte: endOfPreviousPeriod,
        },
      },
      _sum: { amount: true },
    });
    const previousTotal = previousAggregate._sum.amount || 0;

    // 5. Hitung perbandingan persentase
    let differencePercentage = 0;
    if (previousTotal > 0) {
      differencePercentage = Number(
        (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(2)
      );
    } else if (currentTotal > 0) {
      differencePercentage = 100.0;
    }

    let comparisonStatus = "equal";
    if (differencePercentage < 0) {
      comparisonStatus = "saving";
    } else if (differencePercentage > 0) {
      comparisonStatus = "wasting";
    }

    res.json({
      status: 200,
      message: "Data perbandingan pengeluaran berhasil dihitung",
      data: {
        currentPeriod: {
          start: startOfCurrentMonth.toISOString(),
          end: endOfCurrentPeriod.toISOString(),
          total: currentTotal,
        },
        previousPeriod: {
          start: startOfPreviousMonth.toISOString(),
          end: endOfPreviousPeriod.toISOString(),
          total: previousTotal,
        },
        differencePercentage,
        status: comparisonStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

