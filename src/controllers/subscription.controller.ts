import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

/**
 * POST /api/subscriptions
 * Membuat data subscription baru untuk user yang sedang login
 */
export const createSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, amount, billingCycle, nextBillingDate } = req.body;
    const subscription = await prisma.subscription.create({
      data: {
        name,
        amount,
        billingCycle,
        nextBillingDate: new Date(nextBillingDate),
        status: "active",
        userId,
      },
    });

    res.status(201).json({
      status: 201,
      message: "success create subscription",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/subscriptions
 * Mengambil seluruh subscription dengan status "active" milik user
 */

export const getSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        status: "active",
      },
      orderBy: {
        nextBillingDate: "asc",
      },
    });

    res.json({
      status: 200,
      message: "Success get list subscriptions",
      data: subscriptions,
    });
  } catch (error) {
    next(error);
  }
};

// get one subscription

export const getOneSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const subscriptionId = req.params.id as string;
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        id: subscriptionId,
      },
    });

    res.json({
      status: 200,
      message: "success get one subscription",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const existing = await prisma.subscription.findFirst({
      where: {
        id,
        userId,
      },
    });
    if (!existing) {
      res.status(404).json({
        status: 404,
        message: "Subscription not found",
        data: null,
      });
      return;
    }

    await prisma.subscription.delete({
      where: { id },
    });

    res.json({
      status: 200,
      message: "Successfullly delete subscription",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
