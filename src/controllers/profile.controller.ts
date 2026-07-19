import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

// GET /api/profile
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get User and Profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      res.status(404).json({ status: 404, message: "User tidak ditemukan", data: null });
      return;
    }

    // Auto-create default profile if it doesn't exist (fallback)
    let profile = user.profile;
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId,
          currency: "IDR",
          language: "id",
          financialType: "balanced",
        },
      });
    }

    // --- HITUNG ANALITIK & STATISTIK FINANCIAL INSIGHTS ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. joinedSince (e.g., "Juli 2026")
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const joinedMonth = months[user.createdAt.getMonth()];
    const joinedYear = user.createdAt.getFullYear();
    const joinedSince = `${joinedMonth} ${joinedYear}`;

    // 2. Count active items
    const [totalWallets, totalActiveGoals, totalSubscriptions] = await Promise.all([
      prisma.wallet.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
      prisma.subscription.count({ where: { userId, status: "active" } }),
    ]);

    // 3. Tabungan 30 Hari Terakhir
    const totalSavingsLast30Days = await prisma.savingLog.aggregate({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });
    const savingsAmount = totalSavingsLast30Days._sum.amount || 0;

    // Hitung Savings Ratio
    let savingsRatio = 0;
    const estIncome = profile.monthlyIncomeEst || 0;
    if (estIncome > 0) {
      savingsRatio = Math.round((savingsAmount / estIncome) * 100);
    }

    // 4. Hitung Financial Health Score (Skor Kesehatan Keuangan)
    // Hitung total pengeluaran 30 hari terakhir
    const totalExpenseLast30Days = await prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });
    const expenseAmount = totalExpenseLast30Days._sum.amount || 0;

    // Tentukan dasar pemasukan untuk perhitungan score
    let incomeBase = estIncome;
    if (incomeBase <= 0) {
      // Jika estimasi pendapatan tidak dipasang, hitung total pemasukan riil 30 hari terakhir
      const totalIncomeLast30Days = await prisma.income.aggregate({
        where: {
          userId,
          date: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      });
      incomeBase = totalIncomeLast30Days._sum.amount || 0;
    }

    let financialHealthScore = 100;
    if (incomeBase > 0) {
      const expenseRatio = expenseAmount / incomeBase;
      if (expenseRatio <= 0.3) {
        // Pengeluaran di bawah 30%: sangat sehat
        financialHealthScore = Math.round(100 - expenseRatio * 50); // 85 - 100
      } else if (expenseRatio <= 0.6) {
        // Pengeluaran 30% - 60%: sehat/normal
        financialHealthScore = Math.round(85 - (expenseRatio - 0.3) * 100); // 55 - 85
      } else if (expenseRatio <= 1.0) {
        // Pengeluaran 60% - 100%: lampu kuning
        financialHealthScore = Math.round(55 - (expenseRatio - 0.6) * 75); // 25 - 55
      } else {
        // Pengeluaran melebihi pendapatan (defisit)
        financialHealthScore = Math.max(10, Math.round(25 - (expenseRatio - 1.0) * 10)); // 10 - 25
      }
    } else {
      // Jika tidak ada data pendapatan
      financialHealthScore = expenseAmount > 0 ? 50 : 100;
    }

    // Response gabungan
    res.json({
      status: 200,
      message: "Profil pengguna berhasil diambil",
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        joinedSince,
        profile: {
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          occupation: profile.occupation,
          monthlyIncomeEst: profile.monthlyIncomeEst,
          currency: profile.currency,
          language: profile.language,
          birthDate: profile.birthDate,
          financialType: profile.financialType,
          phoneNumber: profile.phoneNumber,
          address: profile.address,
          updatedAt: profile.updatedAt,
        },
        financialOverview: {
          totalWallets,
          totalActiveGoals,
          totalSubscriptions,
          savingsRatio,
          financialHealthScore,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/profile
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = req.body;
    const {
      name,
      bio,
      avatarUrl,
      occupation,
      monthlyIncomeEst,
      currency,
      language,
      birthDate,
      financialType,
      phoneNumber,
      address,
    } = body;

    // Pastikan user & profile ada
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!existingUser) {
      res.status(404).json({ status: 404, message: "User tidak ditemukan", data: null });
      return;
    }

    // Buat profil jika belum ada di database
    if (!existingUser.profile) {
      await prisma.profile.create({
        data: {
          userId,
          currency: "IDR",
          language: "id",
          financialType: "balanced",
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update nama user di tabel User
      if (name !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { name },
        });
      }

      // 2. Update data profil di tabel Profile
      await tx.profile.update({
        where: { userId },
        data: {
          bio: bio !== undefined ? bio : undefined,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
          occupation: occupation !== undefined ? occupation : undefined,
          monthlyIncomeEst: monthlyIncomeEst !== undefined ? monthlyIncomeEst : undefined,
          currency: currency !== undefined ? currency : undefined,
          language: language !== undefined ? language : undefined,
          birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
          financialType: financialType !== undefined ? financialType : undefined,
          phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
          address: address !== undefined ? address : undefined,
        },
      });
    });

    // Ambil data terbaru untuk dikembalikan ke client
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    res.json({
      status: 200,
      message: "Profil pengguna berhasil diperbarui",
      data: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        profile: updatedUser!.profile,
      },
    });
  } catch (error) {
    next(error);
  }
};
