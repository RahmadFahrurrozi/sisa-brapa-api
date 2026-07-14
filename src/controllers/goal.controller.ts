import { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../types/apiResponse";
import { prisma } from "../utils/prisma";
import { Goal, SavingLog } from "../generated/prisma"; // <-- Import SavingLog juga di sini

// Definisikan interface khusus untuk data heatmap contribution
export interface Contribution {
  date: string;
  amount: number;
  count: number;
}

// POST /api/goals
export const createGoal = async (
  req: Request,
  res: Response<ApiResponse<Goal>>,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, targetAmount, deadline } = req.body;
    const goal = await prisma.goal.create({
      data: {
        name,
        targetAmount,
        deadline: deadline ? new Date(deadline) : undefined,
        userId,
        currentAmount: 0,
      },
    });

    res.status(201).json({
      status: 201,
      message: "Success create goal",
      data: goal,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/goals
export const getGoals = async (
  req: Request,
  res: Response<ApiResponse<Goal[]>>,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      status: 200,
      message: "Success get list goals",
      data: goals,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/goals/:id/savings
export const addSaving = async (
  req: Request,
  res: Response<ApiResponse<SavingLog>>, // <-- Ganti tipe generik ke SavingLog
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id as string;
    const { amount, date, note } = req.body;

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      res.status(404).json({
        status: 404,
        message: "Goal not found",
        data: null,
      });
      return;
    }

    const [savingLog] = await prisma.$transaction([
      prisma.savingLog.create({
        data: {
          amount,
          date: date ? new Date(date) : new Date(),
          note,
          goalId,
          userId,
        },
      }),
      prisma.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: {
            increment: amount,
          },
        },
      }),
    ]);

    res.status(201).json({
      status: 201,
      message: "success add saving contribution",
      data: savingLog,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/goals/contributions
export const getSavingsContributions = async (
  req: Request,
  res: Response<ApiResponse<Contribution[]>>,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const savings = await prisma.savingLog.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    });

    const contributionsMap: Record<string, { amount: number; count: number }> = {};
    for (const saving of savings) {
      const dateStr = saving.date.toISOString().split("T")[0];
      if (!contributionsMap[dateStr]) {
        contributionsMap[dateStr] = { amount: 0, count: 0 };
      }
      contributionsMap[dateStr].amount += saving.amount;
      contributionsMap[dateStr].count += 1;
    }

    const data: Contribution[] = Object.keys(contributionsMap).map((date) => ({
      date,
      amount: contributionsMap[date].amount,
      count: contributionsMap[date].count,
    }));

    res.json({
      status: 200,
      message: "success get savings contributions",
      data,
    });
  } catch (error) {
    next(error);
  }
};
