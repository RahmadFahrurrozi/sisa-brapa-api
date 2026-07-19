import { z } from "zod";

export const createIncomeTargetSchema = z.object({
  amount: z.number().positive("Amount must be more than 0").max(999_999_999, "Amount too big"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export type CreateIncomeTargetInput = z.infer<typeof createIncomeTargetSchema>;

export const updateIncomeTargetSchema = z.object({
  amount: z.number().positive("Amount must be more than 0").max(999_999_999, "Amount too big"),
});

export type UpdateIncomeTargetInput = z.infer<typeof updateIncomeTargetSchema>;
