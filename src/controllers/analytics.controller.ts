import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import redis from "../utils/redis";
import { z } from "zod";

export const analyticsQuerySchema = z.object({
  range: z.enum(["today", "7d", "30d", "3m", "6m", "12m", "custom"]).default("30d"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getExpenseAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
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
  next: NextFunction,
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
      now.getMilliseconds(),
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
        (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(2),
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

// GET /api/analytics/balance
export const getBalanceSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { month, year } = req.query;

    const targetYear = Number(year) || new Date().getFullYear();
    const targetMonth = Number(month) || new Date().getMonth() + 1;

    const cacheKey = `balance:${userId}:${targetYear}:${targetMonth}`;

    // Cek cache Redis
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json({ ...JSON.parse(cached), fromCache: true });
        return;
      }
    } catch (redisErr) {
      console.error("Redis cache error:", redisErr);
    }

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 1);

    // 1. Ambil total pendapatan bulan ini
    const incomeAggregate = await prisma.income.aggregate({
      where: {
        userId,
        date: { gte: startOfMonth, lt: endOfMonth },
      },
      _sum: { amount: true },
    });
    const totalIncome = incomeAggregate._sum.amount || 0;

    // 2. Ambil total pengeluaran bulan ini
    const expenseAggregate = await prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: startOfMonth, lt: endOfMonth },
      },
      _sum: { amount: true },
    });
    const totalExpense = expenseAggregate._sum.amount || 0;

    // 3. Ambil total tabungan (saving logs) bulan ini
    const savingAggregate = await prisma.savingLog.aggregate({
      where: {
        userId,
        date: { gte: startOfMonth, lt: endOfMonth },
      },
      _sum: { amount: true },
    });
    const totalSaved = savingAggregate._sum.amount || 0;

    // 4. Hitung sisa saldo teoritis bulanan
    const remainingBalance = totalIncome - totalExpense;
    const netBalance = remainingBalance - totalSaved;

    // 5. Ambil data semua Wallet dan hitung total saldo riil
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, provider: true, balance: true },
      orderBy: { name: "asc" },
    });
    const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    // 6. Ambil target pendapatan bulanan
    const target = await prisma.incomeTarget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: targetMonth,
          year: targetYear,
        },
      },
    });
    const targetAmount = target ? target.amount : 0;
    const targetProgressPercentage =
      targetAmount > 0 ? Number(((totalIncome / targetAmount) * 100).toFixed(2)) : 0;

    // 7. Kalkulasi aturan anggaran 50/30/20
    const allocation503020 = {
      needs: Number((totalIncome * 0.5).toFixed(2)),
      wants: Number((totalIncome * 0.3).toFixed(2)),
      savings: Number((totalIncome * 0.2).toFixed(2)),
    };

    const result = {
      status: 200,
      message: "Data ringkasan saldo keuangan berhasil diambil",
      data: {
        period: { month: targetMonth, year: targetYear },
        totalIncome,
        totalExpense,
        remainingBalance,
        totalSaved,
        netBalance,
        totalWalletBalance,
        wallets,
        incomeTarget: {
          targetAmount,
          progressPercentage: targetProgressPercentage,
        },
        allocation503020,
      },
    };

    // Simpan ke cache 5 menit
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(result));
    } catch (redisErr) {
      console.error("Redis setex error:", redisErr);
    }

    res.json({ ...result, fromCache: false });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/income-vs-expense
export const getIncomeVsExpenseTrend = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
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
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    // Ambil incomes & expenses dalam range
    const incomes = await prisma.income.findMany({
      where: { userId, date: { gte: start, lte: end } },
    });
    const expenses = await prisma.expense.findMany({
      where: { userId, date: { gte: start, lte: end } },
    });

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

    const trendMap = new Map<string, { income: number; expense: number }>();

    // Helper untuk grouping key
    const getGroupKey = (d: Date): string => {
      if (groupFormat === "hour") {
        return `${String(d.getHours()).padStart(2, "0")}:00`;
      } else if (groupFormat === "day") {
        return d.toISOString().split("T")[0];
      } else {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
    };

    incomes.forEach((inc) => {
      const key = getGroupKey(new Date(inc.date));
      const current = trendMap.get(key) || { income: 0, expense: 0 };
      current.income += inc.amount;
      trendMap.set(key, current);
    });

    expenses.forEach((exp) => {
      const key = getGroupKey(new Date(exp.date));
      const current = trendMap.get(key) || { income: 0, expense: 0 };
      current.expense += exp.amount;
      trendMap.set(key, current);
    });

    const trend = Array.from(trendMap.entries())
      .map(([label, totals]) => ({
        label,
        income: totals.income,
        expense: totals.expense,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    res.json({
      status: 200,
      message: "Data tren pemasukan vs pengeluaran berhasil diambil",
      data: {
        range,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        trend,
      },
    });
  } catch (error) {
    next(error);
  }
};
